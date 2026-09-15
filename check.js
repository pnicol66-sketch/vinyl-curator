'use strict';
/* Check a record - photos of a record you are looking at go to your
 * appraiser's sheet, which reads the record off them, looks up its sales
 * history and answers whether the asking price is reasonable. Everything
 * is worked out on the appraiser's side; this file only takes the photos,
 * sends them, and shows what comes back.
 *
 * Every call carries a check id the phone made up, so a dropped connection
 * in a shop is retried with the same id and never creates a second record.
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
const CHECK_RETRIES = 6;     // a page instead of an answer is common enough on a long call
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

/* ---------- the call ---------- */

// One operation against the appraiser's sheet. A non-JSON answer (Google
// occasionally answers a long call with a page) or a network drop is
// retried with the same check id: the sheet answers a repeat from what it
// already did.
async function checkCall(chk, op, extra) {
  let last = null;
  for (let attempt = 0; attempt < CHECK_RETRIES; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, 1500 * attempt));
    try {
      const body = Object.assign({ op, check: chk.id, token: checkTok.token, folderId: chk.folderId || '', aiKey: String(settings.checkAiKey || '').trim() }, extra || {});
      const r = await fetch(checkUrl(), { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body) });
      const txt = await r.text();
      let j = null;
      try { j = JSON.parse(txt); } catch (e) { j = null; }
      if (!j) { last = new Error('The sheet answered with a page instead of an answer ' + CHECK_RETRIES + ' times - tap Check to carry on from where it got to'); continue; }
      if (!j.ok) throw new Error(j.error || 'The sheet refused the request');
      return j;
    } catch (e) {
      if (/refused|not set up|sign in|expired|malformed|Unknown operation|key|needed|first/i.test(String(e.message))) throw e;
      last = e;
    }
  }
  throw last || new Error('No answer');
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
  const order = Object.values(chk.pics).sort((a, b) => (a.tag === 'front' ? -1 : b.tag === 'front' ? 1 : a.n - b.n));
  let i = 0;
  for (const pic of order) {
    i++;
    if (pic.sent) continue;
    setCheckStage(`Sending picture ${i} of ${order.length}…`);
    const b64 = await blobToB64(pic.blob);
    const r = await checkCall(chk, 'picture', { n: pic.n, tag: pic.tag, b64 });
    pic.sent = true; pic.landed = r.bytes;
    await putCheck(chk);
  }
  setCheckStage('Reading the pictures… (up to a minute)');
  const rd = await checkCall(chk, 'read', { text: chk.text, link: '' });
  chk.read = rd.read; chk.stage = 'read';
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
  $('#checkReadStage').textContent = 'Looking up the sales history… (about a minute)';
  const q = await checkCall(chk, 'quick', { fields: chk.fields, extra: '', link: '' });
  chk.quick = q.quick; chk.stage = 'quick';
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
    return;
  }
  if (f.stage !== 'done') {
    btn.classList.add('hidden');
    $('#checkFullStage').textContent = f.paused ? 'Full check paused - sign in to continue' :
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

$('#btnCheckFull').onclick = () => {
  const chk = curCheck;
  const go = async () => {
    $('#btnCheckFull').disabled = true;
    $('#checkFullStage').textContent = 'Starting the full check…';
    try {
      const f = await checkCall(chk, 'full', {});
      chk.full = { stage: f.full.stage, round: f.full.round, rounds: f.full.rounds, paused: false };
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
  requestCheckToken().then(() => pumpChecks()).catch(e => toast(e.message || String(e)));
};
$('#btnCheckNew').onclick = () => openCheck(null);

// Steps every unfinished full check while the app is open; pauses when the
// sign-in has lapsed (only a tap can renew it) and resumes on the next open.
async function pumpChecks() {
  if (checkPumpRunning) return;
  checkPumpRunning = true;
  try {
    for (;;) {
      const pending = (await allChecks()).filter(c => c.full && c.full.stage !== 'done');
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
        let s;
        try { s = await checkCall(chk, 'step', {}); }
        catch (e) { chk.full.paused = true; chk.full.error = e.message || String(e); await putCheck(chk); stuck = true; break; }
        chk.full = Object.assign(chk.full, { stage: s.full.stage, round: s.full.round, rounds: s.full.rounds, result: s.full.result || null, research: s.full.research || null, paused: false, error: '' });
        if (s.done) chk.stage = 'done';
        await putCheck(chk);
        if (curCheck && curCheck.id === chk.id) { curCheck = chk; if ($('#scr-checkresult').classList.contains('active')) renderCheckFull(chk); }
      }
      if (stuck) { toast('Full check paused: ' + (chk.full.error || ''), 3600); break; }
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
      (c.full ? (c.full.stage === 'done' ? ' · full check done' : ' · full check running') : '') + `</div>` +
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
