'use strict';
/* Check a record - photos of a record you are looking at go to your
 * appraiser's sheet, which reads the record off them, looks up its sales
 * history and answers whether the asking price is reasonable. Everything
 * is worked out on the appraiser's side; this file only takes the photos,
 * sends them, and shows what comes back.
 *
 * Every call carries a check id the phone made up, so a dropped connection
 * in a shop is retried with the same id and never creates a second record.
 * The long steps are sent once and then WATCHED through short status
 * calls: the sheet's answer to a long call is often lost on the way back
 * (Google serves a "Sorry, unable to open the file" page instead), while
 * the work itself completes. A short call almost always comes back.
 */

const CHECK_TAGS = [
  { tag: 'front', label: 'Front cover', need: true },
  { tag: 'label 1', label: 'Label (side 1)', need: true },
  { tag: 'back', label: 'Back cover' },
  { tag: 'label 2', label: 'Label (side 2)' },
  { tag: 'runout 1', label: 'Runout, side 1', tip: 'makes the edition certain' },
  { tag: 'runout 2', label: 'Runout, side 2' },
  { tag: 'cover defect', label: 'Cover defect' },
  { tag: 'vinyl defect', label: 'Vinyl defect' },
  { tag: 'other', label: 'Other' },
];
const CHECK_MAX_EDGE = 1600;
const CHECK_JPEG_Q = 0.85;
const CHECK_SHORT_RETRIES = 4;   // a short call that comes back as a page is simply sent again
const CHECK_POLL_MS = 6000;      // how often a long step is looked in on
const CHECK_LONG_LIMIT_MS = 7 * 60 * 1000;   // past the sheet's own six-minute cap: the step is lost
const CHECK_STEP_CAP = 40;

let curCheck = null;          // the check being shown
let checkPumpRunning = false;
let checkTok = { token: null, exp: 0 };

/* ---------- settings ---------- */

function checkUrl() { return String(settings.checkUrl || '').trim(); }
function checkReady() { return /^https:\/\/script\.google\.com\/macros\/s\/[-\w]+\/exec$/.test(checkUrl()); }

const _openSettingsBase = openSettings;
openSettings = function () {
  _openSettingsBase();
  $('#inCheckUrl').value = settings.checkUrl || '';
  $('#inCheckAiKey').value = settings.checkAiKey || '';
  $('#checkPing').textContent = '';
};
$('#btnSaveSettings').addEventListener('click', async () => {
  settings.checkUrl = $('#inCheckUrl').value.trim();
  settings.checkAiKey = $('#inCheckAiKey').value.trim();
  await saveSettings();
});
$('#btnCheckPing').onclick = async () => {
  const url = $('#inCheckUrl').value.trim();
  const out = $('#checkPing');
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[-\w]+\/exec$/.test(url)) { out.textContent = 'That is not a check address (it ends in /exec).'; return; }
  out.textContent = 'Testing…';
  try {
    const r = await fetch(url + '?ping=1');
    const j = await r.json();
    out.textContent = j && j.ok ? '✓ The address answers.' : 'The address answered, but not as expected.';
  } catch (e) { out.textContent = 'No answer from that address (' + (e.message || e) + ').'; }
};

/* ---------- sign-in for the check (email only, no Drive) ---------- */

function checkTokenFresh() { return !!(checkTok.token && Date.now() < checkTok.exp - 60000); }
// Must be called from a tap: Google opens its window only on a user gesture.
function requestCheckToken() {
  return new Promise((res, rej) => {
    loadGsi().then(() => {
      const tc = google.accounts.oauth2.initTokenClient({
        client_id: cred('clientId'),
        scope: 'openid email',
        callback: r => {
          if (r.access_token) {
            checkTok = { token: r.access_token, exp: Date.now() + (Number(r.expires_in) || 3600) * 1000 };
            res(r.access_token);
          } else rej(new Error(r.error || 'Sign-in failed'));
        },
        error_callback: e => rej(new Error(e.message || e.type || 'Sign-in cancelled')),
      });
      tc.requestAccessToken();
    }).catch(rej);
  });
}

/* ---------- the calls ---------- */

// One POST. Resolves to the JSON answer, or to null when the answer came
// back as a page (the sheet may well have done the work).
async function checkPost(chk, op, extra) {
  const body = Object.assign({ op, check: chk.id, token: checkTok.token, folderId: chk.folderId || '', aiKey: String(settings.checkAiKey || '').trim() }, extra || {});
  const r = await fetch(checkUrl(), { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body) });
  const txt = await r.text();
  let j = null;
  try { j = JSON.parse(txt); } catch (e) { j = null; }
  if (j && !j.ok) throw new Error(j.error || 'The sheet refused the request');
  return j;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

// A short operation: sent again when the answer was lost or the network dropped.
async function checkCall(chk, op, extra) {
  let last = null;
  for (let attempt = 0; attempt < CHECK_SHORT_RETRIES; attempt++) {
    if (attempt) await sleep(1500 * attempt);
    try {
      const j = await checkPost(chk, op, extra);
      if (j) return j;
      last = new Error('The sheet\'s answer did not arrive ' + CHECK_SHORT_RETRIES + ' times - tap again to carry on');
    } catch (e) {
      if (/refused|not set up|sign in|expired|malformed|Unknown operation|key|needed|first|belongs|start again/i.test(String(e.message))) throw e;
      last = e;
    }
  }
  throw last || new Error('No answer');
}

// A long operation (the read, the quick check, the full check, a research
// step): sent once with a sequence number, then watched through status
// calls until the sheet reports that number finished, or an error for it.
async function checkRun(chk, op, extra, onProgress) {
  const seq = Date.now();
  const sentAt = Date.now();
  let own = null, ownDone = false;
  checkPost(chk, op, Object.assign({ seq }, extra || {})).then(j => { own = j; ownDone = true; }).catch(e => { own = e; ownDone = true; });
  for (;;) {
    await sleep(CHECK_POLL_MS);
    if (ownDone && own instanceof Error) throw own;
    if (ownDone && own && own.ok) return { answer: own, status: null };
    let st = null;
    try { st = await checkPost(chk, 'status', {}); } catch (e) { if (/belongs|start again|not set up|sign in|expired/i.test(String(e.message))) throw e; st = null; }
    if (st) {
      if (st.lastError && st.lastError.op === op && (!st.busy) && st.doneSeq === seq) throw new Error(st.lastError.text);
      if (st.doneSeq === seq && !st.busy) return { answer: null, status: st };
      if (onProgress) onProgress(st);
    }
    if (Date.now() - sentAt > CHECK_LONG_LIMIT_MS) throw new Error('The sheet did not finish that step - tap again to carry on');
  }
}

/* ---------- pictures ---------- */

async function checkDownsize(file) {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, CHECK_MAX_EDGE / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return new Promise(res => c.toBlob(res, 'image/jpeg', CHECK_JPEG_Q));
}
function blobToB64(blob) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result).split(',')[1] || '');
    fr.onerror = () => rej(fr.error);
    fr.readAsDataURL(blob);
  });
}

// Every unsent picture in one call; when the answer is lost, the status
// call says which numbers landed and the rest go again.
async function sendPictures(chk, onStage) {
  for (let round = 0; round < 4; round++) {
    const pending = Object.values(chk.pics).filter(p => !p.sent).sort((a, b) => (a.tag === 'front' ? -1 : b.tag === 'front' ? 1 : a.n - b.n));
    if (!pending.length) return;
    onStage(`Sending ${pending.length} picture${pending.length === 1 ? '' : 's'}…`);
    const list = [];
    for (const p of pending) list.push({ n: p.n, tag: p.tag, b64: await blobToB64(p.blob) });
    let j = null;
    try { j = await checkPost(chk, 'pictures', { pictures: list }); }
    catch (e) { if (/already has its row|belongs|start again|sign in|expired/i.test(String(e.message))) throw e; j = null; }
    let landed = [];
    if (j && j.pictures) landed = j.pictures.map(p => p.n);
    else {
      onStage('Checking which pictures arrived…');
      await sleep(2000);
      try { const st = await checkCall(chk, 'status', {}); landed = st.sent || []; } catch (e) { landed = []; }
    }
    for (const p of Object.values(chk.pics)) if (landed.includes(p.n)) p.sent = true;
    await putCheck(chk);
  }
  const left = Object.values(chk.pics).filter(p => !p.sent).length;
  if (left) throw new Error(`${left} picture${left === 1 ? '' : 's'} did not arrive - tap Check to send again`);
}

/* ---------- storage ---------- */

function newCheckId() { return Date.now() + '-' + Math.random().toString(36).slice(2, 10); }
async function putCheck(chk) { chk.updated = Date.now(); await dbPut('checks', chk); }
async function allChecks() { return (await dbAll('checks')).sort((a, b) => b.created - a.created); }

/* ---------- the shots screen ---------- */

let checkUrls = [];
function checkFreeUrls() { checkUrls.forEach(u => URL.revokeObjectURL(u)); checkUrls = []; }

async function openCheck(chk) {
  if (!checkReady()) {
    toast('Add the check address from your appraiser in Settings first');
    openSettings();
    return;
  }
  if (!chk) {
    chk = { id: newCheckId(), created: Date.now(), stage: 'shots', pics: {}, asking: '', shipping: '', kind: 'shelf', text: '', log: [] };
    await putCheck(chk);
  }
  curCheck = chk;
  if (chk.stage === 'read' && chk.read) return openCheckRead(chk);
  if (chk.stage === 'quick' || chk.stage === 'full' || chk.stage === 'done') return openCheckResult(chk);
  $('#inCheckAsking').value = chk.asking || '';
  $('#inCheckShipping').value = chk.shipping || '';
  $('#inCheckText').value = chk.text || '';
  $$('input[name=checkKind]').forEach(r => { r.checked = r.value === (chk.kind || 'shelf'); });
  renderCheckTiles();
  $('#checkStage').textContent = '';
  show('scr-check', { title: 'Check a record', back: openCheckList });
}

function renderCheckTiles() {
  checkFreeUrls();
  const chk = curCheck, grid = $('#checkTiles');
  grid.innerHTML = '';
  for (const def of CHECK_TAGS) {
    const pic = chk.pics[def.tag];
    const b = document.createElement('button');
    b.className = 'checktile' + (pic ? ' filled' : '') + (def.need ? ' need' : '');
    if (pic && pic.blob) {
      const u = URL.createObjectURL(pic.blob); checkUrls.push(u);
      b.innerHTML = `<img src="${u}" alt=""><span class="ct-lbl">${esc(def.label)} ✓</span>`;
    } else {
      b.innerHTML = `<span class="ct-ico">📷</span><span class="ct-lbl">${esc(def.label)}${def.need ? '' : ' <em>(optional)</em>'}</span>` +
        (def.tip ? `<span class="ct-tip">${esc(def.tip)}</span>` : '');
    }
    b.onclick = () => { $('#checkFile').dataset.tag = def.tag; $('#checkFile').value = ''; $('#checkFile').click(); };
    grid.appendChild(b);
  }
  const ok = !!(chk.pics['front'] && (chk.pics['label 1'] || chk.pics['label 2']));
  $('#btnCheckGo').disabled = !ok;
  $('#checkNeed').textContent = ok ? '' : 'Needed before the check: the front cover and a label.';
}

$('#checkFile').onchange = async () => {
  const inp = $('#checkFile'), f = inp.files && inp.files[0];
  if (!f || !curCheck) return;
  try {
    const blob = await checkDownsize(f);
    // Picture numbers are given once and kept, so a retake replaces the same one.
    const nums = Object.values(curCheck.pics).map(p => p.n);
    const n = curCheck.pics[inp.dataset.tag] ? curCheck.pics[inp.dataset.tag].n : (nums.length ? Math.max(...nums) + 1 : 1);
    curCheck.pics[inp.dataset.tag] = { n, tag: inp.dataset.tag, blob, bytes: blob.size, sent: false };
    await putCheck(curCheck);
    renderCheckTiles();
  } catch (e) { toast('Could not read that photo: ' + (e.message || e)); }
};

$('#btnCheckGo').onclick = () => {
  const chk = curCheck;
  chk.asking = $('#inCheckAsking').value.trim();
  chk.shipping = $('#inCheckShipping').value.trim();
  chk.kind = ($$('input[name=checkKind]').find(r => r.checked) || {}).value || 'shelf';
  chk.text = $('#inCheckText').value.trim();
  putCheck(chk);
  // The sign-in window must open on this tap, so the token comes first.
  const go = () => runCheckRead(chk).catch(e => { setCheckStage(e.message || String(e), true); });
  if (checkTokenFresh()) go();
  else requestCheckToken().then(go).catch(e => setCheckStage('Sign-in needed: ' + (e.message || e), true));
};

function setCheckStage(msg, isError) {
  const el = $('#checkStage');
  el.textContent = msg || '';
  el.classList.toggle('err', !!isError);
  $('#btnCheckGo').disabled = !isError && !!msg;
}

// begin -> the pictures -> the read; then the confirm screen.
async function runCheckRead(chk) {
  setCheckStage('Starting the check…');
  if (!chk.folderId) {
    const b = await checkCall(chk, 'begin');
    chk.folderId = b.folderId; await putCheck(chk);
  }
  await sendPictures(chk, setCheckStage);
  setCheckStage('Reading the pictures… (up to a minute)');
  const t0 = Date.now();
  const r = await checkRun(chk, 'read', { text: chk.text, link: '' }, st => setCheckStage(`Reading the pictures… ${Math.round((Date.now() - t0) / 1000)} s`));
  const read = r.answer ? r.answer.read : (r.status && r.status.read);
  if (!read) throw new Error('The read did not come back - tap Check to try again');
  chk.read = read; chk.stage = 'read';
  await putCheck(chk);
  setCheckStage('');
  openCheckRead(chk);
}

/* ---------- the read: confirm or fix ---------- */

const READ_FIELDS = [
  ['artist', 'Artist'], ['title', 'Title'], ['labelName', 'Label'], ['labelNumber', 'Catalogue number'],
  ['year', 'Year'], ['country', 'Country'], ['monoStereo', 'Mono / stereo'],
  ['coverGrade', 'Cover grade'], ['vinylGrade', 'Vinyl grade'], ['runoutA', 'Runout side 1'], ['runoutB', 'Runout side 2'],
  ['notes', 'Notes'],
];
function openCheckRead(chk) {
  curCheck = chk;
  const f = (chk.read && chk.read.fields) || {};
  const box = $('#checkReadFields');
  box.innerHTML = '';
  for (const [k, label] of READ_FIELDS) {
    const id = 'rf_' + k;
    box.insertAdjacentHTML('beforeend',
      `<label class="field" for="${id}">${esc(label)}</label>` +
      (k === 'notes' ? `<textarea id="${id}" style="min-height:70px">${esc(String(f[k] || ''))}</textarea>`
                     : `<input type="text" id="${id}" autocomplete="off" value="${esc(String(f[k] || ''))}">`));
  }
  const warn = (chk.read && chk.read.warn) || [];
  $('#checkReadWarn').innerHTML = warn.map(w => `<p class="hint" style="color:#e0b04a">${esc(w)}</p>`).join('');
  $('#checkReadStage').textContent = '';
  $('#btnCheckConfirm').disabled = false;
  show('scr-checkread', { title: 'Is this the record?', back: () => { chk.stage = 'shots'; putCheck(chk); openCheck(chk); } });
}

$('#btnCheckConfirm').onclick = () => {
  const chk = curCheck;
  const fields = Object.assign({}, (chk.read && chk.read.fields) || {});
  for (const [k] of READ_FIELDS) fields[k] = $('#rf_' + k).value.trim();
  fields.asking = chk.asking; fields.shipping = chk.shipping; fields.listingKind = chk.kind;
  chk.fields = fields;
  putCheck(chk);
  const go = () => runCheckQuick(chk).catch(e => { $('#checkReadStage').textContent = e.message || String(e); $('#btnCheckConfirm').disabled = false; });
  if (checkTokenFresh()) go();
  else requestCheckToken().then(go).catch(e => { $('#checkReadStage').textContent = 'Sign-in needed: ' + (e.message || e); });
};

async function runCheckQuick(chk) {
  $('#btnCheckConfirm').disabled = true;
  const t0 = Date.now();
  $('#checkReadStage').textContent = 'Looking up the sales history… (about a minute)';
  const r = await checkRun(chk, 'quick', { fields: chk.fields, extra: '', link: '' }, () => { $('#checkReadStage').textContent = `Looking up the sales history… ${Math.round((Date.now() - t0) / 1000)} s`; });
  const quick = r.answer ? r.answer.quick : (r.status && r.status.quick);
  if (!quick) throw new Error('The answer did not come back - tap Confirm to try again');
  chk.quick = quick; chk.stage = 'quick';
  await putCheck(chk);
  openCheckResult(chk);
}

/* ---------- the result ---------- */

const LEVEL_TEXT = { green: 'GREEN', amber: 'AMBER', red: 'RED', grey: 'NO SALES ON FILE' };
function openCheckResult(chk) {
  curCheck = chk;
  const q = chk.quick || {};
  const v = q.verdict || { level: 'grey', text: '' };
  const card = $('#checkVerdict');
  card.className = 'verdict ' + (v.level || 'grey');
  card.innerHTML = `<div class="v-level">${esc(LEVEL_TEXT[v.level] || String(v.level || '').toUpperCase())}</div>` +
    `<div class="v-name">${esc(q.name || '')}</div><div class="v-text">${esc(v.text || '')}</div>`;
  const ev = q.evidence || null;
  const bits = [];
  if (ev) {
    if (ev.sales) bits.push(`${ev.sales} documented sale${ev.sales === 1 ? '' : 's'}${ev.thisEdition ? `, ${ev.thisEdition} of this edition` : ''}`);
    if (ev.median != null) bits.push(`median $${ev.median}`);
    if (ev.top != null) bits.push(`top $${ev.top}`);
    if (ev.discogsNm != null) bits.push(`Discogs near-mint $${ev.discogsNm}`);
    if (ev.newCopy != null) bits.push(`new copy $${ev.newCopy}`);
    if (ev.outOfPrint) bits.push('out of print');
    if (ev.unavailable) bits.push('sales history could not be checked this time');
  }
  $('#checkSummary').textContent = bits.join(' · ');
  const lines = (q.lines || []).slice(0, 10);
  $('#checkLines').innerHTML = lines.map(l => `<div class="v-line">${esc(l)}</div>`).join('');
  renderCheckFull(chk);
  show('scr-checkresult', { title: 'The verdict', back: openCheckList });
}

function renderCheckFull(chk) {
  const f = chk.full || null, box = $('#checkFullBox');
  const btn = $('#btnCheckFull');
  if (!f) {
    btn.classList.remove('hidden'); btn.disabled = false; btn.textContent = 'Full check (pressing, condition, value)';
    box.innerHTML = '';
    $('#checkFullStage').textContent = '';
    $('#btnCheckResume').classList.add('hidden');
    return;
  }
  if (f.stage !== 'done') {
    btn.classList.add('hidden');
    $('#checkFullStage').textContent = f.paused ? ('Full check paused' + (f.error ? ': ' + f.error : ' - sign in to continue')) :
      (f.stage === 'value' ? 'Working out the value…' : `Researching the pressing… round ${f.round || 0}${f.rounds ? ' of up to ' + f.rounds : ''}`);
    $('#btnCheckResume').classList.toggle('hidden', !f.paused);
    box.innerHTML = '';
    return;
  }
  btn.classList.add('hidden');
  $('#btnCheckResume').classList.add('hidden');
  $('#checkFullStage').textContent = '';
  const r = f.result || {};
  const rows = [['Pressing', r.rung], ['Not seen in the photos', r.notSeen], ['Ask the seller for', r.askSeller], ['Condition', r.grade],
    ['Value', r.value], ['Basis', r.basis], ['Price range', r.guide]];
  box.innerHTML = rows.filter(([, v]) => v).map(([k, v]) => `<div class="v-row"><b>${esc(k)}</b><span>${esc(String(v))}</span></div>`).join('') +
    (r.verdict && r.verdict.text ? `<div class="v-row"><b>Verdict</b><span>${esc(r.verdict.text)}</span></div>` : '');
}

function applyFullStatus(chk, fv) {
  if (!fv) return;
  chk.full = Object.assign(chk.full || {}, { stage: fv.stage, round: fv.round, rounds: fv.rounds, result: fv.result || null, research: fv.research || null, paused: false, error: '' });
  if (fv.done) chk.stage = 'done';
}

$('#btnCheckFull').onclick = () => {
  const chk = curCheck;
  const go = async () => {
    $('#btnCheckFull').disabled = true;
    $('#checkFullStage').textContent = 'Starting the full check…';
    try {
      const r = await checkRun(chk, 'full', {});
      applyFullStatus(chk, r.answer ? r.answer.full : (r.status && r.status.full));
      if (!chk.full) throw new Error('The full check did not start - tap again');
      chk.stage = 'full';
      await putCheck(chk);
      renderCheckFull(chk);
      pumpChecks();
    } catch (e) { $('#checkFullStage').textContent = e.message || String(e); $('#btnCheckFull').disabled = false; }
  };
  if (checkTokenFresh()) go();
  else requestCheckToken().then(go).catch(e => { $('#checkFullStage').textContent = 'Sign-in needed: ' + (e.message || e); });
};
$('#btnCheckResume').onclick = () => {
  const chk = curCheck;
  const go = () => { if (chk && chk.full) { chk.full.paused = false; putCheck(chk); } pumpChecks(); };
  if (checkTokenFresh()) go();
  else requestCheckToken().then(go).catch(e => toast(e.message || String(e)));
};
$('#btnCheckNew').onclick = () => openCheck(null);

// Steps every unfinished full check while the app is open; pauses when the
// sign-in has lapsed (only a tap can renew it) and resumes on the next open.
async function pumpChecks() {
  if (checkPumpRunning) return;
  checkPumpRunning = true;
  try {
    for (;;) {
      const pending = (await allChecks()).filter(c => c.full && c.full.stage !== 'done' && !c.full.paused);
      if (!pending.length) break;
      if (!checkTokenFresh()) {
        for (const c of pending) { c.full.paused = true; await putCheck(c); }
        if (curCheck && curCheck.full) renderCheckFull(curCheck);
        break;
      }
      const chk = pending[0];
      let steps = 0, stuck = false;
      while (chk.full.stage !== 'done' && steps < CHECK_STEP_CAP && checkTokenFresh()) {
        steps++;
        try {
          const r = await checkRun(chk, 'step', {}, st => { applyFullStatus(chk, st.full); if (curCheck && curCheck.id === chk.id && $('#scr-checkresult').classList.contains('active')) renderCheckFull(chk); });
          applyFullStatus(chk, r.answer ? r.answer.full : (r.status && r.status.full));
        } catch (e) { chk.full.paused = true; chk.full.error = e.message || String(e); await putCheck(chk); stuck = true; break; }
        await putCheck(chk);
        if (curCheck && curCheck.id === chk.id) { curCheck = chk; if ($('#scr-checkresult').classList.contains('active')) renderCheckFull(chk); }
      }
      if (stuck) { toast('Full check paused: ' + (chk.full.error || ''), 3600); if (curCheck && curCheck.id === chk.id) renderCheckFull(chk); break; }
      if (chk.full.stage === 'done') toast(`Full check done: ${chk.quick ? chk.quick.name : ''}`, 3600);
      if (chk.full.stage !== 'done') break;
    }
  } finally { checkPumpRunning = false; }
}

/* ---------- the list ---------- */

async function openCheckList() {
  curCheck = null;
  const list = $('#checkList');
  const checks = await allChecks();
  list.innerHTML = checks.length ? '' : '<p class="empty">No checks yet.<br>Tap “New check” in a shop, at a fair, or with a listing on screen.</p>';
  for (const c of checks) {
    const q = c.quick, v = q && q.verdict;
    const name = q ? q.name : (c.read && c.read.fields ? `${c.read.fields.artist || ''} - ${c.read.fields.title || ''}` : 'Unfinished check');
    const when = new Date(c.created).toLocaleDateString();
    const row = document.createElement('div');
    row.className = 'albumcard';
    row.innerHTML = `<button class="al-open"><div class="al-art">${esc(name)}</div>` +
      `<div class="al-title">${v ? esc(LEVEL_TEXT[v.level] || v.level) + (c.asking ? ' · asking $' + esc(c.asking) : '') : esc(c.stage === 'read' ? 'Read, not yet checked' : 'Photos taken')}` +
      (c.full ? (c.full.stage === 'done' ? ' · full check done' : (c.full.paused ? ' · full check paused' : ' · full check running')) : '') + `</div>` +
      `<div class="al-meta">${esc(when)}</div></button>` +
      `<button class="al-del" aria-label="Delete check">🗑</button>`;
    row.querySelector('.al-open').onclick = () => openCheck(c);
    row.querySelector('.al-del').onclick = async () => {
      if (!confirm('Remove this check from the phone? (The appraiser\'s copy stays.)')) return;
      await dbDel('checks', c.id); openCheckList();
    };
    list.appendChild(row);
  }
  show('scr-checklist', { title: 'Check a record', back: goHome });
}
$('#btnCheckHome').onclick = openCheckList;
$('#btnCheckStart').onclick = () => openCheck(null);

// A full check left running when the app was closed carries on from here.
setTimeout(() => { if (checkReady()) pumpChecks(); }, 1500);
