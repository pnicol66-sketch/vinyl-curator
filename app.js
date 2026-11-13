'use strict';

/* Build stamp — rewritten by bump-version.ps1 (and the pre-commit hook) so it
   always matches the service worker's cache name. Shown in Settings. */
const APP_VERSION = '20261113-123015';

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), ms);
}
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function sanitize(s) { return s.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim(); }
function pad2(n) { return String(n).padStart(2, '0'); }
// A canvas keeps its pixels until the browser gets round to collecting it, and
// on a phone that falls behind: one save made several canvases of up to 50 MB
// (a 12 MP photo), and the phone slowed album by album until it was restarted.
// Zeroing the size hands the memory back at once.
function freeCanvas(c) { if (c) { c.width = 0; c.height = 0; } }

/* ---------- shot definitions ---------- */
const VINYL_TIP = '📸 Take the photo, then tap 3 points around the edge to crop. Center the whole disc, fill the frame, and angle it slightly under light so surface marks show honestly.';
const SHOTS = [
  { id: 'front',      n: 1,  name: 'Front Cover',           type: 'cover',  disc: 1 },
  { id: 'frontgrade', n: 2,  name: 'Front Cover Grade',     type: 'grade',  disc: 1 },
  { id: 'back',       n: 3,  name: 'Back Cover',            type: 'cover',  disc: 1 },
  { id: 'backgrade',  n: 4,  name: 'Back Cover Grade',      type: 'grade',  disc: 1 },
  { id: 'other',      n: 5,  name: 'Other',                 type: 'cover',  disc: 1, opt: true },
  // "Side N Vinyl" (full-disc surface shots, optional) are numbered 22-25:
  // display order is this array, file numbers stay stable, and no existing
  // Drive files ever need renaming (same reasoning as the 15-21 gaps below).
  { id: 's1label',    n: 6,  name: 'Side 1 Label',          type: 'label',  disc: 1 },
  { id: 's1vinyl',    n: 22, name: 'Side 1 Vinyl',          type: 'label',  disc: 1, opt: true, tip: VINYL_TIP },
  { id: 's1grade',    n: 7,  name: 'Vinyl Grade Side 1',    type: 'grade',  disc: 1 },
  { id: 's2label',    n: 8,  name: 'Side 2 Label',          type: 'label',  disc: 1 },
  { id: 's2vinyl',    n: 23, name: 'Side 2 Vinyl',          type: 'label',  disc: 1, opt: true, tip: VINYL_TIP },
  { id: 's2grade',    n: 9,  name: 'Vinyl Grade Side 2',    type: 'grade',  disc: 1 },
  { id: 's3label',    n: 10, name: 'Side 3 Label',          type: 'label',  disc: 2 },
  { id: 's3vinyl',    n: 24, name: 'Side 3 Vinyl',          type: 'label',  disc: 2, opt: true, tip: VINYL_TIP },
  { id: 's3grade',    n: 11, name: 'Vinyl Grade Side 3',    type: 'grade',  disc: 2 },
  { id: 's4label',    n: 12, name: 'Side 4 Label',          type: 'label',  disc: 2 },
  { id: 's4vinyl',    n: 25, name: 'Side 4 Vinyl',          type: 'label',  disc: 2, opt: true, tip: VINYL_TIP },
  { id: 's4grade',    n: 13, name: 'Vinyl Grade Side 4',    type: 'grade',  disc: 2 },
  // Numbers 15/17/19/21 belonged to the removed "Dead Wax Other" entries; gaps kept so
  // existing Drive files never need renaming. fname = filename form ("/" is illegal in filenames).
  { id: 's1matrix',   n: 14, name: 'Side 1 Matrix/Runout', fname: 'Side 1 Matrix Runout', letter: 'A', type: 'matrix', disc: 1 },
  { id: 's2matrix',   n: 16, name: 'Side 2 Matrix/Runout', fname: 'Side 2 Matrix Runout', letter: 'B', type: 'matrix', disc: 1 },
  { id: 's3matrix',   n: 18, name: 'Side 3 Matrix/Runout', fname: 'Side 3 Matrix Runout', letter: 'C', type: 'matrix', disc: 2 },
  { id: 's4matrix',   n: 20, name: 'Side 4 Matrix/Runout', fname: 'Side 4 Matrix Runout', letter: 'D', type: 'matrix', disc: 2 },
];
const SLOTS = [1, 2, 3, 4];
function slotId(def, n) { return `${def.id}_p${n}`; }
const TIPS = {
  cover: '📸 Take the photo, then tap the 4 corners to crop. Lay it flat on a plain, contrasting background and fill the frame.',
  label: '📸 Take the photo, then tap 3 points around the edge to crop. Center the label and fill the frame.',
  matrix: '📸 Take the photo of the run-out groove — angle the disc under light (try 🔦) so the etching casts shadows.',
};
/* A BOX SET (owner, 2026-11-12): album.box, and album.discs is then its count
   of LPs - any number, one added at a time. The box's own entries are the
   covers above (01-05, named as they always were). LP 1 and LP 2 are the
   disc 1 and disc 2 entries above, named as they always were too. Each LP may
   have a photo of its own jacket, and LP 3 onward get the same entries again
   for their two sides (2n-1 and 2n, the box's side numbers), made here from
   one template. Their files carry an LP token where the two-digit number
   would be ("... - LP3 Side 5 Label.jpg"), a name nothing that reads the
   two-digit numbers takes for one of sides 1-4. */
const BOX_MAX_LPS = 30;
const BOX_IDS = ['front', 'frontgrade', 'back', 'backgrade', 'other'];
const BOX_SHOW = { front: 'Box Front', frontgrade: 'Box Front Grade', back: 'Box Back', backgrade: 'Box Back Grade' };
function lpJacketDef(n) {
  return { id: `lp${n}jacket`, tok: `LP${n}`, name: 'Jacket', type: 'cover', disc: n, lp: n, opt: true };
}
function lpSideDefs(n) {
  const tok = `LP${n}`, sides = [2 * n - 1, 2 * n], out = [];
  for (const s of sides) {
    out.push({ id: `s${s}label`, tok, name: `Side ${s} Label`, type: 'label', disc: n, lp: n, side: s });
    out.push({ id: `s${s}vinyl`, tok, name: `Side ${s} Vinyl`, type: 'label', disc: n, lp: n, side: s, opt: true, tip: VINYL_TIP });
    out.push({ id: `s${s}grade`, tok, name: `Vinyl Grade Side ${s}`, type: 'grade', disc: n, lp: n, side: s });
  }
  for (const s of sides)
    out.push({ id: `s${s}matrix`, tok, name: `Side ${s} Matrix/Runout`, fname: `Side ${s} Matrix Runout`, type: 'matrix', disc: n, lp: n, side: s });
  return out;
}
// The checklist entries an album has, in the order the checklist shows them.
// An album that is not a box set has exactly the entries it always had.
function albumShots(al) {
  const n = Math.max(1, Number(al && al.discs) || 1);
  if (!(al && al.box)) return SHOTS.filter(d => d.disc <= n);
  const out = SHOTS.filter(d => BOX_IDS.includes(d.id)).map(d => Object.assign({}, d, { lp: 0, show: BOX_SHOW[d.id] || d.name }));
  for (let k = 1; k <= n; k++) {
    out.push(lpJacketDef(k));
    if (k <= 2) out.push(...SHOTS.filter(d => d.disc === k && !BOX_IDS.includes(d.id)).map(d => Object.assign({}, d, { lp: k })));
    else out.push(...lpSideDefs(k));
  }
  return out;
}
// The entry a stored shot id belongs to (a runout photo slot's "_pN" is its
// runout entry's), whatever album it is in.
function shotDef(id) {
  const base = String(id).replace(/_p\d+$/, '');
  const d = SHOTS.find(x => x.id === base);
  if (d) return d;
  let m = /^lp(\d+)jacket$/.exec(base);
  if (m && Number(m[1]) >= 1) return lpJacketDef(Number(m[1]));
  m = /^s(\d+)(label|vinyl|grade|matrix)$/.exec(base);
  if (m && Number(m[1]) >= 5) return lpSideDefs(Math.ceil(Number(m[1]) / 2)).find(x => x.id === base) || null;
  return null;
}
// "06" for the numbered entries, "LP3" for a box's LP entries.
function shotTag(def) { return def.tok || pad2(def.n); }
function shotLabel(def) { return `${shotTag(def)} ${def.show || def.name}`; }
// "1 disc", "2 discs", "Box set · 9 LPs" - the home card and the folder question.
function albumKind(al) {
  const n = Math.max(1, Number(al && al.discs) || 1);
  if (al && al.box) return `Box set · ${n} LP${n === 1 ? '' : 's'}`;
  return n === 2 ? '2 discs' : '1 disc';
}

/* ---------- IndexedDB ---------- */
let _db = null;
function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('vinylsnap', 3);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains('albums')) d.createObjectStore('albums', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('shots')) d.createObjectStore('shots', { keyPath: ['albumId', 'shotId'] });
      if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
      // crop training data: original photo + the crop geometry you set, queued
      // for upload to a dedicated Drive folder (owner opt-in)
      if (!d.objectStoreNames.contains('croplog')) d.createObjectStore('croplog', { keyPath: 'id' });
      // record checks made with the appraiser (photos, the read, the answer)
      if (!d.objectStoreNames.contains('checks')) d.createObjectStore('checks', { keyPath: 'id' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function db() { return _db || (_db = await openDB()); }
function reqP(req) {
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
async function dbPut(store, val, key) { return reqP((await db()).transaction(store, 'readwrite').objectStore(store).put(val, key)); }
async function dbGet(store, key) { return reqP((await db()).transaction(store).objectStore(store).get(key)); }
async function dbAll(store) { return reqP((await db()).transaction(store).objectStore(store).getAll()); }
async function dbDel(store, key) { return reqP((await db()).transaction(store, 'readwrite').objectStore(store).delete(key)); }
async function dbClear(store) { return reqP((await db()).transaction(store, 'readwrite').objectStore(store).clear()); }
async function shotsFor(albumId) {
  return reqP((await db()).transaction('shots').objectStore('shots')
    .getAll(IDBKeyRange.bound([albumId, ''], [albumId, '￿'])));
}

/* ---------- built-in Google credentials ----------
 *
 * An OAuth client id identifies THIS APP, not the person signing in, and in a
 * browser app it is public by design - readable in the page source either way.
 * Filling these in once, here, is what keeps a client out of the Cloud console
 * entirely: they tap Upload, sign in with their own Google account, allow.
 *
 * The app asks only for drive.file, which Google classes as a NON-SENSITIVE
 * scope, so the consent screen can be published "In production" without going
 * through verification review. Leave the project in "Testing" instead and every
 * client's address has to be added by hand as a test user, and they get an
 * "unverified app" warning.
 *
 * Anything left empty here falls back to what the owner typed in Settings, so
 * an unfilled build behaves exactly as it always has.
 */
const BUILTIN = {
  // Cloud project "vinyl-curator-tools", consent screen published In production,
  // authorized JavaScript origin https://pnicol66-sketch.github.io
  clientId: '1030181614616-f75p8qdblfdko1flgv07i0mubsoc3usg.apps.googleusercontent.com',
  apiKey: '',         // AIza...        - only for the advanced "Link..." picker
  projectNumber: '',  // 000000000000   - only for the advanced "Link..." picker
  shareWith: 'pnicol66@gmail.com',
};

/* ---------- settings ---------- */
const settings = { clientId: '', apiKey: '', projectNumber: '', shareWith: '', autoCrop: true, autoLevel: true, logCrops: true, cropNotice: 0, maxOut: 2400, quality: 0.92, driveFolder: 'Vinyl Curator', driveFolders: null, driveFolderIds: null };
// Crop training examples go straight from the phone to the maker's intake,
// never through anyone's Drive (Google's API user-data policy forbids training
// a general model on data read out of Drive).
const CROP_INTAKE = 'https://crops.vinylcurator.net/v1/crop';
// What the app should actually use: an explicit Settings entry always wins, so
// one client can point a build at their own project without a separate build.
function cred(k) { return String(settings[k] || BUILTIN[k] || '').trim(); }
async function loadSettings() {
  const s = await dbGet('kv', 'settings');
  if (s) Object.assign(settings, s);
  // migrate pre-v1.4 single-folder settings to the folder list
  if (!Array.isArray(settings.driveFolders) || !settings.driveFolders.length)
    settings.driveFolders = [settings.driveFolder || 'Vinyl Curator'];
  if (!settings.driveFolders.includes(settings.driveFolder))
    settings.driveFolder = settings.driveFolders[0];
  // v1.5: a folder entry may be LINKED to a real Drive folder id chosen in the
  // picker. Forget ids whose entry has since been removed from the list.
  if (!settings.driveFolderIds || typeof settings.driveFolderIds !== 'object') settings.driveFolderIds = {};
  for (const k of Object.keys(settings.driveFolderIds))
    if (!settings.driveFolders.includes(k)) delete settings.driveFolderIds[k];
}
async function saveSettings() { await dbPut('kv', { ...settings }, 'settings'); }

/* ---------- navigation ---------- */
let backAction = null;
function show(id, { title = 'Vinyl Curator', back = null, gear = false } = {}) {
  stopVoice();   // any screen change cancels an in-progress dictation
  $$('main > section').forEach(s => s.classList.toggle('active', s.id === id));
  $('#title').textContent = title;
  backAction = back;
  $('#btnBack').classList.toggle('hidden', !back);
  $('#btnSettings').classList.toggle('hidden', !gear);
  window.scrollTo(0, 0);
}
$('#btnBack').onclick = () => backAction && backAction();
$('#btnSettings').onclick = () => openSettings();

/* ---------- home ---------- */
async function goHome() {
  stopCam();
  show('scr-home', { title: 'Vinyl Curator', gear: true });
  const all = (await dbAll('albums')).sort((a, b) => b.created - a.created);
  const albums = all.filter(a => !a.uploaded);
  const hiddenCount = all.length - albums.length;
  $('#btnArchive').classList.toggle('hidden', !hiddenCount && !cred('clientId'));
  const list = $('#albumList');
  list.innerHTML = '';
  if (!albums.length) {
    list.innerHTML = hiddenCount
      ? '<p class="empty">All albums uploaded ✓<br>Find them under “Uploaded albums” below.</p>'
      : '<p class="empty">No albums yet.<br>Tap “New Album” to start shooting.</p>';
  }
  for (const al of albums) {
    const shots = await shotsFor(al.id);
    const visible = albumShots(al);
    const done = shots.filter(s => s.status === 'done' || s.status === 'text').length;
    const row = document.createElement('div');
    row.className = 'albumcard';
    row.dataset.album = al.id;
    const upText = uploadLabel(al);
    row.innerHTML =
      `<button class="al-open"><div class="al-art">${esc(al.artist)}</div>` +
      `<div class="al-title">${esc(al.title)}</div>` +
      `<div class="al-meta">${albumKind(al)} · ${done}/${visible.length} photos</div>` +
      `<div class="al-up${al.upload ? ' ' + al.upload.state : ''}${upText ? '' : ' hidden'}">${esc(upText)}</div></button>` +
      (al.upload && al.upload.state === 'ask'
        ? `<button class="al-retry" aria-label="Choose what to keep">⇄</button>`
        : `<button class="al-retry${al.upload && al.upload.state === 'failed' ? '' : ' hidden'}" aria-label="Retry upload">↻</button>`) +
      `<button class="al-del${al.upload && al.upload.state === 'uploading' ? ' hidden' : ''}" aria-label="Delete album">🗑</button>`;
    row.querySelector('.al-open').onclick = () => openAlbum(al.id);
    row.querySelector('.al-retry').onclick = async () => {
      const fresh = await dbGet('albums', al.id);
      if (!fresh || !fresh.upload) return;
      if (fresh.upload.state === 'ask') return openChooser(fresh.id);   // changed on both sides: the collector chooses
      await setUpload(fresh, { state: 'queued', error: '', queued: Date.now() });
      pumpUploads();
    };
    row.querySelector('.al-del').onclick = async () => {
      const fresh = await dbGet('albums', al.id);
      if (fresh && fresh.upload && fresh.upload.state === 'uploading') return toast('Wait for the upload to finish');
      if (!confirm(`Delete "${al.artist} — ${al.title}" and its photos from this phone?`)) return;
      for (const s of shots) await dbDel('shots', [al.id, s.shotId]);
      await dbDel('albums', al.id);
      goHome();
    };
    list.appendChild(row);
  }
  refreshUploadCards();
}

/* ---------- new album ---------- */
$('#btnNew').onclick = () => {
  $('#inArtist').value = '';
  $('#inTitle').value = '';
  $('#inDiscs1').checked = true;
  $('#btnArtistVoice').classList.toggle('hidden', !SpeechRec);
  $('#btnTitleVoice').classList.toggle('hidden', !SpeechRec);
  show('scr-new', { title: 'New Album', back: goHome });
};
$('#btnCreate').onclick = async () => {
  const artist = $('#inArtist').value.trim();
  const title = $('#inTitle').value.trim();
  if (!artist) return toast('Enter the label artist name');
  if (!title) return toast('Enter the album title');
  const box = $('#inDiscsBox').checked;
  const al = {
    id: Date.now().toString(36),
    artist, title,
    discs: !box && $('#inDiscs2').checked ? 2 : 1,
    created: Date.now(),
  };
  if (box) al.box = true;   // a box set starts with LP 1; "Add another LP" adds the rest
  await dbPut('albums', al);
  openAlbum(al.id);
};

/* ---------- album checklist ---------- */
let curAlbum = null;
let thumbUrls = [];
async function openAlbum(id) {
  curAlbum = await dbGet('albums', id);
  if (!curAlbum) return goHome();
  curShot = null;   // a fresh open starts at the top; a return lands on the entry just left
  backToAlbum();
}
// The checklist rebuilds on every return, and a rebuilt list starts at the
// top - on a 4-LP set the entry just finished was two screens down and the
// next one had to be found again. So the return remembers the entry it came
// from and lands on it, the next entries right below.
let focusShotId = null;
// A box set's LP blocks opened or folded by hand, by "<albumId>:<LP>"; a block
// not touched is folded once it is complete.
const lpOpen = {};
function backToAlbum() {
  stopCam();
  freeReview();
  stopVoice();
  freeSlotUrls();
  textDraft = null;
  focusShotId = curShot ? curShot.id : null;
  show('scr-album', { title: 'Checklist', back: goHome });
  renderShotList();
}
async function renderShotList() {
  thumbUrls.forEach(u => URL.revokeObjectURL(u));
  thumbUrls = [];
  const shots = await shotsFor(curAlbum.id);
  const byId = Object.fromEntries(shots.map(s => [s.shotId, s]));
  $('#albumHdr').textContent = `${curAlbum.artist} — ${curAlbum.title}`;
  const list = $('#shotList');
  list.innerHTML = '';
  const visible = albumShots(curAlbum);
  const isDone = def => { const st = byId[def.id]?.status; return st === 'done' || st === 'text'; };
  const done = visible.filter(isDone).length;
  const shotRow = def => {
    const rec = byId[def.id];
    const status = rec?.status || '';
    const isMatrix = def.type === 'matrix';
    const slotRecs = isMatrix ? SLOTS.map(n => byId[slotId(def, n)]).filter(Boolean) : [];
    const item = document.createElement('button');
    item.className = 'shotitem';
    item.dataset.shot = def.id;
    const thumbChar = status === 'done' ? '' : status === 'text' ? (slotRecs.length ? '' : '⌨') : status === 'skipped' ? '—' : (def.type === 'grade' || isMatrix) ? '⌨' : '📷';
    let nameExtra = status === 'text'
      ? ` <em>· ${esc(rec.text.length > 22 ? rec.text.slice(0, 22) + '…' : rec.text)}</em>`
      : def.opt ? ' <em>· optional</em>' : '';
    if (slotRecs.length) nameExtra += ` <em>· 📷×${slotRecs.length}</em>`;
    if (def.type === 'grade' && (curAlbum.gradeNotes || {})[def.id]) nameExtra += ' <em>· ✎ note</em>';
    item.innerHTML =
      `<span class="thumb">${thumbChar}</span>` +
      `<span class="shotname">${esc(shotLabel(def))}${nameExtra}</span>` +
      `<span class="shotstate ${status === 'text' ? 'done' : status}">${status === 'done' || status === 'text' ? '✓' : status === 'skipped' ? 'skipped' : ''}</span>`;
    const thumbBlob = status === 'done' ? rec.blob : slotRecs.length ? slotRecs[0].blob : null;
    if (thumbBlob) {
      const url = URL.createObjectURL(thumbBlob);
      thumbUrls.push(url);
      const img = document.createElement('img');
      img.src = url;
      item.querySelector('.thumb').appendChild(img);
    }
    item.onclick = () => {
      if (isMatrix) openTextEntry(def, rec);
      else if (status === 'done') openViewer(def, rec);
      else if (status === 'text' || def.type === 'grade') openTextEntry(def, rec);
      else openCamera(def);
    };
    return item;
  };
  // A row of its own that is not an entry: the disc count, the box set's LPs.
  const actRow = (act, thumb, name, sub, onclick) => {
    const b = document.createElement('button');
    b.className = 'shotitem';
    b.dataset.act = act;
    b.innerHTML = `<span class="thumb">${thumb}</span><span class="shotname">${name} <em>· ${sub}</em></span><span class="shotstate"></span>`;
    b.onclick = onclick;
    return b;
  };
  if (!curAlbum.box) {
    for (const def of visible) list.appendChild(shotRow(def));
    // The disc count is a checklist row of its own, right where the missing
    // sides would appear: a single LP that turns out to be a set grows sides
    // 3-4 in place (nothing taken is touched), and a set shrunk to one LP drops
    // them - asking first when they hold anything. The habit this fixes: the
    // default is 1 disc, and the mistake is noticed with the checklist open.
    const two = curAlbum.discs === 2;
    const discItem = document.createElement('button');
    discItem.className = 'shotitem';
    discItem.innerHTML =
      `<span class="thumb">${two ? '−' : '＋'}</span>` +
      `<span class="shotname">${two ? 'Single disc' : '2-disc set'} <em>· ${two ? 'remove sides 3–4' : 'add sides 3–4'}</em></span>` +
      `<span class="shotstate"></span>`;
    discItem.onclick = () => setDiscs(two ? 1 : 2);
    list.appendChild(discItem);
    // ...and so is the box set: what is taken stays, LP 1 and LP 2 being sides 1-4
    list.appendChild(actRow('makebox', '▤', 'Make this a box set', 'add its LPs one by one', () => setBox(true)));
  } else {
    // A box set: its own entries, then a block a LP under a heading that
    // folds the block away once it is complete. A return to the checklist
    // opens the block of the entry it came from.
    const lps = Math.max(1, Number(curAlbum.discs) || 1);
    for (const def of visible.filter(d => d.lp === 0)) list.appendChild(shotRow(def));
    for (let k = 1; k <= lps; k++) {
      const defs = visible.filter(d => d.lp === k);
      const n = defs.filter(isDone).length;
      const complete = defs.every(d => d.opt || isDone(d) || byId[d.id]?.status === 'skipped');
      const key = curAlbum.id + ':' + k;
      const focused = !!focusShotId && defs.some(d => d.id === focusShotId);
      const open = focused || (key in lpOpen ? lpOpen[key] : !complete);
      const head = document.createElement('div');
      head.className = 'lphead';
      head.dataset.lp = String(k);
      const fold = document.createElement('button');
      fold.className = 'lpfold';
      fold.innerHTML =
        `<span class="lpchev">${open ? '▾' : '▸'}</span>` +
        `<span class="shotname">LP ${k} <em>· sides ${2 * k - 1}–${2 * k} · ${n}/${defs.length}</em></span>` +
        `<span class="shotstate ${complete ? 'done' : ''}">${complete ? '✓' : ''}</span>`;
      fold.onclick = () => { lpOpen[key] = !open; renderShotList(); };
      head.appendChild(fold);
      // only the last LP is removed, so no LP after it is ever renumbered
      if (k === lps && k >= 2) {
        const rm = document.createElement('button');
        rm.className = 'lpremove';
        rm.textContent = `Remove LP ${k}`;
        rm.onclick = () => removeBoxLp();
        head.appendChild(rm);
      }
      list.appendChild(head);
      if (open) for (const def of defs) list.appendChild(shotRow(def));
    }
    list.appendChild(actRow('addlp', '＋', 'Add another LP', `LP ${lps + 1} · sides ${2 * lps + 1}–${2 * lps + 2}`, () => addBoxLp()));
    list.appendChild(actRow('notbox', '−', 'Not a box set', lps >= 2 ? 'a 2-disc set again' : 'a single disc again', () => setBox(false)));
  }
  // per-album personal note (private) — its own row at the very end
  const noteVal = (curAlbum.personalNote || '').trim();
  const noteItem = document.createElement('button');
  noteItem.className = 'shotitem';
  const notePrev = noteVal
    ? ` <em>· ${esc(noteVal.length > 26 ? noteVal.slice(0, 26) + '…' : noteVal)}</em>`
    : ' <em>· optional · private</em>';
  noteItem.innerHTML =
    `<span class="thumb">📝</span>` +
    `<span class="shotname">Personal note${notePrev}</span>` +
    `<span class="shotstate ${noteVal ? 'done' : ''}">${noteVal ? '✓' : ''}</span>`;
  noteItem.onclick = () => openNote();
  list.appendChild(noteItem);
  // the barcode (newer pressings): scanned or typed, it names the exact
  // edition for the sheet's lookups
  const upcVal = (curAlbum.upc || '').trim();
  const bcItem = document.createElement('button');
  bcItem.className = 'shotitem';
  bcItem.innerHTML =
    `<span class="thumb">🔢</span>` +
    `<span class="shotname">Barcode${upcVal ? ` <em>· ${esc(upcVal)}</em>` : ' <em>· optional · newer pressings</em>'}</span>` +
    `<span class="shotstate ${upcVal ? 'done' : ''}">${upcVal ? '✓' : ''}</span>`;
  bcItem.onclick = () => openBarcode();
  list.appendChild(bcItem);
  $('#albumProgress').textContent = `${done}/${visible.length}`;
  $('#btnExport').disabled = done === 0;
  // land on the entry just left (show() had scrolled to the top); the
  // row's scroll-margin keeps it clear of the sticky header
  if (focusShotId) {
    const el = list.querySelector(`[data-shot="${focusShotId}"]`);
    focusShotId = null;
    if (el) el.scrollIntoView({ block: 'start' });
  }
}
// Grow a single LP to a 2-disc set, or shrink a set back to one LP. Growing
// only reveals the side 3-4 entries; shrinking removes what those entries
// hold, after saying what that is (a skipped marker alone is not worth asking
// about). The upload and the album.json manifest read the count afresh.
async function setDiscs(n) {
  if (!curAlbum || curAlbum.discs === n) return;
  if (n === 1) {
    const shots = await shotsFor(curAlbum.id);
    const gone = shots.filter(s => {
      const def = SHOTS.find(d => d.id === s.shotId || s.shotId.startsWith(d.id + '_p'));
      return def && def.disc === 2;
    });
    const photos = gone.filter(s => s.blob).length;
    const texts = gone.filter(s => s.status === 'text').length;
    if (photos || texts) {
      const parts = [];
      if (photos) parts.push(`${photos} photo${photos === 1 ? '' : 's'}`);
      if (texts) parts.push(`${texts} typed entr${texts === 1 ? 'y' : 'ies'}`);
      if (!confirm(`Sides 3–4 hold ${parts.join(' and ')}. Remove them with the sides?`)) return;
    }
    for (const s of gone) await dbDel('shots', [curAlbum.id, s.shotId]);
  }
  curAlbum.discs = n;
  await dbPut('albums', curAlbum);
  toast(n === 2 ? 'Sides 3–4 added — a 2-disc set' : 'Sides 3–4 removed — a single disc');
  renderShotList();
}
// "2 photos and 1 typed entry" - what some stored shots hold, '' for nothing
// worth asking about (a skipped marker alone).
function heldText(shots) {
  const photos = shots.filter(s => s.blob).length;
  const texts = shots.filter(s => s.status === 'text').length;
  const parts = [];
  if (photos) parts.push(`${photos} photo${photos === 1 ? '' : 's'}`);
  if (texts) parts.push(`${texts} typed entr${texts === 1 ? 'y' : 'ies'}`);
  return parts.join(' and ');
}
// A box set's LPs are added one at a time, after the last: the new LP's
// entries appear in place and nothing taken is touched.
async function addBoxLp() {
  if (!curAlbum || !curAlbum.box) return;
  const n = Math.max(1, Number(curAlbum.discs) || 1) + 1;
  if (n > BOX_MAX_LPS) return toast(`A box set here holds up to ${BOX_MAX_LPS} LPs`);
  curAlbum.discs = n;
  await dbPut('albums', curAlbum);
  toast(`LP ${n} added — sides ${2 * n - 1}–${2 * n}`);
  focusShotId = `lp${n}jacket`;   // the list opens on the new LP
  renderShotList();
}
// Only the LAST LP is removed, so no later LP is renumbered and no file goes
// up again under a new name. What it holds is named and asked about first;
// an album already uploaded is told its Drive folder keeps that LP's files,
// since this app never deletes a Drive file.
async function removeBoxLp() {
  if (!curAlbum || !curAlbum.box) return;
  const n = Math.max(1, Number(curAlbum.discs) || 1);
  if (n < 2) return;
  const ids = albumShots(curAlbum).filter(d => d.lp === n).map(d => d.id);
  const gone = (await shotsFor(curAlbum.id)).filter(s => ids.includes(String(s.shotId).replace(/_p\d+$/, '')));
  const what = heldText(gone);
  if (what) {
    const kept = curAlbum.driveFolderId ? ' Its files already in the album’s Drive folder stay there — this app never deletes a Drive file.' : '';
    if (!confirm(`LP ${n} holds ${what}. Remove them with the LP?${kept}`)) return;
  }
  for (const s of gone) await dbDel('shots', [curAlbum.id, s.shotId]);
  const notes = Object.assign({}, curAlbum.gradeNotes || {});
  let noteGone = false;
  for (const id of ids) if (id in notes) { delete notes[id]; noteGone = true; }
  if (noteGone) curAlbum.gradeNotes = notes;
  delete lpOpen[curAlbum.id + ':' + n];
  curAlbum.discs = n - 1;
  await dbPut('albums', curAlbum);
  toast(`LP ${n} removed`);
  renderShotList();
}
// A box set or not is revisable on the checklist, where the mistake is
// noticed, like the disc count above. Making one keeps
// everything: LP 1 and LP 2 are sides 1-4. Undoing one is refused while LP 3
// or later holds anything, and otherwise asks first (an LP jacket photo goes
// with the box).
async function setBox(on) {
  if (!curAlbum || !!curAlbum.box === on) return;
  if (on) {
    curAlbum.box = true;
    curAlbum.discs = Math.max(1, Number(curAlbum.discs) || 1);
    await dbPut('albums', curAlbum);
    toast('A box set — LP 1–2 are sides 1–4; add its other LPs below');
    return renderShotList();
  }
  const lps = Math.max(1, Number(curAlbum.discs) || 1);
  const shots = await shotsFor(curAlbum.id);
  const boxOnly = shots.filter(s => { const d = shotDef(s.shotId); return d && (d.tok || d.disc > 2); });
  const later = heldText(boxOnly.filter(s => shotDef(s.shotId).disc > 2));
  if (later) {
    const range = lps > 3 ? `LP 3–${lps}` : 'LP 3';
    return toast(`${range} ${lps > 3 ? 'hold' : 'holds'} ${later}. Remove ${range} first.`, 4000);
  }
  const jackets = boxOnly.filter(s => s.blob).length;
  const to = lps >= 2 ? 'a 2-disc set' : 'a single disc';
  const q = `Make this ${to} again, not a box set?` +
    (jackets ? ` Its ${jackets} LP jacket photo${jackets === 1 ? '' : 's'} ${jackets === 1 ? 'goes' : 'go'} with the box.` : '');
  if (!confirm(q)) return;
  for (const s of boxOnly) await dbDel('shots', [curAlbum.id, s.shotId]);
  delete curAlbum.box;
  curAlbum.discs = Math.min(lps, 2);
  await dbPut('albums', curAlbum);
  toast(`Not a box set — ${to}`);
  renderShotList();
}
// The album is a parameter (defaulting to the open one) because the upload
// queue names files for albums that are no longer on screen. A box's LP
// entries carry their LP token where the number would be ("LP3 Side 5 Label"),
// and a runout photo of theirs a plain slot number (the side letters A-D are
// sides 1-4's).
function baseNameFor(def, al = curAlbum) {
  return sanitize(`${al.artist} - ${al.title} - ${shotTag(def)} ${def.fname || def.name}`);
}
function filenameFor(def, al = curAlbum) {
  return baseNameFor(def, al) + '.jpg';
}
function slotFilename(def, n, al = curAlbum) {
  return `${baseNameFor(def, al)} ${def.letter || ''}${n}.jpg`;
}

/* ---------- camera ---------- */
let stream = null, track = null, imageCapture = null, curShot = null, curSlot = null, torchOn = false, manualFocus = false;
function camBack() {
  return curSlot ? openTextEntry(curShot) : backToAlbum();
}
async function openCamera(def, slot) {
  curShot = def;
  curSlot = def.type === 'matrix' ? (slot || 1) : null;
  freeReview();
  const label = curSlot ? `${shotLabel(def)} · Photo ${curSlot}` : shotLabel(def);
  show('scr-camera', { title: label, back: camBack });
  $('#camLabel').textContent = curSlot ? `${shotTag(def)} · ${def.show || def.name} · Photo ${curSlot}` : `${shotTag(def)} · ${def.show || def.name}`;
  $('#camTip').textContent = def.tip || TIPS[def.type] || '';
  $('#btnSkip').classList.toggle('hidden', !def.opt);
  $('#camFallback').classList.add('hidden');
  await startCam();
}
async function startCam() {
  stopCam();
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return camFail('The camera needs a secure (https) address. You can still import a photo taken with the camera app.');
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 4096 }, height: { ideal: 3072 } },
    });
  } catch (e) {
    return camFail('Camera unavailable or permission denied. You can still import a photo taken with the camera app.');
  }
  const v = $('#video');
  v.srcObject = stream;
  try { await v.play(); } catch {}
  track = stream.getVideoTracks()[0];
  imageCapture = ('ImageCapture' in window) ? new ImageCapture(track) : null;
  const caps = track.getCapabilities ? track.getCapabilities() : {};
  $('#btnTorch').classList.toggle('hidden', !caps.torch);
  torchOn = false;
  $('#btnTorch').classList.remove('on');
  const zoomEl = $('#zoom');
  if (caps.zoom && caps.zoom.max > caps.zoom.min) {
    zoomEl.min = caps.zoom.min;
    zoomEl.max = caps.zoom.max;
    zoomEl.step = caps.zoom.step || 0.1;
    zoomEl.value = (track.getSettings && track.getSettings().zoom) || caps.zoom.min;
    $('#zoomRow').classList.remove('hidden');
  } else {
    $('#zoomRow').classList.add('hidden');
  }
  manualFocus = false;
  $('#btnAF').classList.add('on');
  const modes = caps.focusMode || [];
  const focusEl = $('#focus');
  if (modes.includes('manual') && caps.focusDistance && caps.focusDistance.max > caps.focusDistance.min) {
    focusEl.min = caps.focusDistance.min;
    focusEl.max = caps.focusDistance.max;
    focusEl.step = caps.focusDistance.step || 0.01;
    focusEl.value = (track.getSettings && track.getSettings().focusDistance) || caps.focusDistance.min;
    $('#focusRow').classList.remove('hidden');
  } else {
    $('#focusRow').classList.add('hidden');
  }
  if (curShot && curShot.type === 'matrix' && !$('#focusRow').classList.contains('hidden')) {
    $('#camTip').textContent = TIPS.matrix + ' Blurry? Drag Focus or tap AF.';
  }
  // Some phones open the getUserMedia stream with focus locked; ask for continuous AF explicitly.
  if (modes.includes('continuous')) {
    track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
  }
}
function refocus() {
  if (!track) return;
  const modes = (track.getCapabilities && track.getCapabilities().focusMode) || [];
  if (modes.includes('single-shot')) {
    track.applyConstraints({ advanced: [{ focusMode: 'single-shot' }] }).catch(() => {});
  } else if (modes.includes('continuous')) {
    track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
  }
}
function stopCam() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null; track = null; imageCapture = null;
  }
}
function camFail(msg) {
  $('#camFallback').classList.remove('hidden');
  $('#camFallbackMsg').textContent = msg;
}
$('#zoom').oninput = e => {
  if (track) track.applyConstraints({ advanced: [{ zoom: Number(e.target.value) }] }).catch(() => {});
};
$('#zoom').onchange = () => {
  if (!manualFocus) refocus();
};
$('#focus').oninput = e => {
  if (!track) return;
  manualFocus = true;
  $('#btnAF').classList.remove('on');
  track.applyConstraints({ advanced: [{ focusMode: 'manual', focusDistance: Number(e.target.value) }] }).catch(() => {});
};
$('#btnAF').onclick = () => {
  manualFocus = false;
  $('#btnAF').classList.add('on');
  refocus();
};
$('#btnTorch').onclick = () => {
  torchOn = !torchOn;
  $('#btnTorch').classList.toggle('on', torchOn);
  if (track) track.applyConstraints({ advanced: [{ torch: torchOn }] }).catch(() => {});
};
$('#btnSnap').onclick = snap;
$('#btnImport').onclick = () => $('#fileInput').click();
$('#btnImport2').onclick = () => $('#fileInput').click();
$('#fileInput').onchange = async e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    const bmp = await createImageBitmap(f, { imageOrientation: 'from-image' });
    openReview(bmp);
  } catch {
    toast('Could not read that image');
  }
};
$('#btnSkip').onclick = async () => {
  await dbPut('shots', { albumId: curAlbum.id, shotId: curShot.id, status: 'skipped' });
  backToAlbum();
};
// A blank capture (all-black / uniform frame) sometimes comes back from
// takePhoto() or a not-yet-ready video frame — most often on the matrix/runout
// close-ups where the torch has just toggled. Uniform frames have ~zero
// luminance variance; a real photo, even a dim runout, carries texture, so this
// never rejects a genuinely dark shot.
function isBlankFrame(bmp) {
  let c = null;
  try {
    const n = 32;
    c = document.createElement('canvas');
    c.width = n; c.height = n;
    const cx = c.getContext('2d', { willReadFrequently: true });
    cx.drawImage(bmp, 0, 0, n, n);
    const d = cx.getImageData(0, 0, n, n).data;
    let sum = 0, sum2 = 0;
    const cnt = n * n;
    for (let i = 0; i < d.length; i += 4) {
      const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      sum += l; sum2 += l * l;
    }
    const variance = sum2 / cnt - (sum / cnt) ** 2;
    return variance < 6;
  } catch { return false; }   // never block a capture on a measurement error
  finally { freeCanvas(c); }
}
async function snap() {
  let bmp = null;
  // takePhoto() can run its own autofocus pass, which would undo a manually set focus.
  if (imageCapture && imageCapture.takePhoto && !manualFocus) {
    try {
      const blob = await Promise.race([
        imageCapture.takePhoto(),
        new Promise((_, rj) => setTimeout(() => rj(new Error('timeout')), 3000)),
      ]);
      bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    } catch {}
  }
  // a blank takePhoto result falls through to the live video frame below
  if (bmp && isBlankFrame(bmp)) { if (bmp.close) bmp.close(); bmp = null; }
  if (!bmp) {
    const v = $('#video');
    if (!v.videoWidth) return toast('Camera not ready');
    const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    try { bmp = await createImageBitmap(c); } finally { freeCanvas(c); }
    if (isBlankFrame(bmp)) {
      if (bmp.close) bmp.close();
      return toast('Camera returned a blank frame — hold steady and snap again', 3000);
    }
  }
  openReview(bmp);
}

/* ---------- review / crop ---------- */
let review = { bmp: null, quad: null, circle: null, ellipse: null, shape: 'quad', mode: 'adjust', taps: [], tapActive: null, rot: 0, scale: 1, dpr: 1, dragging: null, loupe: null, settle: null, dragTap: null };
function freeReview() {
  clearSettle();
  if (review.bmp && review.bmp.close) review.bmp.close();
  review.bmp = null;
  review.quad = null;
  review.circle = null;
  review.ellipse = null;
  review.taps = [];
  review.tapActive = null;
  review.dragging = null;
  review.loupe = null;
}
function openReview(bmp) {
  stopCam();
  freeReview();
  const type = curShot && curShot.type;
  const shape = type === 'label' ? 'ellipse' : type === 'matrix' ? 'rect' : 'quad';
  // covers + LPs seed by tapping the four corners; round labels/discs seed by
  // tapping the rim (an ellipse — a tilted disc photographs oval) which is then
  // deskewed to a true circle on save. "○ Circle" drops to a plain circle crop.
  const tapMode = shape === 'quad' || shape === 'ellipse';
  review = {
    bmp, quad: null, circle: null, ellipse: null, shape,
    mode: tapMode ? 'tap' : 'adjust', taps: [], tapActive: null,
    rot: 0, scale: 1, dpr: 1, dragging: null, loupe: null, settle: null, dragTap: null,
  };
  $('#btnRotate').textContent = '⟳ 0°';
  // run-outs are flat, straight crops: swap the (redundant) Auto button for the
  // rectangle/skew toggle, so the frame can't be knocked out of square by accident
  $('#btnAuto').classList.toggle('hidden', type === 'matrix');
  $('#btnAuto').textContent = type === 'label' ? '○ Circle' : 'Auto';
  $('#btnShape').classList.toggle('hidden', type !== 'matrix');
  $('#btnUndo').classList.toggle('hidden', shape === 'rect');
  updateShapeBtn();
  show('scr-review', { title: shotLabel(curShot), back: () => openCamera(curShot, curSlot) });
  layoutReview();
  if (tapMode && shape === 'quad' && settings.autoCrop) tryOnDeviceThenTap(bmp);
  else if (tapMode) enterTapMode();
  else { updateTapPrompt(); autoDetect(); }
}
// on-device cover auto-crop: run u2netp, seed the quad, hand to the same manual
// review (drag corners). Miss / slow / offline → tapping.
async function tryOnDeviceThenTap(bmp) {
  review.mode = 'ai';
  $('#btnSave').disabled = true;   // re-enabled by updateTapPrompt once the mode moves on
  $('#tapPrompt').classList.remove('hidden', 'tapping');
  $('#tapPips').innerHTML = '';
  $('#tapMsg').textContent = '✨ Auto-cropping…';
  drawReview();
  let res = null;
  try { res = await onDeviceDetect(bmp, curShot && curShot.type); } catch (e) { console.error(e); }
  if (review.bmp !== bmp || !$('#scr-review').classList.contains('active')) return;
  // Retap, Auto or Full while the model ran moved the mode on (a tap is only
  // taken in tap mode): that choice stands and the late answer is dropped,
  // hit or miss, so it never overwrites taps or a frame already set
  if (review.mode !== 'ai') return;
  if (res && res.kind === 'quad') {
    review.quad = res.quad; review.shape = 'quad'; review.mode = 'adjust'; review.autoSeeded = true;
    updateShapeBtn(); updateTapPrompt(); drawReview();
    toast('Auto-cropped ✓ — drag any corner to fix, then Save');
    return;
  }
  enterTapMode();
  toast('Auto-crop missed — tap the corners', 2400);
}
function enterTapMode() {
  clearSettle();
  const type = curShot && curShot.type;
  review.shape = type === 'label' ? 'ellipse' : type === 'matrix' ? 'rect' : 'quad';
  review.mode = 'tap';
  review.autoSeeded = false;   // a retapped crop is manual, whatever seeded it before
  review.taps = [];
  review.quad = null;
  review.circle = null;
  review.ellipse = null;
  review.tapActive = null;
  review.dragging = null;
  review.loupe = null;
  updateTapPrompt();
  drawReview();
}
// taps needed to seed: 5 rim points for an ellipse, 3 for a circle, 4 corners for a quad
function tapsNeeded() { return review.shape === 'ellipse' ? 5 : review.shape === 'circle' ? 3 : 4; }
/* order four tapped points into TL,TR,BR,BL regardless of tap order */
function orderQuad(pts) {
  const s = pts.slice().sort((a, b) => a.y - b.y);
  const top = [s[0], s[1]].sort((a, b) => a.x - b.x);   // TL, TR
  const bot = [s[2], s[3]].sort((a, b) => a.x - b.x);   // BL, BR
  return [top[0], top[1], bot[1], bot[0]];
}
/* the unique circle through three points (circumcircle); null if they're collinear */
function circleFrom3(a, b, c) {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 1e-6) return null;
  const a2 = a.x * a.x + a.y * a.y, b2 = b.x * b.x + b.y * b.y, c2 = c.x * c.x + c.y * c.y;
  const cx = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d;
  const cy = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d;
  return { cx, cy, r: Math.hypot(a.x - cx, a.y - cy) };
}
/* Gauss–Jordan solve of the small square system A x = b; null if singular. */
function solveLin(A, b) {
  const n = b.length;
  const M = A.map((row, i) => row.slice().concat([b[i]]));
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < 1e-12) return null;
    const t = M[col]; M[col] = M[piv]; M[piv] = t;
    const pv = M[col][col];
    for (let c = col; c <= n; c++) M[col][c] /= pv;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col];
      if (!f) continue;
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map(row => row[n]);
}
/* Fit a general (possibly rotated) ellipse to >=5 rim points by least squares.
   Returns { cx, cy, ax, ay, theta } — semi-axes ax (along theta) and ay (perp),
   in image px — or null if the points don't make an ellipse. */
function fitEllipse(pts) {
  if (pts.length < 5) return null;
  let mx = 0, my = 0;
  for (const p of pts) { mx += p.x; my += p.y; }
  mx /= pts.length; my /= pts.length;
  // normal equations for A x² + B xy + C y² + D x + E y = 1 (F = -1), centred
  const AtA = [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]];
  const Atb = [0,0,0,0,0];
  for (const p of pts) {
    const x = p.x - mx, y = p.y - my;
    const row = [x*x, x*y, y*y, x, y];
    for (let i = 0; i < 5; i++) { Atb[i] += row[i]; for (let j = 0; j < 5; j++) AtA[i][j] += row[i] * row[j]; }
  }
  const u = solveLin(AtA, Atb);
  if (!u) return null;
  const A = u[0], B = u[1], C = u[2], D = u[3], E = u[4], F = -1;
  const det = B*B - 4*A*C;
  if (det >= 0) return null;                        // not an ellipse
  const xc = (2*C*D - B*E) / det, yc = (2*A*E - B*D) / det;
  const Fp = A*xc*xc + B*xc*yc + C*yc*yc + D*xc + E*yc + F;
  const theta = 0.5 * Math.atan2(B, A - C);
  const ct = Math.cos(theta), st = Math.sin(theta);
  const lTheta = A*ct*ct + B*ct*st + C*st*st;       // form value along theta
  const lPerp  = A*st*st - B*ct*st + C*ct*ct;        // …and perpendicular
  const ax = Math.sqrt(-Fp / lTheta), ay = Math.sqrt(-Fp / lPerp);
  if (!isFinite(ax) || !isFinite(ay) || ax <= 2 || ay <= 2) return null;
  return { cx: xc + mx, cy: yc + my, ax, ay, theta };
}
// normalized radial distance of a point from an ellipse centre (1 = on the rim)
function ellipseNormDist(el, px, py) {
  const dx = px - el.cx, dy = py - el.cy, ct = Math.cos(el.theta), st = Math.sin(el.theta);
  const lx = dx * ct + dy * st, ly = -dx * st + dy * ct;
  return Math.hypot(lx / el.ax, ly / el.ay);
}
/* ---------- on-device cover auto-crop (u2netp via ONNX Runtime Web) ----------
   Runs in the browser, offline, no key or account. Covers only. */
let _ortSession = null, _ortPromise = null;
function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = () => res(); s.onerror = () => rej(new Error('failed to load ' + src));
    document.head.appendChild(s);
  });
}
async function ortSession() {
  if (_ortSession) return _ortSession;
  if (!_ortPromise) {
    _ortPromise = (async () => {
      if (typeof ort === 'undefined') await loadScript('./vendor/ort/ort.min.js');
      ort.env.wasm.numThreads = 1;          // GitHub Pages can't set COOP/COEP for threads
      ort.env.wasm.simd = true;
      ort.env.wasm.wasmPaths = './vendor/ort/';
      _ortSession = await ort.InferenceSession.create('./models/u2netp.onnx', { executionProviders: ['wasm'] });
      return _ortSession;
    })().catch(e => { _ortPromise = null; throw e; });
  }
  return _ortPromise;
}
// keep the largest 4-connected blob in a 320² Uint8 mask (drops strays)
function keepLargest(mask, S) {
  const lab = new Int32Array(S * S), q = new Int32Array(S * S);
  let best = 0, bestSize = 0, cur = 0;
  for (let s0 = 0; s0 < S * S; s0++) {
    if (mask[s0] && !lab[s0]) {
      cur++; let head = 0, tail = 0, size = 0; q[tail++] = s0; lab[s0] = cur;
      while (head < tail) {
        const p = q[head++]; size++;
        const y = (p / S) | 0, x = p - y * S;
        if (x > 0 && mask[p - 1] && !lab[p - 1]) { lab[p - 1] = cur; q[tail++] = p - 1; }
        if (x < S - 1 && mask[p + 1] && !lab[p + 1]) { lab[p + 1] = cur; q[tail++] = p + 1; }
        if (y > 0 && mask[p - S] && !lab[p - S]) { lab[p - S] = cur; q[tail++] = p - S; }
        if (y < S - 1 && mask[p + S] && !lab[p + S]) { lab[p + S] = cur; q[tail++] = p + S; }
      }
      if (size > bestSize) { bestSize = size; best = cur; }
    }
  }
  for (let i = 0; i < S * S; i++) mask[i] = lab[i] === best ? 1 : 0;
}
async function onDeviceDetect(bmp, type) {
  if (type !== 'cover' && type !== 'user') return null;   // covers only
  let session;
  try { session = await ortSession(); } catch (e) { console.error('on-device model', e); return null; }
  const S = 320;
  const pc = document.createElement('canvas'); pc.width = S; pc.height = S;
  const pcx = pc.getContext('2d', { willReadFrequently: true });
  pcx.drawImage(bmp, 0, 0, S, S);
  const d = pcx.getImageData(0, 0, S, S).data;
  freeCanvas(pc);
  let mx = 0;
  for (let i = 0; i < d.length; i += 4) { if (d[i] > mx) mx = d[i]; if (d[i + 1] > mx) mx = d[i + 1]; if (d[i + 2] > mx) mx = d[i + 2]; }
  if (mx <= 0) mx = 255;
  const mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225];
  const t = new Float32Array(3 * S * S);
  for (let p = 0; p < S * S; p++) {
    t[p]             = ((d[p * 4] / mx)     - mean[0]) / std[0];
    t[S * S + p]     = ((d[p * 4 + 1] / mx) - mean[1]) / std[1];
    t[2 * S * S + p] = ((d[p * 4 + 2] / mx) - mean[2]) / std[2];
  }
  let out;
  try {
    const feeds = {}; feeds[session.inputNames[0]] = new ort.Tensor('float32', t, [1, 3, S, S]);
    out = await session.run(feeds);
  } catch (e) { console.error('on-device run', e); return null; }
  const raw = out[session.outputNames[0]].data;
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < S * S; i++) { const v = raw[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
  const rng = (hi - lo) || 1;
  const mask = new Uint8Array(S * S);
  let fg = 0;
  for (let i = 0; i < S * S; i++) { if ((raw[i] - lo) / rng > 0.5) { mask[i] = 1; fg++; } }
  if (fg < S * S * 0.08 || fg > S * S * 0.97) return null;   // no plausible object
  keepLargest(mask, S);
  let tl = null, tr = null, br = null, bl = null, vtl = Infinity, vtr = -Infinity, vbr = -Infinity, vbl = Infinity;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (!mask[y * S + x]) continue;
    const a = x + y, s = x - y;
    if (a < vtl) { vtl = a; tl = { x, y }; }
    if (a > vbr) { vbr = a; br = { x, y }; }
    if (s > vtr) { vtr = s; tr = { x, y }; }
    if (s < vbl) { vbl = s; bl = { x, y }; }
  }
  if (!tl || !tr || !br || !bl) return null;
  const kx = bmp.width / S, ky = bmp.height / S;
  const M = p => ({ x: p.x * kx, y: p.y * ky });
  return { kind: 'quad', quad: orderQuad([M(tl), M(tr), M(br), M(bl)]) };
}
function commitTap(p) {
  review.taps.push({ x: p.x, y: p.y });
  review.tapActive = null;
  review.loupe = null;
  if (review.taps.length >= tapsNeeded()) {
    // labels and discs: the numbered markers stay live for a moment so a
    // misplaced one can be dragged before the rim is fitted
    if (review.shape === 'ellipse' || review.shape === 'circle') { startSettle(); return; }
    finishTaps();
    return;
  }
  updateTapPrompt();
  drawReview();
}
// After the last rim tap the markers can be moved for TAP_SETTLE_MS; every
// adjustment restarts the clock, and with nothing touched the fit is accepted.
const TAP_SETTLE_MS = 3000;
function clearSettle() {
  if (review.settle) { clearTimeout(review.settle.timer); clearInterval(review.settle.tick); }
  review.settle = null;
  review.dragTap = null;
}
function startSettle() {
  clearSettle();
  review.settle = {
    deadline: Date.now() + TAP_SETTLE_MS,
    timer: setTimeout(finishTaps, TAP_SETTLE_MS),
    tick: setInterval(updateTapPrompt, 250),   // the countdown in the prompt
  };
  updateTapPrompt();
  drawReview();
}
function holdSettle() {   // a marker is being dragged: the clock waits for it
  if (!review.settle) return;
  clearTimeout(review.settle.timer);
  review.settle.timer = null;
  review.settle.deadline = null;
}
function finishTaps() {
  clearSettle();
  if (review.mode !== 'tap' || !review.bmp || review.taps.length < tapsNeeded()) return;
  {
    if (review.shape === 'ellipse') {
      const e = fitEllipse(review.taps);
      if (!e) {
        review.taps.pop();
        toast('Couldn’t fit that — spread the taps right around the rim', 3000);
        updateTapPrompt();
        drawReview();
        return;
      }
      review.ellipse = e;
      review.mode = 'adjust';
      toast('Edge set ✓ — Save deskews it round, or tap ○ Circle for a plain crop');
    } else if (review.shape === 'circle') {
      const c0 = circleFrom3(review.taps[0], review.taps[1], review.taps[2]);
      if (!c0) {                       // three points in a line make no circle
        review.taps.pop();
        toast('Those points line up — tap 3 spots spread around the edge', 3000);
        updateTapPrompt();
        drawReview();
        return;
      }
      review.circle = { cx: c0.cx, cy: c0.cy, r: Math.max(24, c0.r) };
      review.mode = 'adjust';
      toast('Circle set ✓ — drag to move, drag the edge to resize');
    } else {
      review.quad = orderQuad(review.taps);
      review.mode = 'adjust';
      review.shape = 'quad';
      updateShapeBtn();
      toast('Corners set ✓ — drag any corner to fine-tune, then Save');
    }
  }
  updateTapPrompt();
  drawReview();
}
function updateTapPrompt() {
  // no Save while the on-device crop is still running: it would keep and log a
  // default inset frame nobody chose
  $('#btnSave').disabled = review.mode === 'ai';
  const prompt = $('#tapPrompt');
  const sh = review.shape;
  if (sh !== 'quad' && sh !== 'circle' && sh !== 'ellipse') { prompt.classList.add('hidden'); return; }
  prompt.classList.remove('hidden');
  const tapping = review.mode === 'tap';
  prompt.classList.toggle('tapping', tapping);   // drives the attention pulse
  const need = tapsNeeded();
  const n = tapping ? review.taps.length : need;
  let pips = '';
  for (let i = 0; i < need; i++) pips += `<i class="${i < n ? 'on' : ''}"></i>`;
  $('#tapPips').innerHTML = pips;
  const round = sh === 'ellipse' || sh === 'circle';
  if (tapping && review.settle) {
    const dl = review.settle.deadline;
    $('#tapMsg').textContent = dl
      ? `Drag a marker to adjust — accepting in ${Math.max(1, Math.ceil((dl - Date.now()) / 1000))}…`
      : 'Adjusting — let go to set it';
  } else if (tapping) {
    const left = need - review.taps.length;
    if (review.taps.length) {
      $('#tapMsg').textContent = round
        ? `Tap the next edge point — ${left} to go`
        : `Tap the next corner — ${left} to go`;
    } else {
      $('#tapMsg').textContent = sh === 'ellipse' ? '👆 Tap 5 points around the edge'
        : sh === 'circle' ? '👆 Tap 3 points around the edge'
        : '👆 Tap the 4 corners of the sleeve';
    }
  } else {
    $('#tapMsg').textContent = sh === 'ellipse' ? 'Drag to fit the rim, then Save (deskews round) — or ○ Circle'
      : sh === 'circle' ? 'Drag to move, drag the edge to resize'
      : 'Drag a corner to fine-tune';
  }
  $('#btnUndo').textContent = tapping ? '↶ Undo' : '⟲ Retap';
}
function layoutReview() {
  if (!review.bmp) return;
  const wrap = $('#reviewWrap');
  const cw = wrap.clientWidth || window.innerWidth || 360;
  const ch = wrap.clientHeight || Math.max(200, (window.innerHeight || 700) - 130);
  const bw = review.bmp.width, bh = review.bmp.height;
  const sc = Math.min(cw / bw, ch / bh);
  review.scale = sc;
  review.dpr = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = $('#reviewCanvas');
  canvas.width = Math.max(1, Math.round(bw * sc * review.dpr));
  canvas.height = Math.max(1, Math.round(bh * sc * review.dpr));
  canvas.style.width = Math.round(bw * sc) + 'px';
  canvas.style.height = Math.round(bh * sc) + 'px';
  drawReview();
}
window.addEventListener('resize', () => {
  if ($('#scr-review').classList.contains('active')) layoutReview();
});
function fullQuad() {
  const w = review.bmp.width, h = review.bmp.height;
  return [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];
}
function defaultQuad() {
  const w = review.bmp.width, h = review.bmp.height, m = 0.05;
  return [{ x: w * m, y: h * m }, { x: w * (1 - m), y: h * m },
          { x: w * (1 - m), y: h * (1 - m) }, { x: w * m, y: h * (1 - m) }];
}
function fullCircle() {
  const w = review.bmp.width, h = review.bmp.height;
  return { cx: w / 2, cy: h / 2, r: Math.min(w, h) / 2 };
}
/* quad edges, in corner order TL,TR,BR,BL: top, right, bottom, left */
const EDGES = [[0, 1], [1, 2], [2, 3], [3, 0]];
function edgeMid(q, i) {
  const [a, b] = EDGES[i];
  return { x: (q[a].x + q[b].x) / 2, y: (q[a].y + q[b].y) / 2 };
}
function edgeNormal(q, i) {
  const [a, b] = EDGES[i];
  const dx = q[b].x - q[a].x, dy = q[b].y - q[a].y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dy / len, y: -dx / len };
}
function pointInQuad(x, y, q) {
  let inside = false;
  for (let i = 0, j = 3; i < 4; j = i++) {
    const a = q[i], b = q[j];
    if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
// how far the given points may slide along n before one leaves the image
function slideLimits(pts, n) {
  const w = review.bmp.width, h = review.bmp.height;
  let lo = -Infinity, hi = Infinity;
  for (const p of pts) {
    for (const [v, c, max] of [[p.x, n.x, w], [p.y, n.y, h]]) {
      if (Math.abs(c) < 1e-6) continue;
      const t0 = (0 - v) / c, t1 = (max - v) / c;
      lo = Math.max(lo, Math.min(t0, t1));
      hi = Math.min(hi, Math.max(t0, t1));
    }
  }
  return [lo, hi];
}
function defaultCircle() {
  const w = review.bmp.width, h = review.bmp.height;
  return { cx: w / 2, cy: h / 2, r: 0.44 * Math.min(w, h) };
}
async function autoDetect() {
  clearSettle();
  if (!review.bmp) return;
  const bmp = review.bmp;
  review.autoSeeded = false;   // the frame below replaces any on-device proposal
  if (curShot.type === 'matrix') {
    review.quad = fullQuad();
    drawReview();
    toast('Full frame kept for the run-out — drag an edge or corner, the crop stays rectangular');
    return;
  }
  if (curShot.type === 'label') {
    const sc2 = Math.min(1, 560 / Math.max(bmp.width, bmp.height));
    const sw2 = Math.max(2, Math.round(bmp.width * sc2));
    const sh2 = Math.max(2, Math.round(bmp.height * sc2));
    const c2 = document.createElement('canvas');
    c2.width = sw2; c2.height = sh2;
    const cx2 = c2.getContext('2d', { willReadFrequently: true });
    cx2.drawImage(bmp, 0, 0, sw2, sh2);
    let circ = null;
    try { circ = Detect.detectCircle(cx2.getImageData(0, 0, sw2, sh2)); } catch (e) { console.error(e); }
    freeCanvas(c2);
    review.shape = 'circle';   // "○ Circle" = plain circle crop, no deskew
    if (circ) {
      review.circle = { cx: circ.cx / sc2, cy: circ.cy / sc2, r: circ.r / sc2 };
      toast('Circle detected ✓ — drag to move, drag the edge to resize');
    } else {
      review.circle = defaultCircle();
      toast('Couldn’t find the circle — drag it into place');
    }
    review.mode = 'adjust';
    updateTapPrompt();
    drawReview();
    return;
  }
  const maxSide = 560;
  const sc = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const sw = Math.max(2, Math.round(bmp.width * sc));
  const sh = Math.max(2, Math.round(bmp.height * sc));
  const c = document.createElement('canvas');
  c.width = sw; c.height = sh;
  const cx = c.getContext('2d', { willReadFrequently: true });
  cx.drawImage(bmp, 0, 0, sw, sh);
  let q = null;
  try { q = Detect.detect(cx.getImageData(0, 0, sw, sh)); } catch (e) { console.error(e); }
  freeCanvas(c);
  if (q) {
    review.quad = q.map(p => ({ x: p.x / sc, y: p.y / sc }));
    toast('Outline detected ✓ — drag corners or edges to fine-tune');
  } else {
    review.quad = defaultQuad();
    toast('Couldn’t find the outline — drag the edges and corners to fit');
  }
  review.mode = 'adjust';
  updateTapPrompt();
  drawReview();
}
const MIN_CROP = 24;   // image px: a crop never collapses past this
function updateShapeBtn() {
  $('#btnShape').textContent = review.shape === 'rect' ? '◇ Skew' : '▭ Rect';
}
function quadBounds(q) {
  const xs = q.map(p => p.x), ys = q.map(p => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  return [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
}
/* strict rectangle: a corner carries its two neighbours, so the frame stays square-on */
function setRectCorner(i, px, py) {
  const q = review.quad;
  const x0 = q[0].x, x1 = q[1].x, y0 = q[0].y, y1 = q[2].y;
  let x, y;
  if (i === 0)      { x = Math.min(px, x1 - MIN_CROP); y = Math.min(py, y1 - MIN_CROP); q[0] = { x, y }; q[1] = { x: x1, y }; q[3] = { x, y: y1 }; }
  else if (i === 1) { x = Math.max(px, x0 + MIN_CROP); y = Math.min(py, y1 - MIN_CROP); q[1] = { x, y }; q[0] = { x: x0, y }; q[2] = { x, y: y1 }; }
  else if (i === 2) { x = Math.max(px, x0 + MIN_CROP); y = Math.max(py, y0 + MIN_CROP); q[2] = { x, y }; q[1] = { x, y: y0 }; q[3] = { x: x0, y }; }
  else              { x = Math.min(px, x1 - MIN_CROP); y = Math.max(py, y0 + MIN_CROP); q[3] = { x, y }; q[0] = { x, y: y0 }; q[2] = { x: x1, y }; }
  return { x, y };
}
// how far an edge may slide along n before it closes on the opposite edge
function oppositeLimits(q, i, ref, n) {
  const [c, d] = EDGES[(i + 2) % 4];
  let lo = -Infinity, hi = Infinity;
  for (const o of [q[c], q[d]]) {
    const so = (o.x - ref.x) * n.x + (o.y - ref.y) * n.y;
    if (so > 0) hi = Math.min(hi, so - MIN_CROP);
    else lo = Math.max(lo, so + MIN_CROP);
  }
  return [lo, hi];
}
function ringPoint(c0, px, py) {
  const d = Math.hypot(px - c0.cx, py - c0.cy) || 1;
  return { x: c0.cx + (px - c0.cx) / d * c0.r, y: c0.cy + (py - c0.cy) / d * c0.r };
}
function closestOnSeg(px, py, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (!len2) return { x: a.x, y: a.y };
  let t = ((px - a.x) * dx + (py - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return { x: a.x + dx * t, y: a.y + dy * t };
}
/* magnifier shown while a handle is being dragged — the fingertip covers
   exactly the pixels you are trying to line the crop up against */
const LOUPE_ZOOM = 3;
function drawLoupe(ctx, canvas) {
  const L = review.loupe;
  if (!L) return;
  const dpr = review.dpr;
  const s = review.scale * dpr;
  const R = Math.min(58 * dpr, canvas.width / 4, canvas.height / 4);
  const pad = 10 * dpr;
  // pin to whichever top corner is farther from the finger
  const fx = L.x * s, fy = L.y * s;
  const left = { x: pad + R, y: pad + R };
  const right = { x: canvas.width - pad - R, y: pad + R };
  const c = Math.hypot(fx - left.x, fy - left.y) > Math.hypot(fx - right.x, fy - right.y) ? left : right;
  const k = s * LOUPE_ZOOM;
  ctx.save();
  ctx.beginPath();
  ctx.arc(c.x, c.y, R, 0, Math.PI * 2);
  ctx.fillStyle = '#0d0d0d';
  ctx.fill();
  ctx.clip();
  ctx.setTransform(k, 0, 0, k, c.x - L.x * k, c.y - L.y * k);
  ctx.drawImage(review.bmp, 0, 0);
  ctx.lineWidth = 1.5 * dpr / k;
  ctx.strokeStyle = '#f0a832';
  ctx.beginPath();
  if (review.shape === 'circle' && review.circle) {
    const c0 = review.circle;
    ctx.arc(c0.cx, c0.cy, c0.r, 0, Math.PI * 2);
  } else if (review.quad) {
    const q = review.quad;
    ctx.moveTo(q[0].x, q[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(q[i].x, q[i].y);
    ctx.closePath();
  }
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // crosshair drawn in two passes — a dark halo under an amber core — so it
  // stays visible over white sleeves as well as dark runouts; long reticle
  // (most of the loupe) so the exact aim point is easy to read
  const cross = R * 0.72;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(c.x - cross, c.y); ctx.lineTo(c.x + cross, c.y);
  ctx.moveTo(c.x, c.y - cross); ctx.lineTo(c.x, c.y + cross);
  ctx.strokeStyle = 'rgba(0,0,0,.75)';
  ctx.lineWidth = 4 * dpr;
  ctx.stroke();
  ctx.strokeStyle = '#f0a832';
  ctx.lineWidth = 1.75 * dpr;
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.arc(c.x, c.y, R, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.lineWidth = 4 * dpr;
  ctx.stroke();
  ctx.strokeStyle = '#f0a832';
  ctx.lineWidth = 2 * dpr;
  ctx.stroke();
  ctx.restore();
}
function fillPill(ctx, w, h, fill) {
  const r = h / 2;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(-w / 2, -h / 2, w, h, r);
  } else {
    ctx.moveTo(-w / 2 + r, -h / 2);
    ctx.arcTo(w / 2, -h / 2, w / 2, h / 2, r);
    ctx.arcTo(w / 2, h / 2, -w / 2, h / 2, r);
    ctx.arcTo(-w / 2, h / 2, -w / 2, -h / 2, r);
    ctx.arcTo(-w / 2, -h / 2, w / 2, -h / 2, r);
    ctx.closePath();
  }
  ctx.fillStyle = fill;
  ctx.fill();
}
function drawTapSeeds(ctx) {
  const s = review.scale * review.dpr, dpr = review.dpr, taps = review.taps;
  if (taps.length > 1) {
    ctx.beginPath();
    ctx.moveTo(taps[0].x * s, taps[0].y * s);
    for (let i = 1; i < taps.length; i++) ctx.lineTo(taps[i].x * s, taps[i].y * s);
    ctx.strokeStyle = 'rgba(240,168,50,.5)';
    ctx.lineWidth = 1.5 * dpr;
    ctx.setLineDash([6 * dpr, 5 * dpr]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  taps.forEach((p, i) => {
    ctx.beginPath();
    ctx.arc(p.x * s, p.y * s, 9 * dpr, 0, 7);
    ctx.fillStyle = '#f0a832';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.lineWidth = 2 * dpr;
    ctx.stroke();
    ctx.fillStyle = '#191204';
    ctx.font = `${11 * dpr}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), p.x * s, p.y * s);
  });
  const a = review.tapActive;
  if (a) {
    ctx.beginPath();
    ctx.arc(a.x * s, a.y * s, 11 * dpr, 0, 7);
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.lineWidth = 4.5 * dpr;
    ctx.stroke();
    ctx.strokeStyle = '#f0a832';
    ctx.lineWidth = 2 * dpr;
    ctx.stroke();
  }
}
function drawReview() {
  const canvas = $('#reviewCanvas');
  if (!review.bmp || !canvas.width) return;
  const ctx = canvas.getContext('2d');
  const s = review.scale * review.dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(review.bmp, 0, 0, canvas.width, canvas.height);
  if (review.mode === 'tap') {
    drawTapSeeds(ctx);
    drawLoupe(ctx, canvas);
    return;
  }
  if (review.shape === 'ellipse') {
    const e = review.ellipse;
    if (!e) return;
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.ellipse(e.cx * s, e.cy * s, e.ax * s, e.ay * s, e.theta, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fill('evenodd');
    ctx.beginPath();
    ctx.ellipse(e.cx * s, e.cy * s, e.ax * s, e.ay * s, e.theta, 0, Math.PI * 2);
    ctx.strokeStyle = '#f0a832';
    ctx.lineWidth = 2 * review.dpr;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(e.cx * s, e.cy * s, 4.5 * review.dpr, 0, 7);
    ctx.fillStyle = '#f0a832';
    ctx.fill();
    const ct = Math.cos(e.theta), st = Math.sin(e.theta);
    const hs = [
      [e.cx + e.ax * ct, e.cy + e.ax * st], [e.cx - e.ax * ct, e.cy - e.ax * st],
      [e.cx - e.ay * st, e.cy + e.ay * ct], [e.cx + e.ay * st, e.cy - e.ay * ct],
    ];
    for (const [hx, hy] of hs) {
      ctx.beginPath(); ctx.arc(hx * s, hy * s, 9 * review.dpr, 0, 7);
      ctx.fillStyle = 'rgba(240,168,50,.55)'; ctx.fill();
      ctx.beginPath(); ctx.arc(hx * s, hy * s, 4 * review.dpr, 0, 7);
      ctx.fillStyle = '#f0a832'; ctx.fill();
    }
    drawLoupe(ctx, canvas);
    return;
  }
  if (review.shape === 'circle') {
    const c0 = review.circle;
    if (!c0) return;
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.arc(c0.cx * s, c0.cy * s, c0.r * s, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fill('evenodd');
    ctx.beginPath();
    ctx.arc(c0.cx * s, c0.cy * s, c0.r * s, 0, Math.PI * 2);
    ctx.strokeStyle = '#f0a832';
    ctx.lineWidth = 2 * review.dpr;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(c0.cx * s, c0.cy * s, 4.5 * review.dpr, 0, 7);
    ctx.fillStyle = '#f0a832';
    ctx.fill();
    const hs = [[c0.cx, c0.cy - c0.r], [c0.cx + c0.r, c0.cy], [c0.cx, c0.cy + c0.r], [c0.cx - c0.r, c0.cy]];
    for (const [hx, hy] of hs) {
      ctx.beginPath(); ctx.arc(hx * s, hy * s, 9 * review.dpr, 0, 7);
      ctx.fillStyle = 'rgba(240,168,50,.55)'; ctx.fill();
      ctx.beginPath(); ctx.arc(hx * s, hy * s, 4 * review.dpr, 0, 7);
      ctx.fillStyle = '#f0a832'; ctx.fill();
    }
    drawLoupe(ctx, canvas);
    return;
  }
  const q = review.quad;
  if (!q) return;
  ctx.beginPath();
  ctx.rect(0, 0, canvas.width, canvas.height);
  ctx.moveTo(q[0].x * s, q[0].y * s);
  for (let i = 3; i >= 1; i--) ctx.lineTo(q[i].x * s, q[i].y * s);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  ctx.fill('evenodd');
  ctx.beginPath();
  ctx.moveTo(q[0].x * s, q[0].y * s);
  for (let i = 1; i < 4; i++) ctx.lineTo(q[i].x * s, q[i].y * s);
  ctx.closePath();
  ctx.strokeStyle = '#f0a832';
  ctx.lineWidth = 2 * review.dpr;
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const m = edgeMid(q, i), [a, b] = EDGES[i];
    ctx.save();
    ctx.translate(m.x * s, m.y * s);
    ctx.rotate(Math.atan2(q[b].y - q[a].y, q[b].x - q[a].x));
    fillPill(ctx, 34 * review.dpr, 17 * review.dpr, 'rgba(240,168,50,.35)');
    fillPill(ctx, 26 * review.dpr, 7 * review.dpr, '#f0a832');
    ctx.restore();
  }
  for (const p of q) {
    ctx.beginPath();
    ctx.arc(p.x * s, p.y * s, 11 * review.dpr, 0, 7);
    ctx.fillStyle = 'rgba(240,168,50,.55)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x * s, p.y * s, 4.5 * review.dpr, 0, 7);
    ctx.fillStyle = '#f0a832';
    ctx.fill();
  }
  drawLoupe(ctx, canvas);
}
const rc = $('#reviewCanvas');
rc.addEventListener('pointerdown', e => {
  const r = rc.getBoundingClientRect();
  const px = (e.clientX - r.left) / review.scale;
  const py = (e.clientY - r.top) / review.scale;
  if (review.mode === 'tap') {
    if (!review.bmp) return;
    const w = review.bmp.width, h = review.bmp.height;
    if (review.settle) {
      // the taps are complete: a press near a numbered marker picks it up,
      // anywhere else is ignored (no sixth point)
      let best = -1, bd = Infinity;
      review.taps.forEach((t, i) => { const d = Math.hypot(t.x - px, t.y - py); if (d < bd) { bd = d; best = i; } });
      if (best < 0 || bd * review.scale > 36) return;
      holdSettle();
      review.dragTap = best;
    } else if (review.taps.length >= tapsNeeded()) return;
    review.tapActive = { x: Math.max(0, Math.min(w, px)), y: Math.max(0, Math.min(h, py)) };
    review.loupe = review.tapActive;
    if (review.dragTap != null) review.taps[review.dragTap] = review.tapActive;
    rc.setPointerCapture(e.pointerId);
    e.preventDefault();
    drawReview();
    return;
  }
  if (review.shape === 'ellipse') {
    const el = review.ellipse;
    if (!el) return;
    const nd = ellipseNormDist(el, px, py);
    if (nd > 1.3) return;
    if (nd > 0.7) {
      review.dragging = { kind: 'e-resize', ax0: el.ax, ay0: el.ay, nd0: Math.max(0.3, nd) };
      review.loupe = { x: px, y: py };
    } else {
      review.dragging = { kind: 'e-move', sx: px, sy: py, cx0: el.cx, cy0: el.cy };
      review.loupe = null;
    }
    rc.setPointerCapture(e.pointerId);
    e.preventDefault();
    drawReview();
    return;
  }
  if (review.shape === 'circle') {
    const c0 = review.circle;
    if (!c0) return;
    const d = Math.hypot(px - c0.cx, py - c0.cy);
    const tol = 44 / review.scale;
    if (Math.abs(d - c0.r) <= tol) review.dragging = 'resize';
    else if (d < c0.r) review.dragging = 'move';
    else return;
    review.loupe = review.dragging === 'resize' ? ringPoint(c0, px, py) : null;
    rc.setPointerCapture(e.pointerId);
    e.preventDefault();
    drawReview();
    return;
  }
  const q = review.quad;
  if (!q) return;
  let best = -1, bd = Infinity;
  q.forEach((p, i) => {
    const d = Math.hypot(p.x - px, p.y - py);
    if (d < bd) { bd = d; best = i; }
  });
  if (bd * review.scale <= 40) {
    review.dragging = { kind: 'corner', i: best };
    review.loupe = { x: q[best].x, y: q[best].y };
  } else {
    let ei = -1, ed = Infinity;
    for (let i = 0; i < 4; i++) {
      const m = edgeMid(q, i);
      const d = Math.hypot(m.x - px, m.y - py);
      if (d < ed) { ed = d; ei = i; }
    }
    if (ed * review.scale <= 38) {
      const [a, b] = EDGES[ei];
      review.dragging = {
        kind: 'edge', i: ei, n: edgeNormal(q, ei),
        p0: { x: q[a].x, y: q[a].y }, p1: { x: q[b].x, y: q[b].y }, sx: px, sy: py,
      };
      review.loupe = closestOnSeg(px, py, q[a], q[b]);
    } else if (pointInQuad(px, py, q)) {
      review.dragging = { kind: 'move', quad0: q.map(p => ({ x: p.x, y: p.y })), sx: px, sy: py };
      review.loupe = null;
    } else return;
  }
  rc.setPointerCapture(e.pointerId);
  e.preventDefault();
  drawReview();
});
rc.addEventListener('pointermove', e => {
  if (review.mode === 'tap') {
    if (!review.tapActive || !review.bmp) return;
    const r = rc.getBoundingClientRect();
    const w = review.bmp.width, h = review.bmp.height;
    review.tapActive = {
      x: Math.max(0, Math.min(w, (e.clientX - r.left) / review.scale)),
      y: Math.max(0, Math.min(h, (e.clientY - r.top) / review.scale)),
    };
    review.loupe = review.tapActive;
    if (review.dragTap != null) review.taps[review.dragTap] = review.tapActive;
    drawReview();
    return;
  }
  if (!review.dragging || !review.bmp) return;
  const r = rc.getBoundingClientRect();
  const w = review.bmp.width, h = review.bmp.height;
  const px = Math.max(0, Math.min(w, (e.clientX - r.left) / review.scale));
  const py = Math.max(0, Math.min(h, (e.clientY - r.top) / review.scale));
  if (review.shape === 'ellipse') {
    const el = review.ellipse, d = review.dragging;
    if (!el || !d) return;
    if (d.kind === 'e-move') {
      el.cx = d.cx0 + (px - d.sx); el.cy = d.cy0 + (py - d.sy);
      review.loupe = null;
    } else {
      const nd = ellipseNormDist({ cx: el.cx, cy: el.cy, ax: d.ax0, ay: d.ay0, theta: el.theta }, px, py);
      const k = Math.max(0.2, nd / d.nd0);
      el.ax = Math.max(8, d.ax0 * k);
      el.ay = Math.max(8, d.ay0 * k);
      review.loupe = { x: px, y: py };
    }
    drawReview();
    return;
  }
  if (review.shape === 'circle') {
    const c0 = review.circle;
    if (!c0) return;
    if (review.dragging === 'move') { c0.cx = px; c0.cy = py; }
    else if (review.dragging === 'resize') {
      c0.r = Math.max(24, Math.hypot(px - c0.cx, py - c0.cy));
      review.loupe = ringPoint(c0, px, py);
    }
  } else if (review.quad) {
    const d = review.dragging;
    if (d.kind === 'corner') {
      review.loupe = review.shape === 'rect'
        ? setRectCorner(d.i, px, py)
        : (review.quad[d.i] = { x: px, y: py });
    } else if (d.kind === 'edge') {
      const [a, b] = EDGES[d.i];
      const [bLo, bHi] = slideLimits([d.p0, d.p1], d.n);
      const [oLo, oHi] = oppositeLimits(review.quad, d.i, d.p0, d.n);
      const lo = Math.max(bLo, oLo), hi = Math.max(lo, Math.min(bHi, oHi));
      const t = Math.max(lo, Math.min(hi, (px - d.sx) * d.n.x + (py - d.sy) * d.n.y));
      review.quad[a] = { x: d.p0.x + d.n.x * t, y: d.p0.y + d.n.y * t };
      review.quad[b] = { x: d.p1.x + d.n.x * t, y: d.p1.y + d.n.y * t };
      review.loupe = closestOnSeg(px, py, review.quad[a], review.quad[b]);
    } else if (d.kind === 'move') {
      const xs = d.quad0.map(p => p.x), ys = d.quad0.map(p => p.y);
      const dx = Math.max(-Math.min(...xs), Math.min(w - Math.max(...xs), px - d.sx));
      const dy = Math.max(-Math.min(...ys), Math.min(h - Math.max(...ys), py - d.sy));
      review.quad = d.quad0.map(p => ({ x: p.x + dx, y: p.y + dy }));
    }
  }
  drawReview();
});
function endDrag() {
  if (review.mode === 'tap') {
    if (review.dragTap != null) {
      if (review.tapActive) review.taps[review.dragTap] = review.tapActive;
      review.dragTap = null;
      review.tapActive = null;
      review.loupe = null;
      startSettle();   // 3 s from this adjustment
      return;
    }
    if (review.tapActive) commitTap(review.tapActive);
    return;
  }
  if (!review.dragging && !review.loupe) return;
  review.dragging = null;
  review.loupe = null;
  drawReview();
}
function cancelDrag() {
  if (review.mode === 'tap') {
    if (review.dragTap != null) { endDrag(); return; }
    review.tapActive = null;
    review.loupe = null;
    drawReview();
    return;
  }
  endDrag();
}
rc.addEventListener('pointerup', endDrag);
rc.addEventListener('pointercancel', cancelDrag);

$('#btnAuto').onclick = autoDetect;
$('#btnUndo').onclick = () => {
  if (review.mode === 'tap') {
    clearSettle();
    if (review.taps.length) review.taps.pop();
    review.tapActive = null;
    review.loupe = null;
    updateTapPrompt();
    drawReview();
  } else if (review.shape === 'quad' || review.shape === 'circle' || review.shape === 'ellipse') {
    enterTapMode();   // "Retap" — start the taps over
  }
};
$('#btnShape').onclick = () => {
  if (review.shape === 'circle' || !review.quad) return;
  if (review.shape === 'rect') {
    review.shape = 'quad';
    toast('Free crop — corners move on their own, the photo is straightened on save');
  } else {
    review.shape = 'rect';
    review.quad = quadBounds(review.quad);
    toast('Rectangle crop — the frame stays square-on');
  }
  updateShapeBtn();
  drawReview();
};
$('#btnFull').onclick = () => {
  if (review.shape === 'ellipse' || review.shape === 'circle') { review.shape = 'circle'; review.circle = fullCircle(); }
  else review.quad = fullQuad();
  review.autoSeeded = false;
  if (review.mode === 'tap' || review.mode === 'ai') { clearSettle(); review.mode = 'adjust'; }
  updateTapPrompt();
  drawReview();
};
$('#btnRotate').onclick = () => {
  review.rot = (review.rot + 1) % 4;
  $('#btnRotate').textContent = `⟳ ${review.rot * 90}°`;
};
$('#btnRetake').onclick = () => openCamera(curShot, curSlot);
$('#btnSave').onclick = saveShot;

function isAxisRect(q) {
  const e = 2;
  return Math.abs(q[0].x - q[3].x) < e && Math.abs(q[1].x - q[2].x) < e &&
         Math.abs(q[0].y - q[1].y) < e && Math.abs(q[2].y - q[3].y) < e;
}
// Straighten a skewed outline into an ow x oh canvas. The warp reads pixels
// out of the photo, and reading the WHOLE photo held two more full-size copies
// of it (a canvas and its pixels, ~50 MB each at 12 MP) for every skewed cover.
// Only the outline's own rectangle is read now, at full resolution, so the
// output is the same to the pixel (pinned by tests/app-save.js in the script
// repo). The 2 px margin covers the bilinear sampler's second pixel; a side
// that reaches the photo's edge stops there, where the warp clamps anyway.
function warpQuad(src, q, ow, oh) {
  const W = src.width, H = src.height;
  const xs = q.map(p => p.x), ys = q.map(p => p.y);
  const x0 = Math.min(W - 1, Math.max(0, Math.floor(Math.min(...xs)) - 2));
  const y0 = Math.min(H - 1, Math.max(0, Math.floor(Math.min(...ys)) - 2));
  const x1 = Math.max(x0 + 1, Math.min(W, Math.ceil(Math.max(...xs)) + 2));
  const y1 = Math.max(y0 + 1, Math.min(H, Math.ceil(Math.max(...ys)) + 2));
  const sc = document.createElement('canvas');
  sc.width = x1 - x0; sc.height = y1 - y0;
  let srcData;
  try {
    const sctx = sc.getContext('2d', { willReadFrequently: true });
    sctx.drawImage(src, x0, y0, sc.width, sc.height, 0, 0, sc.width, sc.height);
    srcData = sctx.getImageData(0, 0, sc.width, sc.height);
  } finally { freeCanvas(sc); }
  const outData = Detect.warp(srcData, q, ow, oh, x0, y0);
  const out = document.createElement('canvas');
  out.width = ow; out.height = oh;
  out.getContext('2d').putImageData(outData, 0, 0);
  return out;
}
function rotateCanvas(c, rot) {
  const r90 = rot % 2 === 1;
  const out = document.createElement('canvas');
  out.width = r90 ? c.height : c.width;
  out.height = r90 ? c.width : c.height;
  const ctx = out.getContext('2d');
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate(rot * Math.PI / 2);
  ctx.drawImage(c, -c.width / 2, -c.height / 2);
  return out;
}

/* ---------- auto-level to the true horizontal plane ----------
 * The crop shapes get you the right region but not the right ROTATION: the
 * ellipse deskew leans on the fitted major-axis angle, which is meaningless
 * for a head-on (near-circular) label, and covers keep whatever hand tilt the
 * shot had. autoLevelAngle reads the dominant direction of the straight
 * structure in the crop - the centre text on a label, the edges/text on a
 * cover - and returns how many degrees it is tilted from level. fineLevel then
 * rotates the crop to straighten it. A plain disc has no such structure, so
 * the confidence gate returns 0 and it is never spun blindly. */

// Degrees the dominant straight structure is tilted from level (+ve = clockwise
// on screen). 0 when there is no confident direction. For circular crops only
// the central disc is read, so a label's curved rim text never competes with
// its straight centre text.
function autoLevelAngle(srcCanvas, circular) {
  const MAX = 320;
  const scale = Math.min(1, MAX / Math.max(srcCanvas.width, srcCanvas.height));
  const w = Math.max(8, Math.round(srcCanvas.width * scale));
  const h = Math.max(8, Math.round(srcCanvas.height * scale));
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const cx0 = cv.getContext('2d', { willReadFrequently: true });
  cx0.drawImage(srcCanvas, 0, 0, w, h);
  const d = cx0.getImageData(0, 0, w, h).data;
  freeCanvas(cv);
  const g = new Float32Array(w * h);
  for (let i = 0, p = 0; i < g.length; i++, p += 4) g[i] = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
  const cx = w / 2, cy = h / 2, rIn = circular ? 0.6 * Math.min(w, h) / 2 : 0, rIn2 = rIn * rIn;
  const BINS = 180;                       // 0.5° resolution across ±45°
  const hist = new Float32Array(BINS);
  let total = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (circular) { const dx = x - cx, dy = y - cy; if (dx * dx + dy * dy > rIn2) continue; }
      const i = y * w + x;
      const gx = (g[i - w + 1] + 2 * g[i + 1] + g[i + w + 1]) - (g[i - w - 1] + 2 * g[i - 1] + g[i + w - 1]);
      const gy = (g[i + w - 1] + 2 * g[i + w] + g[i + w + 1]) - (g[i - w - 1] + 2 * g[i - w] + g[i - w + 1]);
      const mag = Math.abs(gx) + Math.abs(gy);
      if (mag < 24) continue;
      let a = Math.atan2(gy, gx) * 180 / Math.PI;   // gradient angle
      let dev = ((a % 90) + 90) % 90;               // fold to [0,90): grid edges sit at the same value
      if (dev >= 45) dev -= 90;                      // → [-45,45)
      let b = Math.floor((dev + 45) / 90 * BINS);
      if (b < 0) b = 0; else if (b >= BINS) b = BINS - 1;
      hist[b] += mag; total += mag;
    }
  }
  if (total < 500) return 0;
  const sm = new Float32Array(BINS);
  for (let b = 0; b < BINS; b++) sm[b] = 0.25 * hist[(b - 1 + BINS) % BINS] + 0.5 * hist[b] + 0.25 * hist[(b + 1) % BINS];
  let peak = 0, peakVal = -1;
  for (let b = 0; b < BINS; b++) if (sm[b] > peakVal) { peakVal = sm[b]; peak = b; }
  if (peakVal < 3 * (total / BINS)) return 0;      // no dominant direction (e.g. a plain disc)
  const l = sm[(peak - 1 + BINS) % BINS], r = sm[(peak + 1) % BINS], den = l - 2 * peakVal + r;
  const off = den !== 0 ? 0.5 * (l - r) / den : 0;  // parabolic sub-bin refine
  const deg = ((peak + off) / BINS) * 90 - 45;
  if (!isFinite(deg) || Math.abs(deg) > 25) return 0; // ignore wild corrections; coarse tilt stays manual
  return deg;
}

// Largest axis-aligned rectangle inside a w×h rectangle rotated by a (radians).
function fitRect_(w, h, a) {
  if (a <= 0) return { w, h };
  const s = Math.sin(a), c = Math.cos(a);
  const long = Math.max(w, h), short = Math.min(w, h);
  if (short <= 2 * s * c * long || Math.abs(s - c) < 1e-9) {
    const x = 0.5 * short;
    return w >= h ? { w: x / s, h: x / c } : { w: x / c, h: x / s };
  }
  const cos2 = c * c - s * s;
  return { w: (w * c - h * s) / cos2, h: (h * c - w * s) / cos2 };
}

// Rotate a crop by -deg to level it. Circular crops rotate in place (the disc
// stays inside the square); rectangular crops over-scan just enough to fill the
// frame with no white corners, keeping the original aspect.
function fineLevel(src, deg, circular) {
  const rad = -deg * Math.PI / 180;
  const w = src.width, h = src.height;
  const out = document.createElement('canvas'); out.width = w; out.height = h;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  if (circular) {
    ctx.translate(w / 2, h / 2); ctx.rotate(rad); ctx.drawImage(src, -w / 2, -h / 2);
    return out;
  }
  const fr = fitRect_(w, h, Math.abs(rad));
  const k = Math.max(w / fr.w, h / fr.h);          // over-scan so the leveled rect fills the frame
  ctx.translate(w / 2, h / 2); ctx.rotate(rad); ctx.scale(k, k); ctx.drawImage(src, -w / 2, -h / 2);
  return out;
}
// Queue one crop training example: the ORIGINAL (uncropped) photo + the crop
// geometry you set, in the logged image's own pixels. Non-fatal on any error.
// In two halves since 7 Oct 2026: logCropTake draws the photo small and notes
// the outline at once, while the review still holds them, so the full-size
// photo can be released the moment the save is done; logCropKeep encodes and
// stores the copy afterwards, never in the way of the save. Before, the whole
// example was made in the middle of every save - when crop training was turned
// on for every phone (3 Oct), a phone that had managed about ten albums before
// a restart managed about two.
function logCropTake() {
  let c = null;
  try {
    if (!settings.logCrops || !settings.cropNotice || !review.bmp) return null;   // nothing kept before the notice
    const bmp = review.bmp;
    const maxL = 1280;
    const sc = Math.min(1, maxL / Math.max(bmp.width, bmp.height));
    const w = Math.max(2, Math.round(bmp.width * sc)), h = Math.max(2, Math.round(bmp.height * sc));
    const r1 = v => Math.round(v * sc * 10) / 10;
    let geomData;
    if (review.shape === 'ellipse' && review.ellipse) {
      const e = review.ellipse;
      geomData = { cx: r1(e.cx), cy: r1(e.cy), ax: r1(e.ax), ay: r1(e.ay), theta: Math.round(e.theta * 1e4) / 1e4 };
    } else if (review.shape === 'circle' && review.circle) {
      const c0 = review.circle;
      geomData = { cx: r1(c0.cx), cy: r1(c0.cy), r: r1(c0.r) };
    } else if (review.quad) {
      geomData = review.quad.map(p => [r1(p.x), r1(p.y)]);
    } else return null;
    const id = 'crop_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const geom = {
      id, when: new Date().toISOString(), app: APP_VERSION,
      shot: curShot ? { id: curShot.id, type: curShot.type } : null,   // a shot's name may be one the collector typed
      // the album's id only (to keep one album's shots together in a split):
      // the training reads no artist or title, so none is copied out
      album: curAlbum ? { id: curAlbum.id } : null,
      image: { w, h }, shape: review.shape, rot: review.rot || 0,
      source: review.autoSeeded ? 'auto+manual' : 'manual', geom: geomData,
    };
    c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(bmp, 0, 0, w, h);
    const taken = { id, geom, c };
    c = null;
    return taken;
  } catch (e) {
    console.error('crop log', e);
    freeCanvas(c);
    return null;
  }
}
async function logCropKeep(taken) {
  if (!taken) return;
  try {
    const blob = await new Promise(r => taken.c.toBlob(r, 'image/jpeg', 0.85));
    if (blob) await dbPut('croplog', { id: taken.id, blob, geom: taken.geom, uploaded: false, when: Date.now() });
  } catch (e) { console.error('crop log', e); }
  finally { freeCanvas(taken.c); }
}
async function updateCropStat() {
  const el = $('#cropStat');
  if (!el) return;
  try {
    const logs = await dbAll('croplog');
    const sent = logs.filter(e => e && e.uploaded).length;
    const waiting = logs.filter(e => e && !e.uploaded && e.blob).length;
    if (!sent && !waiting) { el.textContent = settings.logCrops ? 'Crop data: none yet — crop a few records.' : ''; return; }
    el.textContent = `Crop data: ${sent} sent · ${waiting} waiting to send.`;
  } catch (e) { el.textContent = ''; }
}
async function saveShot() {
  if (!review.bmp || review.mode === 'ai') return;
  if (review.mode === 'tap' && review.settle) finishTaps();   // accept the markers now
  if (review.mode === 'tap') {
    toast(review.shape === 'ellipse'
      ? 'Tap 5 points around the edge first — or press ○ Circle'
      : review.shape === 'circle'
      ? 'Tap 3 points around the edge first — or press Auto'
      : 'Tap all 4 corners of the sleeve first — or press Auto / Full', 2800);
    return;
  }
  if (review.shape === 'ellipse') {
    if (!review.ellipse) { autoDetect(); return; }
  } else if (review.shape === 'circle') {
    if (!review.circle) { review.circle = defaultCircle(); drawReview(); }
  } else if (!review.quad) {
    review.quad = defaultQuad(); drawReview();
  }
  const btn = $('#btnSave');
  btn.disabled = true;
  btn.textContent = 'Saving…';
  await new Promise(r => setTimeout(r, 40)); // let the button repaint
  let cropTaken = null;
  try {
    const bmp = review.bmp;
    let outCanvas;
    if (review.shape === 'ellipse') {
      // deskew: un-squash the ellipse back to a true circle (rotate its axes to
      // upright, scale each to R), then mask to that circle
      const e = review.ellipse;
      const R = Math.max(e.ax, e.ay);
      // A near-circular (head-on) fit has a meaningless major-axis angle, so
      // rotating by it just spins the label to a random tilt. Only deskew-rotate
      // when the ellipse is clearly elongated; auto-level fixes the rest.
      const elong = Math.max(e.ax, e.ay) / Math.max(1e-6, Math.min(e.ax, e.ay));
      const eTheta = elong < 1.06 ? 0 : e.theta;
      const S = Math.max(2, Math.min(Math.round(2 * R), settings.maxOut));
      outCanvas = document.createElement('canvas');
      outCanvas.width = S; outCanvas.height = S;
      const octx = outCanvas.getContext('2d');
      octx.imageSmoothingEnabled = true; octx.imageSmoothingQuality = 'high';
      octx.fillStyle = '#fff'; octx.fillRect(0, 0, S, S);
      octx.save();
      octx.beginPath(); octx.arc(S / 2, S / 2, S / 2, 0, 7); octx.clip();
      const Rout = S / 2;
      octx.translate(S / 2, S / 2);
      octx.scale(Rout / e.ax, Rout / e.ay);
      octx.rotate(-eTheta);
      octx.translate(-e.cx, -e.cy);
      octx.drawImage(bmp, 0, 0);
      octx.restore();
    } else if (review.shape === 'circle') {
      const c0 = review.circle;
      const S = Math.max(2, Math.min(Math.round(2 * c0.r), settings.maxOut));
      outCanvas = document.createElement('canvas');
      outCanvas.width = S; outCanvas.height = S;
      const octx = outCanvas.getContext('2d');
      const k = S / (2 * c0.r);
      const sx0 = Math.max(0, c0.cx - c0.r), sy0 = Math.max(0, c0.cy - c0.r);
      const sx1 = Math.min(bmp.width, c0.cx + c0.r), sy1 = Math.min(bmp.height, c0.cy + c0.r);
      if (sx1 > sx0 && sy1 > sy0) {
        octx.drawImage(bmp, sx0, sy0, sx1 - sx0, sy1 - sy0,
          (sx0 - (c0.cx - c0.r)) * k, (sy0 - (c0.cy - c0.r)) * k,
          (sx1 - sx0) * k, (sy1 - sy0) * k);
      }
      octx.globalCompositeOperation = 'destination-in';
      octx.beginPath(); octx.arc(S / 2, S / 2, S / 2, 0, 7); octx.fill();
      octx.globalCompositeOperation = 'destination-over';
      octx.fillStyle = '#fff'; octx.fillRect(0, 0, S, S);
      octx.globalCompositeOperation = 'source-over';
    } else if (isAxisRect(review.quad)) {
      const q = review.quad;
      const { w: ow, h: oh } = Detect.outputSize(q, settings.maxOut);
      const x0 = Math.min(q[0].x, q[3].x), y0 = Math.min(q[0].y, q[1].y);
      const cw = Math.max(1, Math.max(q[1].x, q[2].x) - x0);
      const chh = Math.max(1, Math.max(q[2].y, q[3].y) - y0);
      outCanvas = document.createElement('canvas');
      outCanvas.width = ow; outCanvas.height = oh;
      outCanvas.getContext('2d').drawImage(bmp, x0, y0, cw, chh, 0, 0, ow, oh);
    } else {
      const q = review.quad;
      const { w: ow, h: oh } = Detect.outputSize(q, settings.maxOut);
      outCanvas = warpQuad(bmp, q, ow, oh);
    }
    if (review.rot) { const r = rotateCanvas(outCanvas, review.rot); freeCanvas(outCanvas); outCanvas = r; }
    if (settings.autoLevel !== false) {
      try {
        const circular = review.shape === 'ellipse' || review.shape === 'circle';
        const lvl = autoLevelAngle(outCanvas, circular);
        if (lvl) { const l = fineLevel(outCanvas, lvl, circular); freeCanvas(outCanvas); outCanvas = l; }
      } catch (e) { console.error('auto-level', e); }  // never block a save on it
    }
    let blob;
    try {
      blob = await new Promise((res, rej) =>
        outCanvas.toBlob(b => b ? res(b) : rej(new Error('JPEG encode failed')), 'image/jpeg', settings.quality));
    } finally { freeCanvas(outCanvas); }
    // the training example's small copy and outline, taken while the review
    // still holds the photo; encoded and stored once the save is done
    cropTaken = logCropTake();
    if (curSlot) {
      await dbPut('shots', { albumId: curAlbum.id, shotId: slotId(curShot, curSlot), status: 'photo', blob, when: Date.now() });
      logCropKeep(cropTaken); cropTaken = null;   // not awaited: it never holds up the next shot
      const saved = curSlot;
      await openTextEntry(curShot);
      toast(`Photo ${saved} saved ✓`);
    } else {
      await dbPut('shots', { albumId: curAlbum.id, shotId: curShot.id, status: 'done', blob, when: Date.now() });
      logCropKeep(cropTaken); cropTaken = null;
      backToAlbum();
      toast('Saved ✓');
    }
  } catch (e) {
    console.error(e);
    toast('Save failed: ' + e.message, 4000);
  } finally {
    if (cropTaken) freeCanvas(cropTaken.c);   // the save failed: no example of a photo that was not kept
    btn.disabled = false;
    btn.textContent = 'Save';
  }
}

/* ---------- manual text entry (matrix/runout / vinyl grade) ---------- */
let textDraft = null, slotUrls = [];
function freeSlotUrls() { slotUrls.forEach(u => URL.revokeObjectURL(u)); slotUrls = []; }
function stashDraft() {
  textDraft = { albumId: curAlbum.id, shotId: curShot.id, text: $('#inShotText').value };
}
async function openTextEntry(def, rec) {
  stopCam();
  freeReview();
  curShot = def;
  curSlot = null;
  if (rec === undefined) rec = await dbGet('shots', [curAlbum.id, def.id]);
  const isGrade = def.type === 'grade';
  $('#inShotTextLabel').textContent = isGrade
    ? 'Or type it — the grade first, then its marks'
    : 'Matrix/Runout text — exactly as etched or stamped';
  $('#inShotText').placeholder = isGrade ? 'e.g. VG+ DEEP GROOVE' : 'e.g. ST-A-681234-B-1';
  let text = (rec && rec.status === 'text' && rec.text) || '';
  // restore unsaved text after a camera / photo-viewer round-trip
  if (textDraft && textDraft.albumId === curAlbum.id && textDraft.shotId === def.id) {
    text = textDraft.text;
  }
  textDraft = null;
  $('#inShotText').value = text;
  $('#btnTextDelete').classList.toggle('hidden', !(rec && rec.status === 'text'));
  stopVoice();
  $('#btnTextVoice').classList.toggle('hidden', !SpeechRec);
  $('#voiceHint').classList.toggle('hidden', !SpeechRec || isGrade);
  $('#voiceHintGrade').classList.toggle('hidden', !SpeechRec || !isGrade);
  $('#photoSection').classList.toggle('hidden', isGrade);
  $('#gradeBox').classList.toggle('hidden', !isGrade);
  $('#gradeNoteBox').classList.toggle('hidden', !isGrade);
  $('#btnGradeSkip').classList.toggle('hidden', !isGrade);
  $('#btnTextSave').textContent = isGrade ? 'Save grade' : 'Save text';
  if (isGrade) {
    // "Same as side 1" / "Same as front": most copies are one grade throughout, so it is one tap
    const src = def.id === 'backgrade' ? { id: 'frontgrade', label: 'front' }
      : /^s\d+grade$/.test(def.id) && def.id !== 's1grade' ? { id: 's1grade', label: 'side 1' } : null;
    const srcRec = src ? await dbGet('shots', [curAlbum.id, src.id]) : null;
    const same = srcRec && srcRec.status === 'text' && srcRec.text !== text ? srcRec.text : '';
    gradeBoxOpen(def, text, (curAlbum.gradeNotes || {})[def.id] || '', same, same ? `Same as ${src.label} (${same})` : '');
  } else {
    gradeBoxClose();
    $('#btnTextSave').disabled = false;
    $('#btnGradeSame').classList.add('hidden');
    await renderSlots(def);
  }
  show('scr-text', { title: shotLabel(def), back: () => { gradeBoxClose(); backToAlbum(); } });
}
async function renderSlots(def) {
  freeSlotUrls();
  const shots = await shotsFor(curAlbum.id);
  const byId = Object.fromEntries(shots.map(s => [s.shotId, s]));
  const firstEmpty = SLOTS.find(n => !byId[slotId(def, n)]);
  const sel = $('#slotSel');
  sel.value = String(firstEmpty || 1);
  const holder = $('#slotThumbs');
  holder.innerHTML = '';
  for (const n of SLOTS) {
    const rec = byId[slotId(def, n)];
    const b = document.createElement('button');
    b.className = 'slotthumb' + (rec ? ' filled' : '') + (String(n) === sel.value ? ' sel' : '');
    if (rec) {
      const url = URL.createObjectURL(rec.blob);
      slotUrls.push(url);
      const img = document.createElement('img');
      img.src = url;
      b.appendChild(img);
      b.onclick = () => { stashDraft(); openSlotViewer(def, n, rec); };
    } else {
      b.textContent = String(n);
      b.onclick = () => {
        sel.value = String(n);
        $$('#slotThumbs .slotthumb').forEach((el, i) => el.classList.toggle('sel', i + 1 === n));
      };
    }
    holder.appendChild(b);
  }
}
$('#slotSel').onchange = () => {
  const v = Number($('#slotSel').value);
  $$('#slotThumbs .slotthumb').forEach((el, i) => el.classList.toggle('sel', i + 1 === v));
};
$('#btnSlotShoot').onclick = () => {
  stashDraft();
  stopVoice();
  openCamera(curShot, Number($('#slotSel').value) || 1);
};
$('#btnTextSave').onclick = async () => {
  if (curShot.type === 'grade') {
    // the grade as the sheet will read it, never the text as typed; the note goes on the album, never into the grade
    stopVoice();
    const res = gradeBoxResult();
    if (!res.ok) return toast(res.why, 3600);
    await dbPut('shots', { albumId: curAlbum.id, shotId: curShot.id, status: 'text', text: res.text, when: Date.now() });
    await setGradeNote(curShot.id, res.note);
    gradeBoxClose();
    backToAlbum();
    return toast('Saved ✓');
  }
  const t = $('#inShotText').value.trim();
  if (!t) return toast('Type the matrix text first, or go back');
  await dbPut('shots', { albumId: curAlbum.id, shotId: curShot.id, status: 'text', text: t, when: Date.now() });
  backToAlbum();
  toast('Saved ✓');
};
// A grade's condition note lives on the album (album.gradeNotes, by shot id) and goes up in album.json.
async function setGradeNote(shotId, note) {
  const notes = Object.assign({}, curAlbum.gradeNotes || {});
  if (note) notes[shotId] = note; else delete notes[shotId];
  if (JSON.stringify(notes) === JSON.stringify(curAlbum.gradeNotes || {})) return;
  curAlbum.gradeNotes = notes;
  await dbPut('albums', curAlbum);
}
$('#btnGradeSkip').onclick = async () => {
  stopVoice();
  await dbPut('shots', { albumId: curAlbum.id, shotId: curShot.id, status: 'skipped' });
  await setGradeNote(curShot.id, '');
  gradeBoxClose();
  backToAlbum();
};
/* ---------- personal note (per album, private) ---------- */
function openNote() {
  stopCam();
  freeReview();
  stopVoice();
  $('#inNote').value = curAlbum.personalNote || '';
  $('#btnNoteClear').classList.toggle('hidden', !(curAlbum.personalNote || '').trim());
  $('#btnNoteVoice').classList.toggle('hidden', !SpeechRec);
  $('#voiceHintNote').classList.toggle('hidden', !SpeechRec);
  show('scr-note', { title: 'Personal note', back: backToAlbum });
}
$('#btnNoteVoice').onclick = () => beginDictation('#inNote', '#btnNoteVoice', voiceToNote);
$('#btnNoteClear').onclick = () => { stopVoice(); $('#inNote').value = ''; $('#btnNoteClear').classList.add('hidden'); };
$('#btnNoteSave').onclick = async () => {
  stopVoice();
  let t = $('#inNote').value.trim();
  if (t) t = t.charAt(0).toUpperCase() + t.slice(1);
  curAlbum.personalNote = t;
  await dbPut('albums', curAlbum);
  backToAlbum();
  toast(t ? 'Note saved ✓' : 'Note cleared');
};
/* ---------- barcode (per album; the sheet keys a reissue's edition on it) ---------- */
// A UPC-A (12) or EAN-13 (13) whose check digit proves it, else ''.
function upcCheck(text) {
  const d = String(text || '').replace(/[^0-9]/g, '');
  if (d.length !== 12 && d.length !== 13) return '';
  let sum = 0;
  for (let i = 0; i < d.length - 1; i++) {
    const w = d.length === 13 ? (i % 2 === 0 ? 1 : 3) : (i % 2 === 0 ? 3 : 1);
    sum += Number(d[i]) * w;
  }
  return ((10 - (sum % 10)) % 10) === Number(d[d.length - 1]) ? d : '';
}
let bcStream = null, bcTimer = null, bcDetector = null, bcReader = null, bcBusy = false;
function bcSay(msg) { $('#bcFail').textContent = msg; $('#bcFail').classList.toggle('hidden', !msg); }
function openBarcode() {
  stopCam();
  freeReview();
  stopVoice();
  $('#inUpc').value = curAlbum.upc || '';
  $('#btnUpcClear').classList.toggle('hidden', !(curAlbum.upc || ''));
  bcSay('');
  show('scr-barcode', { title: 'Barcode', back: bcBack });
  startBarcodeScan();
}
function bcBack() { stopBarcodeScan(); backToAlbum(); }
function stopBarcodeScan() {
  if (bcTimer) { clearInterval(bcTimer); bcTimer = null; }
  if (bcStream) { bcStream.getTracks().forEach(t => t.stop()); bcStream = null; }
  const v = $('#bcVideo');
  if (v) v.srcObject = null;
  bcBusy = false;
}
async function startBarcodeScan() {
  stopBarcodeScan();
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return bcSay('No camera here (the app needs an https address) - type the digits under the bars instead.');
  }
  try {
    bcStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    });
  } catch (e) {
    return bcSay('Camera unavailable or permission denied - type the digits under the bars instead.');
  }
  const v = $('#bcVideo');
  v.srcObject = bcStream;
  try { await v.play(); } catch {}
  const tr = bcStream.getVideoTracks()[0];
  const modes = (tr.getCapabilities && tr.getCapabilities().focusMode) || [];
  if (modes.includes('continuous')) tr.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
  // The browser's own detector where it exists (Android Chrome); the ZXing
  // decoder from the vendor folder (cached with the models) elsewhere.
  bcDetector = null; bcReader = null;
  if ('BarcodeDetector' in window) {
    try { bcDetector = new BarcodeDetector({ formats: ['upc_a', 'ean_13'] }); } catch { bcDetector = null; }
  }
  if (!bcDetector) {
    try {
      if (typeof ZXing === 'undefined') await loadScript('./vendor/zxing/zxing.min.js');
      const hints = new Map([[ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.UPC_A, ZXing.BarcodeFormat.EAN_13]]]);
      bcReader = new ZXing.BrowserMultiFormatReader(hints);
    } catch (e) {
      return bcSay('The scanner could not load - type the digits under the bars instead.');
    }
  }
  bcTimer = setInterval(bcTick, 300);
}
async function bcTick() {
  if (bcBusy || !bcStream) return;
  bcBusy = true;
  try {
    const v = $('#bcVideo');
    if (!v.videoWidth) return;
    let raw = '';
    if (bcDetector) {
      const codes = await bcDetector.detect(v);
      if (codes && codes.length) raw = codes[0].rawValue || '';
    } else if (bcReader) {
      // decode() reads the video's current frame through the reader's own
      // capture canvas; a frame with no code throws NotFoundException.
      try { raw = bcReader.decode(v).getText() || ''; } catch { raw = ''; }
    }
    const d = upcCheck(raw);
    if (d) await bcFound(d);
  } catch (e) {
    // a frame that would not decode is not an error
  } finally {
    bcBusy = false;
  }
}
async function bcFound(d) {
  stopBarcodeScan();
  if (navigator.vibrate) { try { navigator.vibrate(60); } catch {} }
  curAlbum.upc = d;
  await dbPut('albums', curAlbum);
  backToAlbum();
  toast('Barcode ' + d + ' saved ✓');
}
$('#btnUpcSave').onclick = async () => {
  const typed = $('#inUpc').value.trim();
  if (!typed) { bcSay('Type the 12 or 13 digits printed under the bars, or hold the barcode in the box.'); return; }
  const d = upcCheck(typed);
  if (!d) { bcSay('Those digits fail the barcode\'s own check - look again, especially at the last digit.'); return; }
  await bcFound(d);
};
$('#btnUpcClear').onclick = async () => {
  stopBarcodeScan();
  curAlbum.upc = '';
  await dbPut('albums', curAlbum);
  backToAlbum();
  toast('Barcode cleared');
};
/* ---------- grade picker (a grade is picked from the scale, never mistyped) ---------- */
// A grade entry was a text box whose only check was "not empty", and the sheet read what it was given: "VG + DEEP
// GROOVE" as VG, a step down; "MUSIC BLANK PATTERN EMBOSSED" as no grade, which left the record with no grade at
// all; "near mint" heard as "name mint". Now the grade is a button from the sheet's own scale, the marks the sheet
// reads after a grade are buttons too, a condition note has a box of its own (it goes to the sheet's comments,
// never into the grade), and whatever is typed or dictated is read the way the sheet reads it, with Save held
// until it is one grade and words the sheet knows.

// The sheet's grade scale, best first, with the values its average uses (a check holds the two equal).
const GRADE_VALUE = { 'M': 14, 'M-': 13, 'NM': 12, 'NM-': 11, 'EX+': 10, 'EX': 9, 'VG+': 8, 'VG': 7, 'VG-': 6, 'G+': 5, 'G': 4, 'G-': 3, 'F': 2, 'P': 1 };
const GRADE_SCALE = Object.keys(GRADE_VALUE);
const GRADE_MAIN = ['M', 'NM', 'NM-', 'EX', 'VG+', 'VG', 'G+', 'G'];   // the rest under "More grades"
// An entry that is no grade on purpose: the sheet leaves it out of the average and does not flag it. The cover's two
// besides Sealed are the collector's own words for a record that came without its jacket ("NIL" on a test pressing)
// or in a jacket not its own ("GENERIC COVER").
const GRADE_STATES = {
  vinyl: [{ text: 'NO MUSIC', label: 'No music (etched or blank side)' }],
  cover: [{ text: 'SEALED', label: 'Sealed (unopened)' }, { text: 'NO COVER', label: 'No cover (record only)' },
    { text: 'GENERIC COVER', label: 'Generic cover (not its own jacket)' }],
};
// >>> GRADE_MARKS (generated from the sheet's list of the marks it reads after a grade - do not edit by hand;
// the full test run fails when this block and that list differ)
const GRADE_MARKS = [
  { mark: "DEEP GROOVE", on: "vinyl", more: false, label: "", excl: "dg", also: ["DG", "DEEP-GROOVE"] },
  { mark: "DEEP GROOVE 1 SIDE ONLY", on: "vinyl", more: false, label: "", excl: "dg", also: ["DEEP GROOVE SIDE 1", "DEEP GROOVE ON SIDE 1"] },
  { mark: "PROMO", on: "vinyl", more: false, label: "", excl: "", also: ["PROMO LABEL", "NOT FOR SALE", "PROMOTIONAL", "WHITE LABEL", "DJ COPY", "DEMO COPY", "NFS"] },
  { mark: "TEST PRESSING", on: "vinyl", more: false, label: "", excl: "", also: [] },
  { mark: "NUMBERED", on: "vinyl", more: false, label: "", excl: "", also: ["NUMBERED LIMITED EDITION", "LIMITED"] },
  { mark: "LIMITED EDITION", on: "vinyl", more: false, label: "", excl: "", also: [] },
  { mark: "ORIGINAL SLEEVE", on: "vinyl", more: false, label: "", excl: "", also: ["ORIGINAL INNER SLEEVE"] },
  { mark: "6 EYE", on: "vinyl", more: true, label: "Columbia", excl: "eye", also: ["6-EYE", "SIX EYE"] },
  { mark: "2 EYE", on: "vinyl", more: true, label: "Columbia", excl: "eye", also: ["TWO EYE"] },
  { mark: "TRUMPETER LABEL", on: "vinyl", more: true, label: "Verve", excl: "", also: [] },
  { mark: "SILVER BAND", on: "vinyl", more: true, label: "EmArcy", excl: "", also: ["SILVER RIM"] },
  { mark: "GATEFOLD", on: "cover", more: false, label: "", excl: "", also: [] },
  { mark: "IN SHRINK", on: "cover", more: false, label: "", excl: "", also: ["IN ORIGINAL SHRINK", "UNOPENED BY SHRINK", "PARTIAL SHRINK"] },
  { mark: "BLUE BACK", on: "cover", more: true, label: "EmArcy", excl: "", also: [] },
];
const GRADE_KNOWN = [
  "180 GRAM", "180G", "2 EYE", "45 RPM", "6 EYE", "6-EYE", "BLUE BACK", "DEEP GROOVE", "DEEP GROOVE 1 SIDE ONLY",
  "DEEP GROOVE ON SIDE 1", "DEEP GROOVE SIDE 1", "DEEP-GROOVE", "DEMO COPY", "DG", "DJ COPY", "DRUMMER",
  "DRUMMER-LOGO", "EMBLEM", "GATEFOLD", "IN ORIGINAL SHRINK", "IN SHRINK", "LIMITED", "LIMITED EDITION",
  "MERCURY EMBLEM", "MONO", "NFS", "NOT FOR SALE", "NUMBERED", "NUMBERED LIMITED EDITION", "ORIGINAL INNER SLEEVE",
  "ORIGINAL SLEEVE", "PARTIAL SHRINK", "PROMO", "PROMO LABEL", "PROMOTIONAL", "RECORD CLUB EDITION", "SHIELD",
  "SILVER BAND", "SILVER RIM", "SIX EYE", "STEREO", "TEST PRESSING", "TRUMPETER LABEL", "TWO EYE", "UNOPENED BY SHRINK",
  "WHITE LABEL", "YMG",
];
// <<< GRADE_MARKS

// A grade where the sheet's own tokens begin (the off-scale signs included, so they can be named).
const GRADE_TOKEN_RE = /^(M-|M|NM\+|NM-|NM|EX\+\+|EX\+|EX-|EX|VG\+\+|VG\+|VG-|VG|G\+\+|G\+|G-|G|F\+|F-|F|P\+|P-|P)(?![A-Z0-9])/;
const GRADE_SECOND_RE = /^\s*\/?\s*(M-|M|NM\+|NM-|NM|EX\+|EX-|EX|VG\+\+|VG\+|VG-|VG|G\+|G-|G|F|P)(?![A-Z0-9])/;
// Grade words typed out, written as the sheet writes them. "name mint" is the speech engine's near mint.
const GRADE_WORDS = [
  [/^(?:NEAR|NAME)[\s-]*MINT(?![A-Z])/, 'NM'], [/^MINT(?![A-Z])/, 'M'], [/^EXCELLENT(?![A-Z])/, 'EX'],
  [/^VERY[\s-]*GOOD(?![A-Z])/, 'VG'], [/^GOOD(?![A-Z])/, 'G'], [/^FAIR(?![A-Z])/, 'F'], [/^POOR(?![A-Z])/, 'P'],
];
function gradeUpper(s) { return String(s == null ? '' : s).toUpperCase().replace(/[‐-―−]/g, '-').replace(/\s+/g, ' ').trim(); }
function gradeSquash(s) { return gradeUpper(s).replace(/[\s-]+/g, ' '); }
function gradeOn(def) { return /cover/i.test(def && def.name || '') ? 'cover' : 'vinyl'; }
function gradeMarksFor(on) { return GRADE_MARKS.filter(m => m.on === on); }
// The scale steps either side of an off-scale grade: EX- -> EX, VG+; NM+ -> NM, M-; VG++ -> VG+, EX.
function gradeNearSteps(tok) {
  const m = /^(M|NM|EX|VG|G|F|P)([+-]+)$/.exec(tok);
  if (!m) return [];
  const out = [], shorter = tok.slice(0, -1);
  if (GRADE_VALUE[shorter]) out.push(shorter);
  let v = GRADE_VALUE[m[1]];
  for (const c of m[2]) v += c === '+' ? 1 : -1;
  const at = GRADE_SCALE.find(g => GRADE_VALUE[g] === v);
  if (at && !out.includes(at)) out.push(at);
  return out;
}
function gradeEditDistance(a, b) {
  const d = [];
  for (let i = 0; i <= a.length; i++) { d.push([i]); }
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length][b.length];
}
// Every form the sheet reads after a grade, longest first: the buttons, their other spellings, and every other form
// and negation the sheet's list carries.
let gradeFormsCache = null;
function gradeForms() {
  if (gradeFormsCache) return gradeFormsCache;
  const seen = {}, out = [];
  const add = f => { const s = gradeSquash(f); if (s && !seen[s]) { seen[s] = true; out.push(s); } };
  for (const m of GRADE_MARKS) { add(m.mark); m.also.forEach(add); }
  GRADE_KNOWN.forEach(add);
  gradeFormsCache = out.sort((a, b) => b.length - a.length);
  return gradeFormsCache;
}
function gradeFormRe(form) {
  const pat = form.split(' ').map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\s-]*');
  return new RegExp('(^|[^A-Z0-9])(' + pat + ')(?![A-Z0-9])', 'g');
}
// Pure. What an entry says, read the way the sheet reads it:
//   { norm: the text as written with the grade words and a loose sign fixed, grade, state, leadLen,
//     items: [{at, text, kind}] (the marks and the words kept, where they stand in norm),
//     problems: [{kind, msg, choices?, ...}] (each holds Save), infos: [what was rewritten], text: what is saved, ok }
// keep: the words the collector chose to keep beside the grade though the sheet does not read them.
function gradeRead(text, on, keep) {
  keep = keep || {};
  const out = { norm: '', grade: '', state: '', leadLen: 0, items: [], problems: [], infos: [], text: '', ok: false };
  let t = gradeUpper(text);
  for (const [re, code] of GRADE_WORDS) {
    const m = re.exec(t);
    if (m) { t = code + t.slice(m[0].length); out.infos.push('“' + m[0] + '” is written ' + code); break; }
  }
  const sw = /^(M|NM|EX|VG|G|F|P) ?(PLUS|MINUS)(?![A-Z])/.exec(t);
  if (sw) t = sw[1] + (sw[2] === 'PLUS' ? '+' : '-') + t.slice(sw[0].length);
  const sp = /^(M|NM|EX|VG|G|F|P) ([+-])(?=\s|\/|$)/.exec(t);
  if (sp) { t = sp[1] + sp[2] + t.slice(sp[0].length); out.infos.push('“' + sp[0] + '” is read as ' + sp[1] + sp[2]); }
  out.norm = t;
  if (!t) { out.problems.push({ kind: 'empty', msg: 'Pick a grade.' }); return out; }
  const states = (GRADE_STATES[on] || []).map(s => s.text).concat(['NOT GRADED']);
  for (const s of states) {
    if (t === s) { out.state = s; out.text = s; out.ok = true; return out; }
    if (t.indexOf(s + ' ') === 0) {
      out.state = s;
      out.problems.push({ kind: 'state', msg: s + ' stands alone - marks go with a grade.', choices: [s] });
      return out;
    }
  }
  let restAt = 0;
  const lm = GRADE_TOKEN_RE.exec(t);
  if (!lm) {
    out.problems.push({ kind: 'nograde', msg: 'No grade at the start - tap one above' + (on === 'vinyl' ? ', or “No music” for an etched or blank side' : on === 'cover' ? ', or “Sealed”, “No cover” or “Generic cover”' : '') + '.' });
  } else if (!GRADE_VALUE[lm[1]]) {
    out.problems.push({ kind: 'offscale', msg: lm[1] + ' is not on the sheet’s grade scale - which is it?', choices: gradeNearSteps(lm[1]), cut: lm[1].length });
    restAt = lm[1].length;
  } else {
    out.grade = lm[1];
    out.leadLen = restAt = lm[1].length;
    const two = GRADE_SECOND_RE.exec(t.slice(restAt));
    if (two) {
      out.problems.push({ kind: 'two', msg: 'Two grades - one side takes one. Which is it?', choices: [lm[1]].concat(GRADE_VALUE[two[1]] && two[1] !== lm[1] ? [two[1]] : []), cut: restAt + two[0].length });
      restAt += two[0].length;
    }
  }
  // the marks, longest first, each where it was typed
  let work = t.slice(0, restAt).replace(/./g, ' ') + t.slice(restAt);
  for (const f of gradeForms()) {
    const re = gradeFormRe(f);
    let m;
    while ((m = re.exec(work))) {
      const at = m.index + m[1].length;
      out.items.push({ at, text: m[2].replace(/\s+/g, ' '), kind: 'mark' });
      work = work.slice(0, at) + ' '.repeat(m[2].length) + work.slice(at + m[2].length);
      re.lastIndex = at + m[2].length;
    }
  }
  // what is left: a near miss of a form the sheet reads, a word kept on purpose, or a word to move or keep
  const words = [], wre = /[A-Z0-9][A-Z0-9'.&+#\-]*/g;
  let w;
  while ((w = wre.exec(work))) words.push({ at: w.index, text: w[0] });
  const unknown = [];
  for (let i = 0; i < words.length; i++) {
    let hit = null;
    for (let n = Math.min(3, words.length - i); n >= 1 && !hit; n--) {
      const win = words.slice(i, i + n);
      if (win.some((x, k) => k && x.at !== win[k - 1].at + win[k - 1].text.length + 1)) continue;   // one run of words
      const phrase = win.map(x => x.text).join(' ');
      if (keep[phrase]) { hit = { n, kept: phrase }; break; }
      for (const f of gradeForms()) {
        const allowed = f.length >= 8 ? 2 : f.length >= 5 ? 1 : 0;
        if (!allowed || Math.abs(f.length - phrase.length) > allowed) continue;
        const dist = gradeEditDistance(phrase, f);
        if (dist > 0 && dist <= allowed) { hit = { n, from: phrase, to: f }; break; }
      }
    }
    if (hit && hit.kept) { out.items.push({ at: words[i].at, text: hit.kept, kind: 'kept' }); i += hit.n - 1; continue; }
    if (hit) {
      out.items.push({ at: words[i].at, text: hit.from, kind: 'near' });
      out.problems.push({ kind: 'near', msg: '“' + hit.from + '” - did you mean ' + hit.to + '?', from: hit.from, to: hit.to, at: words[i].at });
      i += hit.n - 1;
      continue;
    }
    unknown.push(words[i]);
  }
  if (unknown.length) {
    out.problems.push({ kind: 'unknown', msg: '“' + unknown.map(x => x.text).join(' ') + '” is not a mark the sheet reads after a grade.', words: unknown });
  }
  out.items.sort((a, b) => a.at - b.at);
  out.text = [out.grade].concat(out.items.map(i => i.text)).filter(Boolean).join(' ');
  out.ok = !out.problems.length && !!out.grade;
  return out;
}
// Is this button's mark in the entry (as itself or as one of its other spellings)?
function gradeChipOn(m, r) {
  const forms = [m.mark].concat(m.also).map(gradeSquash);
  return r.items.some(i => i.kind === 'mark' && forms.includes(gradeSquash(i.text)));
}
// The note box's text, tidied.
function gradeNoteClean(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }

let gradeUi = null;   // the grade entry on screen: { def, on, keep, more, moreMarks, sameText, read }
function gradeBoxOpen(def, text, note, sameText, sameLabel) {
  gradeUi = { def, on: gradeOn(def), keep: {}, more: false, moreMarks: false, sameText: sameText || '', read: null };
  $('#inShotText').value = text || '';
  $('#inGradeNote').value = note || '';
  $('#gradeBoxHead').textContent = gradeUi.on === 'cover' ? 'Cover grade' : 'Vinyl grade for this side';
  const sb = $('#btnGradeSame');
  sb.textContent = sameLabel || '';
  sb.classList.toggle('hidden', !sameText);
  // an entry already holding a rarer grade or a label-specific mark opens with it in view
  const r = gradeRead(text, gradeUi.on, gradeUi.keep);
  gradeUi.more = !!(r.grade && !GRADE_MAIN.includes(r.grade)) || r.problems.some(p => p.kind === 'offscale');
  gradeUi.moreMarks = gradeMarksFor(gradeUi.on).some(m => m.more && gradeChipOn(m, r));
  gradeRender();
}
function gradeBoxClose() { gradeUi = null; }
function gradeSetText(t) { $('#inShotText').value = gradeUpper(t); gradeRender(); }
function gradeRender() {
  if (!gradeUi) return;
  const on = gradeUi.on, r = gradeRead($('#inShotText').value, on, gradeUi.keep);
  gradeUi.read = r;
  const grid = $('#gradeGrid');
  grid.innerHTML = '';
  for (const g of (gradeUi.more ? GRADE_SCALE : GRADE_MAIN)) {
    const b = document.createElement('button');
    b.className = 'gradebtn' + (r.grade === g ? ' on' : '');
    b.textContent = g;
    b.dataset.grade = g;
    b.onclick = () => gradeSetGrade(g);
    grid.appendChild(b);
  }
  $('#btnGradeMore').textContent = gradeUi.more ? 'Fewer grades' : 'More grades (M-, EX+, VG-, G-, F, P)';
  const st = $('#gradeStates');
  st.innerHTML = '';
  for (const s of GRADE_STATES[on] || []) {
    const b = document.createElement('button');
    b.className = 'gradestate' + (r.state === s.text ? ' on' : '');
    b.textContent = s.label;
    b.dataset.state = s.text;
    b.onclick = () => gradeSetText(r.state === s.text ? '' : s.text);
    st.appendChild(b);
  }
  const chips = $('#gradeChips');
  chips.innerHTML = '';
  for (const m of gradeMarksFor(on)) {
    if (m.more && !gradeUi.moreMarks) continue;
    const b = document.createElement('button');
    b.className = 'gradechip' + (gradeChipOn(m, r) ? ' on' : '');
    b.innerHTML = esc(m.mark) + (m.label ? ' <em>' + esc(m.label) + '</em>' : '');
    b.dataset.mark = m.mark;
    b.onclick = () => gradeToggleMark(m);
    chips.appendChild(b);
  }
  const mm = $('#btnGradeMoreMarks');
  mm.classList.toggle('hidden', !gradeMarksFor(on).some(m => m.more));
  mm.textContent = gradeUi.moreMarks ? 'Fewer marks' : 'More marks (a label’s own)';
  const ra = $('#gradeReads');
  ra.className = 'gradereads ' + (r.ok ? 'ok' : 'bad');
  ra.textContent = r.ok ? 'Reads as: ' + (r.state || [r.grade].concat(r.items.map(i => i.text)).join(' · ')) : 'Not ready to save yet';
  const box = $('#gradeIssues');
  box.innerHTML = '';
  for (const inf of r.infos) {
    const d = document.createElement('div');
    d.className = 'gradeinfo';
    d.textContent = inf;
    box.appendChild(d);
  }
  for (const p of r.problems) {
    const d = document.createElement('div');
    d.className = 'gradeissue';
    d.dataset.kind = p.kind;
    d.textContent = p.msg;
    let row = null;
    const fix = (label, fn) => {
      if (!row) { row = document.createElement('div'); d.appendChild(row); }
      const b = document.createElement('button');
      b.className = 'gradefix';
      b.textContent = label;
      b.onclick = fn;
      row.appendChild(b);
    };
    if (p.kind === 'offscale' || p.kind === 'two') for (const c of p.choices) fix(c, () => gradeSetText(c + r.norm.slice(p.cut)));
    if (p.kind === 'state') fix('Keep ' + p.choices[0] + ' alone', () => gradeSetText(p.choices[0]));
    if (p.kind === 'near') {
      fix('Yes, ' + p.to, () => gradeSetText(r.norm.slice(0, p.at) + p.to + r.norm.slice(p.at + p.from.length)));
      fix('Keep as typed', () => { gradeUi.keep[p.from] = true; gradeRender(); });
    }
    if (p.kind === 'unknown') {
      fix('Move to the note', () => {
        let t = r.norm;
        for (const x of p.words.slice().sort((a, b) => b.at - a.at)) t = t.slice(0, x.at) + t.slice(x.at + x.text.length);
        const moved = p.words.map(x => x.text).join(' ').toLowerCase();
        const note = gradeNoteClean($('#inGradeNote').value);
        $('#inGradeNote').value = note ? note + '; ' + moved : moved.charAt(0).toUpperCase() + moved.slice(1);
        gradeSetText(t);
      });
      fix('Keep with the grade', () => { for (const x of p.words) gradeUi.keep[x.text] = true; gradeRender(); });
    }
    box.appendChild(d);
  }
  $('#btnTextSave').disabled = !r.ok;
}
function gradeSetGrade(g) {
  const r = gradeUi.read || gradeRead($('#inShotText').value, gradeUi.on, gradeUi.keep);
  if (r.state) return gradeSetText(g);
  if (r.leadLen) return gradeSetText(g + r.norm.slice(r.leadLen));
  const off = r.problems.find(p => p.kind === 'offscale');
  if (off) return gradeSetText(g + r.norm.slice(off.cut));
  gradeSetText(g + (r.norm ? ' ' + r.norm : ''));
}
function gradeToggleMark(m) {
  const r = gradeUi.read || gradeRead($('#inShotText').value, gradeUi.on, gradeUi.keep);
  let t = r.state ? '' : r.norm;
  const strip = mk => { for (const f of [mk.mark].concat(mk.also)) t = t.replace(gradeFormRe(gradeSquash(f)), '$1'); };
  if (gradeChipOn(m, r)) strip(m);
  else {
    if (m.excl) for (const o of GRADE_MARKS) if (o !== m && o.excl === m.excl) strip(o);
    t = t + ' ' + m.mark;
  }
  gradeSetText(t);
}
// Save's half: the entry as the sheet will read it, or why it cannot be saved yet.
function gradeBoxResult() {
  const r = gradeRead($('#inShotText').value, gradeUi.on, gradeUi.keep);
  if (!r.ok) return { ok: false, why: r.problems.length ? r.problems[0].msg : 'Pick a grade.' };
  return { ok: true, text: r.text, note: gradeNoteClean($('#inGradeNote').value) };
}
$('#inShotText').addEventListener('input', () => { if (gradeUi) gradeRender(); });
$('#btnGradeMore').onclick = () => { gradeUi.more = !gradeUi.more; gradeRender(); };
$('#btnGradeMoreMarks').onclick = () => { gradeUi.moreMarks = !gradeUi.moreMarks; gradeRender(); };
$('#btnGradeSame').onclick = () => { if (gradeUi && gradeUi.sameText) gradeSetText(gradeUi.sameText); };
/* ---------- voice dictation (matrix/runout) ---------- */
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
let speech = null;
const VOICE_SPACE = '␟';   // stands in for a spoken "space" until the joining is done
const VOICE_MAP = {
  zero: '0', oh: '0', one: '1', two: '2', three: '3', four: '4',
  five: '5', six: '6', seven: '7', eight: '8', nine: '9',
  dash: '-', hyphen: '-', minus: '-', slash: '/', stroke: '/',
  dot: '.', period: '.', point: '.', hash: '#', pound: '#',
  star: '*', asterisk: '*', plus: '+', equals: '=',
  // stamped shapes, common in dead wax (Monarch's triangle and friends)
  triangle: '△', delta: '△', square: '□', box: '□',
  circle: '○', ring: '○', diamond: '◇',
  space: VOICE_SPACE,
  // NATO phonetic — the reliable way to dictate the bare letters in a code:
  // "alpha one bravo" -> A1B. (delta is left as the triangle above, since the
  // stamped shape is the Vinyl-specific meaning; it is the only NATO collision.)
  alpha: 'A', bravo: 'B', charlie: 'C', echo: 'E', foxtrot: 'F',
  golf: 'G', hotel: 'H', india: 'I', juliet: 'J', juliett: 'J', kilo: 'K',
  lima: 'L', mike: 'M', november: 'N', oscar: 'O', papa: 'P', quebec: 'Q',
  romeo: 'R', sierra: 'S', tango: 'T', uniform: 'U', victor: 'V',
  whiskey: 'W', xray: 'X', 'x-ray': 'X', yankee: 'Y', zulu: 'Z',
};
// Named stamps: a few dead-wax marks are logos no keyboard carries, so saying the
// mark's name types it exactly as Discogs writes it, and a dictated runout reads
// the same as the Discogs one. Matched as whole phrases BEFORE the word-by-word
// map (a name is several words), then parked as a private-use placeholder until
// the very end, so nothing in between - the despacing, the single-letter join,
// the capitals - can touch the mark.
// Each phrase also takes the punctuation the engine hangs on a word ("anvil,"),
// as the word map strips it, so it never lands in the runout as a stray mark.
const VOICE_STAMPS = [
  // Sonic Arts, San Francisco (lacquer cut there): an outlined dash bulging in the
  // centre, drawn ⊏◯⊐ on its Discogs entry. Only with "logo" / "symbol" / "stamp" /
  // "mark" after it - the bare words "Sonic Arts" stay words.
  [/\bsonic[\s-]+arts?['’]?s?[\s-]+(?:logo|symbol|stamp|mark)s?\b(?:['’]s)?[.,]*/gi, '⊏◯⊐'],
  // Capitol's Scranton, Pennsylvania plant: the stamped "anvil". Its Discogs entry
  // asks for the words "[Anvil symbol]" in a runout instead of a Unicode glyph.
  // "anvil" alone or the plant's full name ("Capitol Scranton anvil logo") types
  // it; a lone "Capitol" before it stays, since MASTERED BY CAPITOL is stamped too.
  [/\b(?:capit[oa]l[\s-]+scranton[\s-]+|scranton[\s-]+)?anvils?(?:[\s-]+(?:logo|symbol|stamp|mark)s?)?\b(?:['’]s)?[.,]*/gi, '[Anvil symbol]'],
  // Monarch Record Mfg. Co., Los Angeles: the stamped encircled MR. Its Discogs
  // entry asks for "[MR logo]" when the stamp is there (a hand-etched MR is just
  // the letters, "M R"). "Monarch logo", "MR logo" / "stamp", "MR in a circle",
  // "circled MR" all type it; the engine often hears "M R" as "Mr." or "mister".
  [/\b(?:monarch(?:[\s-]+records?)?[\s-]+(?:logo|symbol|stamp|mark)s?|(?:m[\s.]*r|mister)\.?[\s-]+(?:(?:logo|symbol|stamp|mark)s?|in[\s-]+an?[\s-]+circle)|circled[\s-]+(?:m[\s.]*r|mister)\.?)\b(?:['’]s)?[.,]*/gi, '[MR logo]'],
  // Specialty Records Corporation, Olyphant, Pennsylvania: the machine-stamped
  // logo, an S with R and C in its loops. Its Discogs entry calls it the "SRC"
  // logo and prescribes no other form, and transcribers write the letters SRC.
  // "Specialty logo" or "SRC logo" types it (plain "S R C" already does).
  [/\b(?:specialty(?:[\s-]+records?)?|s[\s.]*r[\s.]*c\.?)[\s-]+(?:logo|symbol|stamp|mark)s?\b(?:['’]s)?[.,]*/gi, 'SRC'],
  // Keel Mfg. Corp., Hauppauge, New York (pressing plant, to 1981): the ROUNDED
  // "air force" logo, which its Discogs entry writes ⊂◯⊃ - not the squared ⊏◯⊐
  // of Sonic Arts. "Keel logo", "air force logo" or "Keel air force logo" types
  // it; the engine may hear Keel as "Kiel".
  [/\b(?:k(?:ee|ie)l(?:[\s-]+air[\s-]*force)?|air[\s-]*force)[\s-]+(?:logo|symbol|stamp|mark)s?\b(?:['’]s)?[.,]*/gi, '⊂◯⊃'],
  // Capitol's Scranton plant, 1963-1973: the stamped triangle with I over A M (the
  // International Association of Machinists). Its Discogs entry prescribes no form,
  // and transcribers write the bare letters IAM (92 of the 169 sampled releases that
  // write it). "IAM triangle", "triangle I A M", "IAM logo" type it; the engine
  // may hear "I A M" as "I am".
  [/\b(?:i[\s.]*a[\s.]*m\.?[\s-]+(?:in[\s-]+an?[\s-]+)?(?:triangle|logo|symbol|stamp|mark)s?|triangle[\s-]+i[\s.]*a[\s.]*m)\b(?:['’]s)?[.,]*/gi, 'IAM'],
  // A letter in a circle: an enclosed letter stamped in a runout, typed as
  // Discogs writes it - United Record Pressing's circled U (Ⓤ), Keel's circled K
  // (Ⓚ), the Dutch cutting room's circled H (Ⓗ) and the P in a circle (℗) some
  // transcribers write for Blue Note's Plastylite ear. "circled U", "circle U" or
  // "U in a circle" types it (the engine may hear U as "you", K as "kay", H as
  // "aitch", P as "pee"); a circle said AFTER the letter ("U circle") stays two
  // marks, as "M R circle" does. Before 2026-10-22 "circle U" typed a circle and a U.
  [/\b(?:circled?[\s-]+(?:u|you)|(?:u|you)[\s-]+in[\s-]+an?[\s-]+circle)\b(?:['’]s)?[.,]*/gi, 'Ⓤ'],
  [/\b(?:circled?[\s-]+(?:k|kay)|(?:k|kay)[\s-]+in[\s-]+an?[\s-]+circle)\b(?:['’]s)?[.,]*/gi, 'Ⓚ'],
  [/\b(?:circled?[\s-]+(?:h|aitch)|(?:h|aitch)[\s-]+in[\s-]+an?[\s-]+circle)\b(?:['’]s)?[.,]*/gi, 'Ⓗ'],
  [/\b(?:circled?[\s-]+(?:p|pee|pea)|(?:p|pee|pea)[\s-]+in[\s-]+an?[\s-]+circle)\b(?:['’]s)?[.,]*/gi, '℗'],
];
// Placeholders: the private-use character VOICE_STAMP_BASE + i stands in for stamp i.
// Built from char codes, never typed: an invisible character in source is a trap.
const VOICE_STAMP_BASE = 0xE000;
function voiceStampsIn(s) {
  return VOICE_STAMPS.reduce((t, st, i) => t.replace(st[0], ' ' + String.fromCharCode(VOICE_STAMP_BASE + i) + ' '), s);
}
function voiceStampsOut(s) {
  let out = '';
  for (const c of s) {
    const i = c.charCodeAt(0) - VOICE_STAMP_BASE;
    out += i >= 0 && i < VOICE_STAMPS.length ? VOICE_STAMPS[i][1] : c;
  }
  return out;
}
// A pause inside a stamp's name ("Sonic Arts" ... "logo") ends the utterance, so
// the halves are committed apart and neither is a stamp on its own. When a final
// is committed, a stamp that SPANS the seam between the text already committed
// and the new final is joined back; one wholly on either side was already typed.
function voiceStampsSeam(base, next) {
  if (!base) return next;
  if (!next) return base;
  const tail = base.split(' ').slice(-3).join(' ');
  const keep = base.slice(0, base.length - tail.length);
  const head = next.split(' ').slice(0, 3).join(' ');
  const rest = next.slice(head.length);
  const w = tail + ' ' + head;
  for (const st of VOICE_STAMPS) {
    const re = new RegExp(st[0].source, 'gi');
    let m;
    while ((m = re.exec(w))) {
      if (m.index < tail.length && m.index + m[0].length > tail.length + 1) {
        const left = w.slice(0, m.index).trim();
        const right = (w.slice(m.index + m[0].length) + rest).trim();
        return (keep + [left, st[1], right].filter(Boolean).join(' ')).replace(/ {2,}/g, ' ').trim();
      }
    }
  }
  return base + ' ' + next;
}
// "bracket" opens on its first use in an utterance and closes on the next;
// "open bracket" / "close bracket" say which outright and reset the pairing.
function voiceBrackets(s) {
  let open = false;
  return s.replace(/\b(?:(open|opening|left)[\s-]+|(close|closed|closing|right)[\s-]+)?(?:bracket|parenthesis|paren)s?\b/gi, (m, o, c) => {
    if (o) open = true; else if (c) open = false; else open = !open;
    return open ? ' ( ' : ' ) ';
  });
}
function voiceToMatrix(s) {
  const words = voiceBrackets(voiceStampsIn(s)).trim().split(/\s+/).map(w => {
    const key = w.toLowerCase().replace(/[.,]+$/, '');
    return VOICE_MAP[key] !== undefined ? VOICE_MAP[key] : w;
  });
  return voiceStampsOut(words.join(' ')
    .replace(/\s*([-/.#*+=])\s*/g, '$1')   // no spaces around symbols
    .replace(/\(\s*/g, '(').replace(/\s*\)/g, ')')   // brackets hug what they enclose
    .replace(/\b(\w) (?=\w\b)/g, '$1')     // join runs of single characters: "B 1" -> "B1"
    .replace(/\s*␟\s*/g, ' ')         // a spoken "space" is exactly one space
    .replace(/ {2,}/g, ' ')
    .trim()
    .toUpperCase()
    // Columbia "eye" label variants (6-eye 1955-62, 2-eye 1962-70): "six eye" /
    // "two eye" come back as 6I / 2I / "6 EYE" / "2 AYE". Snap them back.
    .replace(/\b([26])[\s-]?(?:I|EYE|AYE)\b/g, '$1-EYE')
    // "FON" (Columbia pressing mark) is misheard as "IF ON" / "FAWN"; neither is a real runout word.
    .replace(/\bIF ON\b/g, 'FON')
    .replace(/\bFAWN\b/g, 'FON')
    // Spelled-out condition grades snap to their code even when more text
    // follows it ("NEAR MINT 2-EYE" -> "NM 2-EYE"); plus/minus already became
    // +/- above. Multi-word phrases first so "NEAR MINT" beats "MINT".
    .replace(/\bNEAR[\s-]?MINT\b/g, 'NM')
    .replace(/\bVERY[\s-]?GOOD\b/g, 'VG')
    .replace(/\bEXCELLENT\b/g, 'EX')
    .replace(/\bMINT\b/g, 'M')
    .replace(/\bGOOD\b/g, 'G')
    .replace(/\bFAIR\b/g, 'F')
    .replace(/\bPOOR\b/g, 'P')
    // +/- despacing can glue a grade onto a following eye-label ("VG+6-EYE"):
    // put the space back so grade and label read apart ("VG+ 6-EYE").
    .replace(/([+-])(\d-EYE)\b/g, '$1 $2'));
}
// The known grades, and the words / mis-hearings the speech engine hands back for
// each. Grades are a tiny closed set, so we can snap to the real one — the short
// ones are the worst: spoken "N M" comes back as "in him", "M" as "him"/"am".
const GRADE_PHRASES = {
  m: 'M', em: 'M', am: 'M', him: 'M', hem: 'M', aim: 'M', ham: 'M', mm: 'M', mint: 'M', mints: 'M',
  nm: 'NM', 'n m': 'NM', 'en em': 'NM', 'in em': 'NM', 'in him': 'NM', 'in am': 'NM',
  'an em': 'NM', 'an m': 'NM', 'and em': 'NM', 'and m': 'NM', 'in m': 'NM',
  'near mint': 'NM', nearmint: 'NM', enem: 'NM', nem: 'NM', anam: 'NM',
  ex: 'EX', 'e x': 'EX', eggs: 'EX', x: 'EX', excellent: 'EX',
  vg: 'VG', 'v g': 'VG', 'vee gee': 'VG', veejay: 'VG', bg: 'VG', 'b g': 'VG', beegee: 'VG', 'very good': 'VG',
  g: 'G', gee: 'G', jee: 'G', good: 'G',
  f: 'F', eff: 'F', ef: 'F', fair: 'F', fare: 'F',
  p: 'P', pee: 'P', poor: 'P', pea: 'P',
};
// Grade dictation: one grade from the closed set above, optionally with a +/-
// ("plus"/"minus") and/or "deep groove". Snap the spoken grade to the real one;
// if it isn't recognised, fall back to a plain letter cleanup so nothing is lost.
function voiceToGrade(s) {
  let t = ' ' + s.toLowerCase().replace(/[.,]/g, ' ') + ' ';
  let deep = false;
  t = t.replace(/\bd(?:e{1,2}|i|ea)p[\s-]*gr[o0]+ve?s?\b/g, () => { deep = true; return ' '; });
  // drop filler so "near mint condition" / "excellent copy" still resolve
  t = t.replace(/\b(?:condition|copy|grade|graded|record|vinyl|disc|it's|its|looks?)\b/g, ' ');
  // the engine mangles "near mint" into "near me" / "nearly" / "near meat" /
  // "near mid" etc. In a grade box a leading "near m..." can only be near mint -
  // and so can "name mint" (heard on a back cover's "near mint with biography").
  t = t.replace(/\b(?:near(?:ly\b|\s+m\w*)|name\s+m\w*)/g, ' near mint ');
  let mod = '';
  if (/\bplus\b|\+/.test(t)) mod = '+';
  else if (/\b(?:minus|dash|hyphen)\b|-/.test(t)) mod = '-';
  t = t.replace(/\b(?:plus|minus|dash|hyphen)\b|[+\-]/g, ' ').replace(/\s+/g, ' ').trim();
  // typeof guard: a raw lookup like GRADE_PHRASES["toString"] would hit a prototype method.
  let base = GRADE_PHRASES[t];
  if (typeof base !== 'string') base = GRADE_PHRASES[t.replace(/\s+/g, '')];
  let rest = '';
  if (typeof base !== 'string') {
    // not a pure grade — peel the longest LEADING grade phrase off and keep the
    // remainder as trailing text, so "near mint 2 eye" becomes NM + "2 eye"
    // (the grade still abbreviates instead of staying full words).
    const words = t.split(' ').filter(Boolean);
    for (let n = Math.min(3, words.length); n >= 1; n--) {
      const head = words.slice(0, n).join(' ');
      const g = GRADE_PHRASES[head] || GRADE_PHRASES[head.replace(/\s+/g, '')];
      if (typeof g === 'string') { base = g; rest = words.slice(n).join(' '); break; }
    }
  }
  if (typeof base !== 'string') base = t.replace(/\b(\w) (?=\w\b)/g, '$1').replace(/ {2,}/g, ' ').trim().toUpperCase();
  let out = (base + mod).trim();
  if (deep) out = (out ? out + ' ' : '') + 'DEEP GROOVE';
  // the remainder goes through the matrix mapper so label bits snap too (2-eye etc.)
  if (rest) out = (out ? out + ' ' : '') + voiceToMatrix(rest);
  return out;
}
// Does a mapped string read as a real grade (optionally +/- and/or deep groove)?
function isGradeString(s) { return /^(?:M|NM|EX|VG|G|F|P)[+-]?(?: DEEP GROOVE)?$/.test(s); }
// Or does it at least LEAD with a grade ("NM 2-EYE")? Trailing label text is fine.
function startsWithGrade(s) { return /^(?:M|NM|EX|VG|G|F|P)[+-]?\b/.test(s); }
// Pick which of the engine's guesses to keep. Grades are a closed set, so scan the
// alternatives and take the first whose result LEADS with a grade — the top guess is
// often a plain-English mishear ("excellent condition") when a lower guess nails it.
function pickTranscript(r) {
  if (voiceMap === voiceToGrade) {
    for (let a = 0; a < r.length; a++) {
      const alt = r[a] && r[a].transcript;
      if (alt && startsWithGrade(voiceToGrade(alt))) return alt;
    }
  }
  return r[0].transcript;
}
// Free-text dictation (artist / album names): keep the words the engine heard,
// just tidy the spacing and Title-Case each word so a lowercased result still reads
// right. No symbol/letter mangling — these are names, not codes.
function voiceToText(s) {
  return s.replace(/\s+/g, ' ').trim().replace(/(^|\s)(\w)/g, (m, p, c) => p + c.toUpperCase());
}
// Free-text dictation for the personal note: keep what was said, just tidy spacing
// (no title-casing or code-snapping — it's a sentence, not a name or a matrix code).
function voiceToNote(s) { return String(s).replace(/\s+/g, ' ').trim(); }
let voiceMap = voiceToMatrix;   // active mapper — set per field when dictation starts
let voiceFieldSel = '#inShotText';  // the input/textarea dictation fills
let voiceBtnSel = '#btnTextVoice';  // the button whose label reflects dictation state
let voiceWant = false;    // the user wants the mic open — survives the per-utterance restarts
let voiceBase = '';       // text already committed to the box; the live interim guess is painted on top
let voiceLastStart = 0;   // for the runaway-restart guard below
let voiceRestarts = 0;
let voiceProgress = false; // did the session that just ended actually commit any speech?
function paintVoice(interim) {
  const ta = $(voiceFieldSel);
  if (!ta) return;
  const iv = interim ? voiceMap(interim) : '';
  ta.value = voiceBase + (iv ? (voiceBase ? ' ' : '') + iv : '');
  ta.dispatchEvent(new Event('input'));   // a box that reads its text as it changes (the grade picker) reads dictation too
}
// Full teardown. Other screens call this to cancel dictation on navigation, so it must
// be a no-op on the text box unless a session was actually running (else it would repaint
// a freshly loaded field with stale dictation).
function stopVoice() {
  const wasActive = voiceWant || !!speech;
  voiceWant = false;
  if (speech) { const s = speech; speech = null; s.onend = null; try { s.stop(); } catch (e) {} }
  if (wasActive) paintVoice('');   // drop any half-heard interim guess, keep the committed text
  const b = $(voiceBtnSel);
  if (b) { b.classList.remove('listening'); b.textContent = b.dataset.idle || '🎤 Dictate it'; }
}
function startVoiceSession() {
  const rec = new SpeechRec();
  rec.lang = navigator.language || 'en-US';
  // NOT continuous. In continuous mode mobile Chrome re-emits the whole utterance
  // as a fresh final entry over and over, so any index rule still folded it in
  // repeatedly — the runout duplicating as you spoke. One utterance per session
  // means exactly one final, so there is nothing to double; restartVoice() reopens
  // the mic after each so it still listens straight through pauses.
  rec.continuous = false;
  rec.interimResults = true;   // live feedback, so a wrong word can be caught and re-said on the spot
  rec.maxAlternatives = 6;     // ask for several guesses so pickTranscript can choose the real grade
  let committed = 0;           // guard against a final being re-delivered within this one session
  // The engine has a cold-start lag; a word spoken into it is clipped. Hold the button
  // on "Starting…" (set on tap) until the mic is actually capturing, then say "Listening"
  // so you know exactly when to speak. onaudiostart is the precise signal; onstart and the
  // first result are fallbacks for engines that skip it.
  const ready = () => { if (speech === rec && voiceWant) { const b = $(voiceBtnSel); if (b) b.textContent = '🎤 Listening… tap to stop'; } };
  rec.onaudiostart = ready;
  rec.onstart = ready;
  rec.onresult = e => {
    ready();
    let intr = '';
    for (let i = 0; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) {
        if (i >= committed) {
          const mf = voiceMap(pickTranscript(r));
          if (mf) {
            voiceBase = voiceMap === voiceToMatrix ? voiceStampsSeam(voiceBase, mf) : (voiceBase ? voiceBase + ' ' : '') + mf;
            voiceProgress = true;
          }
          committed = i + 1;
        }
      } else {
        intr += ' ' + r[0].transcript;
      }
    }
    paintVoice(intr);
  };
  rec.onerror = e => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      voiceWant = false;   // a permission block won't fix itself on restart
      toast('Microphone blocked — allow mic access for this site in your browser settings', 4200);
    } else if (e.error !== 'aborted' && e.error !== 'no-speech') {
      toast('Dictation error: ' + e.error, 3500);
    }
    // 'no-speech' / 'aborted' are the normal silence-timeout path — onend restarts us
  };
  rec.onend = () => {
    if (speech !== rec) return;   // already superseded or stopped
    speech = null;
    if (voiceWant) restartVoice(); else stopVoice();
  };
  speech = rec;
  voiceLastStart = Date.now();
  voiceProgress = false;
  try { rec.start(); } catch (e) { stopVoice(); }
}
// A per-utterance session ends after every phrase; reopening it is what keeps the
// mic listening through pauses. A session that recognised speech is normal — only
// guard against a real fault: sessions ending instantly with nothing recognised.
function restartVoice() {
  if (voiceProgress) {
    voiceRestarts = 0;
  } else {
    const now = Date.now();
    voiceRestarts = (now - voiceLastStart < 1200) ? voiceRestarts + 1 : 0;
    if (voiceRestarts > 8) { toast('Dictation stopped listening', 2500); return stopVoice(); }
  }
  setTimeout(() => { if (voiceWant) startVoiceSession(); }, 250);
}
function beginDictation(fieldSel, btnSel, mapper) {
  if (voiceWant || speech) return stopVoice();   // any tap while listening = stop
  if (!SpeechRec) return;
  voiceFieldSel = fieldSel;
  voiceBtnSel = btnSel;
  voiceMap = mapper;
  const ta = $(fieldSel);
  voiceBase = ta && ta.value.trim() ? ta.value.trim() : '';
  voiceWant = true;
  voiceRestarts = 0;
  const b = $(btnSel);
  b.classList.add('listening');
  b.textContent = '🎤 Starting…';   // flips to "Listening…" once the mic is actually capturing
  startVoiceSession();
}
$('#btnTextVoice').onclick = () =>
  beginDictation('#inShotText', '#btnTextVoice', (curShot && curShot.type === 'grade') ? voiceToGrade : voiceToMatrix);
$('#btnArtistVoice').onclick = () => beginDictation('#inArtist', '#btnArtistVoice', voiceToText);
$('#btnTitleVoice').onclick = () => beginDictation('#inTitle', '#btnTitleVoice', voiceToText);
$('#btnTextDelete').onclick = async () => {
  if (!confirm('Delete this text entry?')) return;
  await dbDel('shots', [curAlbum.id, curShot.id]);
  if (curShot.type === 'grade') { await setGradeNote(curShot.id, ''); gradeBoxClose(); }
  backToAlbum();
};

/* ---------- viewer ---------- */
let viewShot = null, viewSlot = null, viewerUrl = null;
function openViewer(def, rec) {
  viewShot = def;
  viewSlot = null;
  if (viewerUrl) URL.revokeObjectURL(viewerUrl);
  viewerUrl = URL.createObjectURL(rec.blob);
  $('#viewerImg').src = viewerUrl;
  $('#viewerName').textContent = filenameFor(def);
  show('scr-viewer', { title: shotLabel(def), back: backToAlbum });
}
function openSlotViewer(def, n, rec) {
  viewShot = def;
  viewSlot = n;
  if (viewerUrl) URL.revokeObjectURL(viewerUrl);
  viewerUrl = URL.createObjectURL(rec.blob);
  $('#viewerImg').src = viewerUrl;
  $('#viewerName').textContent = slotFilename(def, n);
  show('scr-viewer', { title: `${shotLabel(def)} · Photo ${n}`, back: () => openTextEntry(def) });
}
$('#btnVRetake').onclick = () => openCamera(viewShot, viewSlot);
$('#btnVDelete').onclick = async () => {
  if (!confirm('Delete this photo?')) return;
  if (viewSlot) {
    await dbDel('shots', [curAlbum.id, slotId(viewShot, viewSlot)]);
    openTextEntry(viewShot);
  } else {
    await dbDel('shots', [curAlbum.id, viewShot.id]);
    backToAlbum();
  }
};

/* ---------- export ---------- */
let exportItems = [];
$('#btnExport').onclick = openExport;
// Everything an album has to send: one file per finished checklist entry (a
// photo, or a typed matrix/runout as text) plus the deadwax photo slots. Read
// straight from IndexedDB so the upload queue can rebuild it for an album
// that is no longer the open one. Each item says what it is (kind) and which
// record it came from (shotId), so a re-upload can put Drive's text back into
// that record (see "re-upload: only what changed").
async function buildExportItems(al) {
  const shots = await shotsFor(al.id);
  const byId = Object.fromEntries(shots.map(s => [s.shotId, s]));
  return albumShots(al)
    .flatMap(def => {
      const rec = byId[def.id];
      const items = [];
      if (rec && rec.status === 'text')
        items.push({ name: baseNameFor(def, al) + '.txt', blob: new Blob([rec.text + '\n'], { type: 'text/plain' }), mime: 'text/plain',
          kind: 'text', shotId: def.id, text: rec.text });
      else if (rec && rec.status === 'done')
        items.push({ name: filenameFor(def, al), blob: rec.blob, mime: 'image/jpeg', kind: 'photo', shotId: def.id });
      if (def.type === 'matrix') {
        for (const n of SLOTS) {
          const sr = byId[slotId(def, n)];
          if (sr) items.push({ name: slotFilename(def, n, al), blob: sr.blob, mime: 'image/jpeg', kind: 'photo', shotId: slotId(def, n) });
        }
      }
      return items;
    });
}
async function openExport() {
  exportItems = await buildExportItems(curAlbum);
  const fmtSize = n => n < 1048576 ? Math.max(1, Math.round(n / 1024)) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
  $('#exportList').innerHTML = exportItems
    .map(i => `<div class="exportrow"><div>${esc(i.name)}</div><span>${fmtSize(i.blob.size)}</span></div>`)
    .join('');
  const up = uploadActive(curAlbum);
  $('#exportStatus').textContent = up ? uploadLabel(curAlbum) : '';
  $('#btnDrive').disabled = !!up;
  $('#btnDrive').textContent = up
    ? 'Upload in progress'
    : cred('clientId')
      ? 'Upload to Google Drive'
      : 'Upload to Google Drive (needs setup — see Settings)';
  const sel = $('#expFolder');
  const pre = curAlbum.driveFolderName && settings.driveFolders.includes(curAlbum.driveFolderName)
    ? curAlbum.driveFolderName : settings.driveFolder;
  sel.innerHTML = settings.driveFolders
    .map(f => `<option${f === pre ? ' selected' : ''}>${esc(f)}</option>`).join('');
  const single = settings.driveFolders.length < 2 || !cred('clientId');
  $('#expFolderLabel').classList.toggle('hidden', single);
  sel.classList.toggle('hidden', single);
  show('scr-export', { title: 'Save photos', back: backToAlbum });
}

/* ---------- Google Drive upload ---------- */
let gsiLoaded = null;
let tokenInfo = { token: null, exp: 0 };
function loadGsi() {
  return gsiLoaded || (gsiLoaded = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = res;
    s.onerror = () => { gsiLoaded = null; rej(new Error('Could not load Google sign-in (offline?)')); };
    document.head.appendChild(s);
  }));
}
async function getToken() {
  if (!cred('clientId')) throw new Error('Add your Google OAuth Client ID in Settings first');
  if (tokenInfo.token && Date.now() < tokenInfo.exp - 60000) return tokenInfo.token;
  await loadGsi();
  return new Promise((res, rej) => {
    const tc = google.accounts.oauth2.initTokenClient({
      client_id: cred('clientId'),
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: r => {
        if (r.access_token) {
          tokenInfo = { token: r.access_token, exp: Date.now() + (Number(r.expires_in) || 3600) * 1000 };
          res(r.access_token);
        } else {
          rej(new Error(r.error || 'Sign-in failed'));
        }
      },
      error_callback: e => rej(new Error(e.message || e.type || 'Sign-in cancelled')),
    });
    tc.requestAccessToken();
  });
}
async function drive(url, opts = {}) {
  const token = await getToken();
  const res = await fetch(url, {
    ...opts,
    headers: { Authorization: 'Bearer ' + token, ...(opts.headers || {}) },
  });
  if (!res.ok) throw new Error('Drive error ' + res.status + ': ' + (await res.text()).slice(0, 200));
  return res.json();
}
function qEsc(s) { return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
async function findFolder(name, parent) {
  const q = `name='${qEsc(name)}' and mimeType='application/vnd.google-apps.folder' and '${parent}' in parents and trashed=false`;
  const r = await drive('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&fields=files(id)');
  return (r.files && r.files.length) ? r.files[0].id : null;
}
// Which Drive folder this album uploads into.
//
// This used to be findOrCreateFolder(artist_title) alone, which meant two
// copies of the same record - an original and a reissue - resolved to the SAME
// folder, and every shot whose filename matched was overwritten in place. That
// destroyed a reissue's photographs on 2026-08-20.
//
// An album that has uploaded before carries its own folder id, so re-uploading
// the SAME album still lands where it did last time, even if the folder has
// since been renamed. A name match with NO stored id means a different copy of
// the same record, and that choice belongs to the owner, not to a default.
//
// THE FOLDER BELONGS TO THE ALBUM THAT MADE IT (2026-10-13). That guard was
// not enough. On 10 Oct a NEW album for a second copy of a record (a 2-LP
// reissue) reached the folder of the first copy (a 1965 mono) and replaced
// its 18 photographs name for name. Two paths could do that, and neither
// looked at whose folder it was: the clash question's Cancel meant "the SAME
// record - replace", and a folder brought back with Re-import was linked to
// a new album that then uploaded into it without a word. The owner could not
// say which ("maybe I hit cancel so let's fix that too").
//
// Now whose folder it is is read before anything is written (folderStanding):
// a folder's album.json names its owner (appAlbumId); a folder from before
// album.json is the album's own only if the album uploaded there and the
// folder is not older than the album.
//   - an album writes silently only into a folder it owns;
//   - OK, the button Enter presses, is the safe answer in every question
//     here: a new folder, the other one untouched;
//   - an album LINKED to a folder it does not own - a re-import, marked
//     (reimportedFrom) or from before the mark, or a folder another album
//     has taken - is told what the folder holds (its disc count and the day
//     its album was made are the tells a second copy differs on). Uploading
//     into it takes Cancel AND a second OK on a question that names exactly
//     what would be replaced (replaceQuestion: the re-upload's own file-by-file
//     plan); the album then carries the folder's owner on (ownerId);
//   - the upload queue asks folderStanding again before the first file.
// To add photos to another album, open THAT album (Uploaded albums).
async function resolveAlbumFolder(album, folderName, root, items) {
  if (album.driveFolderId) {
    let f = null;
    try {
      f = await drive('https://www.googleapis.com/drive/v3/files/' +
        album.driveFolderId + '?fields=id,name,trashed,createdTime');
    } catch (e) {
      // only a folder that is GONE becomes a new upload below; any other
      // answer (a rate limit, a 5xx, no signal) stops, to be tried again
      if (!/Drive error 404\b/.test(String(e && e.message))) throw e;
      f = null;
    }
    if (f && f.id && !f.trashed) {
      const st = await folderStanding(f.id, album, f.createdTime);
      if (st.mine) return { id: f.id, name: f.name };
      // Linked to a folder that is not its own: a re-import (marked, or from
      // before the mark), or a folder another album has taken. OK - the button
      // Enter presses - is the safe answer, as in every question here; to
      // replace another album's photos takes Cancel AND a second OK on a
      // question that says exactly what would be replaced.
      const holds = st.own ? ownerText(st.own) : 'photos from before album records were kept';
      const fresh = confirm(album.reimportedFrom === f.id
        ? 'This album was downloaded from the Drive folder "' + f.name + '" (' + holds + ').\n\n' +
          'OK = it is a DIFFERENT copy. Upload into a NEW folder; "' + f.name + '" is left untouched.\n\n' +
          'Cancel = it is THAT copy (photos added or re-shot): upload into "' + f.name +
          '" - only what changed on this phone goes in. You are told what would be replaced, and asked, first.'
        : 'This album is linked to the Drive folder "' + f.name + '", which holds ' + holds + ' - not this album.\n\n' +
          'OK = this is a DIFFERENT copy, or you are not sure. Upload into a NEW folder; "' +
          f.name + '" is left untouched.\n\n' +
          'Cancel = it is THE SAME COPY. You are told what would be replaced, and asked, first.');
      if (fresh) {
        delete album.reimportedFrom;   // its own album from here on
        // the record of what was settled with THAT folder says nothing of a new
        // one: every file there is new, never "deleted or renamed in Drive"
        delete album.sent;
        return newAlbumFolder(folderName, root, album);
      }
      // SAID EXACTLY (owner, 2026-10-29): a re-upload decides file by file and
      // replaces only what changed on this phone, so this question names what
      // that plan would replace - never "every file of the same name".
      const replace = confirm(await replaceQuestion(album, f, items));
      if (!replace) throw new Error(UPLOAD_STOPPED);
      album.ownerId = st.own ? st.own.appAlbumId : album.id;
      return { id: f.id, name: f.name };
    }
  }
  const existing = await findFolder(folderName, root);
  if (!existing) {
    const made = await findOrCreateFolder(folderName, root);
    album.madeFolderId = made;   // its own, whatever the phone's clock says
    return { id: made, name: folderName };
  }
  const own = await folderOwner(existing);
  // this album's own folder, reached by its name - it made it
  if (own && own.appAlbumId === albumOwnerId(album)) return { id: existing, name: folderName };
  const fresh = confirm(
    'Drive already has a folder called "' + folderName + '"' +
    (own ? ', holding ' + ownerText(own) : '') + '.\n\n' +
    'OK = this is a DIFFERENT copy (another pressing or variant). Upload into a new ' +
    'folder and leave that one untouched.\n\n' +
    'Cancel = stop. Nothing is uploaded.\n\n' +
    'To add photos to THAT album, open it from Uploaded albums instead.');
  if (!fresh) throw new Error(UPLOAD_STOPPED);
  return newAlbumFolder(folderName, root, album);
}
const UPLOAD_STOPPED = 'Upload stopped - nothing was changed in Drive.';
// The album id a folder's album.json names: a re-imported album that the
// collector confirmed as the same copy carries its folder's owner on.
function albumOwnerId(album) { return album.ownerId || album.id; }
// When an album was made: its id is Date.now() in base 36 (0 for any other id).
function albumMadeMs(id) {
  const ms = parseInt(String(id || ''), 36);
  return ms > 1.5e12 && ms < 2.5e12 ? ms : 0;
}
// Is this folder the album's own? album.json says so; or this album made it
// (madeFolderId - whatever the phone's clock says); or, for a folder with no
// album.json yet (from before album.json, or a first upload stopped before its
// album.json went up), the folder is not older than the album - an album
// cannot have made a folder that existed before it: that is a re-import,
// marked or from before the mark. An hour's margin for a phone clock that runs
// fast. (Not the album's "uploaded" stamp: Unhide clears it.) {mine, own}
async function folderStanding(folderId, album, createdTime) {
  if (createdTime === undefined) {
    const m = await drive('https://www.googleapis.com/drive/v3/files/' + folderId + '?fields=createdTime');
    createdTime = m && m.createdTime;
  }
  const own = await folderOwner(folderId);
  if (own) return { mine: own.appAlbumId === albumOwnerId(album), own };
  const made = albumMadeMs(album.id), created = Date.parse(createdTime || '') || 0;
  const olderThanAlbum = !!(made && created && created < made - 3600000);
  const mine = !!album.ownerId || album.madeFolderId === folderId ||
    (!album.reimportedFrom && !olderThanAlbum);
  return { mine, own: null };
}
async function newAlbumFolder(folderName, root, album) {
  for (let n = 2; n < 50; n++) {
    const alt = folderName + ' (' + n + ')';
    if (!(await findFolder(alt, root))) {
      const made = await findOrCreateFolder(alt, root);
      if (album) album.madeFolderId = made;
      return { id: made, name: alt };
    }
  }
  throw new Error('Could not find a free folder name for "' + folderName + '".');
}
// Who owns a folder: its album.json, read - {appAlbumId, artist, title,
// discs} or null when it has none (a folder from before album.json). A read
// that FAILS throws: the upload stops rather than guess the folder is free.
async function folderOwner(folderId) {
  const q = `name='album.json' and '${folderId}' in parents and trashed=false`;
  const r = await drive('https://www.googleapis.com/drive/v3/files?q=' +
    encodeURIComponent(q) + '&fields=files(id)');
  if (!r.files || !r.files.length) return null;
  const token = await getToken();
  const res = await fetch('https://www.googleapis.com/drive/v3/files/' + r.files[0].id + '?alt=media', {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (!res.ok) throw new Error('Could not read the folder\'s album.json (Drive error ' + res.status + ') - nothing was uploaded.');
  let m = null;
  try { m = JSON.parse(await res.text()); } catch (e) { m = null; }
  if (!m || !m.appAlbumId) return null;
  return { appAlbumId: String(m.appAlbumId), artist: String(m.artist || ''), title: String(m.title || ''), discs: Number(m.discs) || 1,
    box: m.box === true };
}
// "Bob Dylan — Bringing It All Back Home, 1 disc, its album made 8 Oct 2026"; a box set
// "..., box set, 9 LPs, ..."
function ownerText(own) {
  const ms = parseInt(own.appAlbumId, 36);
  const made = ms > 1.5e12 && ms < 2.5e12
    ? ', its album made ' + new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  return (own.artist || own.title ? own.artist + ' — ' + own.title + ', ' : '') +
    (own.box ? 'box set, ' + own.discs + ' LP' + (own.discs === 1 ? '' : 's')
      : own.discs + ' disc' + (own.discs === 1 ? '' : 's')) + made;
}
// Create or replace one file in a folder, by name. Same find-then-PATCH-or-POST
// the photo loop always did; it lives here so the manifest goes up the same way.
async function uploadFile(folder, name, mime, blob) {
  const q = `name='${qEsc(name)}' and '${folder}' in parents and trashed=false`;
  const existing = await drive('https://www.googleapis.com/drive/v3/files?q=' +
    encodeURIComponent(q) + '&fields=files(id)');
  if (existing.files && existing.files.length) {
    return drive(`https://www.googleapis.com/upload/drive/v3/files/${existing.files[0].id}?uploadType=media&fields=id`, {
      method: 'PATCH',
      headers: { 'Content-Type': mime },
      body: blob,
    });
  }
  const boundary = 'vinylsnap' + Date.now();
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
    JSON.stringify({ name, parents: [folder] }),
    `\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`,
    blob,
    `\r\n--${boundary}--`,
  ]);
  return drive('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST',
    headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
    body,
  });
}
// The description that travels with a crop example: the fields the training
// reads and no more. An example queued by an older build also carries the
// album's artist and title and the shot's name; those stay on the phone.
function cropMeta(g) {
  return {
    id: g.id, when: g.when, app: g.app,
    shot: g.shot ? { id: g.shot.id, type: g.shot.type } : null,
    album: g.album && g.album.id ? { id: g.album.id } : null,
    image: g.image, shape: g.shape, rot: g.rot || 0, source: g.source, geom: g.geom,
  };
}
// Send any waiting crop training examples (the original photo + the crop set
// on it) to the intake, one POST each; no sign-in is needed, so it runs
// whenever the upload pump does. A sent example keeps its line for the count
// in Settings and drops its photo. Returns how many went.
async function syncCropLogs() {
  if (!settings.logCrops || !settings.cropNotice) return 0;
  let n = 0;
  for (const e of await dbAll('croplog')) {
    if (!e) continue;
    if (e.uploaded) {                  // sent (or, before 3 Oct 2026, copied to the owner's Drive)
      if (e.blob) { delete e.blob; await dbPut('croplog', e); }
      continue;
    }
    if (!e.blob || !e.geom) continue;
    const fd = new FormData();
    fd.append('meta', JSON.stringify(cropMeta(e.geom)));
    fd.append('image', e.blob, e.id + '.jpg');
    const r = await fetch(CROP_INTAKE, { method: 'POST', body: fd });
    let j = null;
    try { j = await r.json(); } catch (x) {}
    if (r.ok && j && j.ok) { e.uploaded = true; e.sent = Date.now(); n++; }
    // a refusal of the example itself would come back the same every time: let it go
    else if (r.status === 400 || r.status === 413) e.refused = (j && j.error) || ('HTTP ' + r.status);
    else throw new Error('crop intake: ' + ((j && j.error) || ('HTTP ' + r.status)));   // busy or offline: next time
    delete e.blob;
    await dbPut('croplog', e);
  }
  return n;
}
// Turning crop training off deletes the copies not yet sent.
async function dropUnsentCrops() {
  for (const e of await dbAll('croplog')) if (e && !e.uploaded) await dbDel('croplog', e.id);
}
// Crop training is on for every phone (owner, 2026-10-03), after this notice
// once: nothing is kept or sent before it has been seen, OK keeps it on, and
// Cancel turns it off and deletes anything already waiting.
async function maybeCropNotice() {
  if (settings.cropNotice) return;
  const keep = confirm(
    'Crop training data\n\n' +
    'To make automatic cropping better, the app sends a copy of each photo you crop ' +
    'to the maker of Vinyl Curator: the photo as you took it, before cropping and ' +
    'reduced in size, and the outline you set.\n\n' +
    'Nothing else goes with it: no artist, title, notes or grades, and nothing from ' +
    'your Google Drive.\n\n' +
    'OK keeps this on. Cancel turns it off. You can change it any time in ' +
    'Settings ⚙ → Crop training data.');
  settings.cropNotice = 1;
  settings.logCrops = keep;
  await saveSettings();
  if (!keep) await dropUnsentCrops();
}

// The album's own record of what it is, written into its Drive folder.
//
// The sheet used to learn an album's artist and title by splitting the FOLDER
// NAME at the first underscore, which made the folder name carry meaning it
// was never safe to carry: an artist containing "_" broke it, and a "(2)"
// added to keep two copies apart arrived in the sheet as part of the album
// title and went out on eBay and Discogs listings that way. The manifest says
// what the album is; the folder name goes back to being just a name.
// The grades' condition notes as album.json carries them: by the grade's shot number (2 and 4 the covers, 7-13 the
// sides), only the sides this album has. The sheet writes them into Cover Comments and Vinyl Comments. A box set's
// sides 5 on have no shot number, so theirs go by "side5", "side6" ...
function gradeNotesManifest(album) {
  const out = {};
  for (const def of albumShots(album)) {
    if (def.type !== 'grade') continue;
    const t = String(((album.gradeNotes || {})[def.id]) || '').trim();
    if (t) out[def.n ? String(def.n) : 'side' + def.side] = t;
  }
  return out;
}
// ...and back from a folder's album.json onto an album brought back from Drive.
function gradeNotesFromManifest(manifest) {
  const out = {}, g = manifest && manifest.gradeNotes;
  if (!g || typeof g !== 'object') return out;
  for (const def of SHOTS) {
    const t = def.type === 'grade' ? String(g[String(def.n)] || '').trim() : '';
    if (t) out[def.id] = t;
  }
  for (const k of Object.keys(g)) {
    const m = /^side(\d+)$/.exec(k), t = String(g[k] || '').trim();
    if (m && Number(m[1]) >= 5 && t) out[`s${Number(m[1])}grade`] = t;
  }
  return out;
}
async function writeAlbumManifest(folder, album) {
  const manifest = {
    vinylCurator: 1,
    appAlbumId: albumOwnerId(album),
    artist: album.artist,
    title: album.title,
    discs: album.discs || 1,
    ...(album.box ? { box: true } : {}),   // a box set: discs is its count of LPs
    personalNote: (album.personalNote || '').trim(),
    upc: (album.upc || '').trim(),
    gradeNotes: gradeNotesManifest(album),
    updated: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
  await uploadFile(folder, 'album.json', 'application/json', blob);
}

// The question before an album goes into a folder that is not its own, as THE
// SAME COPY: what the upload would do there, file by file - the re-upload's own
// plan (planSync: the folder listed once, this phone's files hashed), so what it
// names is exactly what would be replaced. Reads only. items: the export items.
async function replaceQuestion(album, f, items) {
  const rows = await planSync(album, items || [], f.id);
  const of = act => rows.filter(r => r.act === act);
  const s = (k, one, many) => k === 1 ? one : many;
  const names = rs => rs.slice(0, 6).map(r => r.it.name.replace(/^.* - /, '').replace(/\.[^.]+$/, '')).join(', ') +
    (rs.length > 6 ? ' and ' + (rs.length - 6) + ' more' : '');
  const replaced = of('send').filter(r => r.df), added = of('send').filter(r => !r.df), asked = of('ask');
  const kept = rows.filter(r => r.act === 'keep' || r.act === 'hold'), healed = of('heal'), same = of('skip');
  const lines = [replaced.length
    ? 'Replaced with this phone\'s copy (changed on this phone): ' + replaced.length + ' ' + s(replaced.length, 'file', 'files') + ' - ' + names(replaced) + '.'
    : 'No photo or typed entry in it is replaced.'];
  lines.push('Its album record (album.json) is replaced with this album\'s.');
  if (added.length) lines.push('Added (not in the folder yet): ' + added.length + ' ' + s(added.length, 'file', 'files') + '.');
  if (asked.length) lines.push('Changed on this phone AND in Drive, so asked about first - nothing is sent until you choose: ' + names(asked) + '.');
  if (kept.length) lines.push('Left as they are in Drive: ' + kept.length + ' ' + s(kept.length, 'photo', 'photos') + ' (changed in Drive, or no record of what this phone sent).');
  if (healed.length) lines.push('Typed ' + s(healed.length, 'entry', 'entries') + ' changed in Drive, taken onto this phone: ' + names(healed) + '.');
  if (same.length) lines.push('The same on both sides, left alone: ' + same.length + ' ' + s(same.length, 'file', 'files') + '.');
  return 'Upload into "' + f.name + '" as THE SAME COPY?\n\n' + lines.join('\n') +
    '\n\nOnly for THE SAME COPY.\n\nOK = upload into it.\n\nCancel = stop. Nothing is uploaded.';
}

async function findOrCreateFolder(name, parent) {
  const found = await findFolder(name, parent);
  if (found) return found;
  const made = await drive('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parent] }),
  });
  return made.id;
}

/* ---------- re-upload: only what changed, file by file ----------
 *
 * A re-upload used to send everything the phone holds and replace every Drive
 * file of the same name. The phone still holds what was first typed and shot,
 * so one re-upload after a retaken photo would have put back over every
 * correction made in Drive since: a typed runout or grade corrected to match
 * the sheet, a photo turned the right way up (owner, 2026-10-27).
 *
 * Now each upload records, per file name, the SHA-256 of this phone's copy as
 * it was settled with Drive - sent, found equal, or set aside for Drive's
 * (al.sent; Unhide clears only al.uploaded, so the record stays). A re-upload
 * lists the album's folder ONCE, hashes what the phone would send, and decides
 * file by file (syncAction):
 *   missing in Drive                 -> send it (a file deleted or renamed in
 *                                       Drive goes up again, and is said so;
 *                                       a renamed copy is left as it is)
 *   neither side changed             -> skip
 *   phone and Drive already equal    -> skip, and record the hash
 *   phone changed, Drive the same    -> send it
 *   phone the same, Drive changed    -> leave Drive's file; a typed entry
 *                                       takes Drive's text onto the phone
 *   changed on both sides            -> ask, showing both - one question for
 *                                       the album, and nothing of the album is
 *                                       sent until it is answered
 * Drive's own sha256Checksum and the phone's crypto.subtle digest are the same
 * SHA-256, so no clock, the phone's or Google's, is read.
 *
 * A file with no record (an album uploaded before this build, or brought back
 * with Re-import) cannot tell which side changed: a typed entry is compared
 * with Drive's text - the same is skipped, a difference is asked with Drive's
 * text shown first and chosen; a photo already in Drive is never replaced
 * (said in the closing message), a missing one is sent. Once the upload
 * completes every file has its record, so the next one uses the table.
 *
 * The listing is the guard: a listing that fails stops the album with nothing
 * sent - never "Drive has nothing". Whose folder it is (folderStanding) is
 * still decided first, and album.json still goes up last.
 */
async function sha256Hex(blob) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()));
  let s = '';
  for (const b of d) s += b.toString(16).padStart(2, '0');
  return s;
}
// A typed entry as compared: line ends and the ends of the text do not count.
function syncText(s) { return String(s == null ? '' : s).replace(/\r\n?/g, '\n').trim(); }
// Every file in an album's folder, by name, with Drive's SHA-256 of its
// content. Reads only. A listing that fails THROWS, page two as much as page
// one: nothing is decided on a folder that could not be read.
async function listAlbumFiles(folderId) {
  const q = `'${folderId}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'`;
  const byName = {};
  let page = '';
  do {
    const r = await drive('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) +
      '&fields=nextPageToken,files(id,name,mimeType,sha256Checksum,modifiedTime)&pageSize=1000' +
      (page ? '&pageToken=' + encodeURIComponent(page) : ''));
    for (const f of (r && r.files) || []) if (!byName[f.name]) byName[f.name] = f;
    page = (r && r.nextPageToken) || '';
  } while (page);
  return byName;
}
// What a re-upload does with one file - the table above. it: the phone's copy
// {name, kind, hash, text}; df: Drive's file of that name, or none; base: the
// hash recorded when it was last settled, or none; ans: the collector's answer
// to an earlier question about exactly these two copies; dText: Drive's text,
// read for a typed entry whose bytes differ. {act, why}: act is send, skip,
// keep (leave Drive's photo), heal (take Drive's text), ask or hold (a photo
// with no record, never replaced).
function syncAction(it, df, base, ans, dText) {
  if (!df) return { act: 'send', why: base ? 'gone' : 'new' };
  const d = df.sha256Checksum || '';
  if (base && it.hash === base && d === base) return { act: 'skip', why: 'same' };
  if (d && d === it.hash) return { act: 'skip', why: 'equal' };
  if (it.kind === 'text' && dText != null && syncText(dText) === syncText(it.text)) return { act: 'skip', why: 'equal text' };
  if (ans && ans.p === it.hash && ans.d === d) {
    if (ans.pick === 'phone') return { act: 'send', why: 'chosen' };
    return { act: it.kind === 'text' ? 'heal' : 'keep', why: 'chosen' };
  }
  if (!base) return it.kind === 'text' ? { act: 'ask', why: 'unrecorded' } : { act: 'hold', why: 'unrecorded' };
  const phone = it.hash !== base, inDrive = d !== base;
  if (phone && inDrive) return { act: 'ask', why: 'both' };
  if (phone) return { act: 'send', why: 'phone' };
  return { act: it.kind === 'text' ? 'heal' : 'keep', why: 'drive' };
}
// One listing, one hash per file, Drive's text where a typed entry's bytes
// differ, then the table. Reads only - nothing is changed here.
async function planSync(al, items, folder) {
  const files = await listAlbumFiles(folder);
  const sent = al.sent || {}, answers = (al.upload && al.upload.answers) || {};
  const rows = [];
  for (const it of items) {
    it.kind = it.kind || (/^text\//.test(it.mime || '') ? 'text' : 'photo');
    it.hash = await sha256Hex(it.blob);
    const df = files[it.name];
    const d = df ? (df.sha256Checksum || '') : '';
    let dText = null;
    if (df && it.kind === 'text' && d !== it.hash) dText = await (await driveBlob(df.id)).text();
    rows.push(Object.assign({ it, df, d, dText }, syncAction(it, df, sent[it.name], answers[it.name], dText)));
  }
  return rows;
}
// A typed entry takes Drive's text: its record on the phone is rewritten (an
// entry's photo slots are records of their own and stay as they are). Returns
// the hash of what the phone would now send. Drive's empty file empties nothing.
async function settleText(al, it, text) {
  const t = syncText(text);
  if (!t) return it.hash;
  const rec = (await dbGet('shots', [al.id, it.shotId])) || { albumId: al.id, shotId: it.shotId, when: Date.now() };
  rec.status = 'text';
  rec.text = t;
  await dbPut('shots', rec);
  return sha256Hex(new Blob([t + '\n'], { type: 'text/plain' }));
}
// The closing message: what went up, what was already there, and every file
// the phone did NOT put into Drive, and why - said, never silent.
function syncSummary(rows) {
  const n = f => rows.filter(f).length;
  const s = (k, one, many) => k === 1 ? one : many;
  const sent = n(r => r.act === 'send'), same = n(r => r.act === 'skip');
  const healed = n(r => r.act === 'heal'), kept = n(r => r.act === 'keep'), held = n(r => r.act === 'hold');
  const gone = n(r => r.act === 'send' && r.why === 'gone');
  const more = [];
  if (healed) more.push(`${healed} typed ${s(healed, 'entry', 'entries')} taken from Drive onto this phone`);
  if (kept) more.push(`${kept} ${s(kept, 'photo', 'photos')} left as in Drive`);
  if (held) more.push(`${held} ${s(held, 'photo', 'photos')} already in Drive not replaced - no record of what this phone sent`);
  if (gone) more.push(`${gone} missing in Drive (deleted or renamed there) sent again`);
  return { head: `${sent} sent, ${same} unchanged`, more: more.length ? ' · ' + more.join(' · ') : '' };
}

/* ---------- changed on both sides: the collector chooses ---------- */
// One screen per album, whatever the number of files: each file shows Drive's
// copy first and this phone's beside it. A typed entry with no record has
// Drive's chosen (most differences are corrections made in the sheet); a file
// changed on both sides since the last upload has nothing chosen, and the
// upload does not continue until each has an answer. An answer is kept with
// the two copies it was given (their hashes): if either changes again before
// the upload runs, the question is asked again.
let chooseUrls = [];
function chooseFree() { chooseUrls.forEach(u => URL.revokeObjectURL(u)); chooseUrls = []; }
function chooseReady() {
  const cards = $$('#chooseList .choosecard');
  $('#btnChooseGo').disabled = !cards.length || cards.some(c => !c.querySelector('input:checked'));
}
async function openChooser(albumId) {
  const al = await dbGet('albums', albumId);
  if (!al || !al.upload || al.upload.state !== 'ask' || !Array.isArray(al.upload.ask)) return goHome();
  chooseFree();
  show('scr-choose', { title: 'Choose what to keep', back: () => { chooseFree(); goHome(); } });
  $('#chooseHdr').textContent = `${al.artist} — ${al.title}`;
  $('#chooseStatus').textContent = '';
  $('#btnChooseGo').dataset.album = al.id;
  const list = $('#chooseList');
  list.innerHTML = '';
  al.upload.ask.forEach((a, i) => {
    const card = document.createElement('div');
    card.className = 'choosecard';
    card.dataset.name = a.name;
    const why = a.why === 'unrecorded'
      ? 'Uploaded before this phone kept a record of what it sent, so which side changed is not known. Drive’s is chosen: it is usually a correction made in the sheet.'
      : 'Changed on this phone and in Drive since the last upload.';
    card.innerHTML =
      `<div class="choosename">${esc(a.name)}</div><div class="choosewhy">${why}</div><div class="choosepair">` +
      `<label class="chooseopt"><input type="radio" name="choose${i}" value="drive"${a.why === 'unrecorded' ? ' checked' : ''}>In Drive` +
      `<div class="choosebody" data-side="drive">Loading…</div></label>` +
      `<label class="chooseopt"><input type="radio" name="choose${i}" value="phone">On this phone` +
      `<div class="choosebody" data-side="phone">Loading…</div></label></div>`;
    list.appendChild(card);
  });
  list.onchange = chooseReady;
  chooseReady();
  const cards = $$('#chooseList .choosecard');
  for (let i = 0; i < al.upload.ask.length; i++) {
    const a = al.upload.ask[i], card = cards[i];
    const put = async (side, read) => {
      const box = card.querySelector(`.choosebody[data-side="${side}"]`);
      try {
        const v = await read();
        if (a.kind === 'text') { box.textContent = v; return; }
        const u = URL.createObjectURL(v);
        chooseUrls.push(u);
        box.textContent = '';
        const img = document.createElement('img');
        img.alt = side === 'drive' ? 'In Drive' : 'On this phone';
        img.src = u;
        box.appendChild(img);
      } catch (e) {
        box.textContent = 'Could not show this copy (' + String(e && e.message || e).slice(0, 80) + ')';
      }
    };
    await put('drive', async () => { const b = await driveBlob(a.driveId); return a.kind === 'text' ? syncText(await b.text()) : b; });
    await put('phone', async () => {
      const rec = await dbGet('shots', [al.id, a.shotId]);
      if (!rec) throw new Error('not on this phone any more');
      return a.kind === 'text' ? syncText(rec.text) : rec.blob;
    });
  }
}
$('#btnChooseGo').onclick = async () => {
  const al = await dbGet('albums', $('#btnChooseGo').dataset.album);
  if (!al || !al.upload || al.upload.state !== 'ask' || !Array.isArray(al.upload.ask)) { chooseFree(); return goHome(); }
  const answers = Object.assign({}, al.upload.answers || {});
  for (const card of $$('#chooseList .choosecard')) {
    const a = al.upload.ask.find(x => x.name === card.dataset.name);
    const pick = card.querySelector('input:checked');
    if (!a || !pick) return toast('Choose Drive’s copy or this phone’s for each file', 3600);
    answers[a.name] = { pick: pick.value, p: a.p, d: a.d };
  }
  await setUpload(al, { state: 'queued', queued: Date.now(), answers, ask: null, error: '' });
  chooseFree();
  toast('Upload queued with your choices', 3000);
  goHome();
  pumpUploads();
};

/* ---------- Refresh all uploaded albums from Drive ---------- */
// A one-off for albums uploaded before this build: every album on the phone
// with a Drive folder takes the typed entries its folder holds wherever they
// differ from the phone's, so corrections made in Drive since come back.
// Photos stay as they are. It READS only - nothing in Drive is written - and
// it reads only a folder that is the album's own. Every folder it could not
// read is named.
// A typed entry the phone changed since its last upload is left as it is: the
// record of what was sent (al.sent) is no longer the phone's copy, so the next
// upload settles the two (a question when Drive changed too) - a refresh never
// puts Drive's text over an edit not yet uploaded. held: the names left so.
async function refreshAlbumFromDrive(al, held) {
  let f;
  try {
    f = await drive('https://www.googleapis.com/drive/v3/files/' + al.driveFolderId + '?fields=id,name,trashed,createdTime');
  } catch (e) {
    if (/Drive error 404\b/.test(String(e && e.message))) throw new Error('its Drive folder is gone');
    throw e;
  }
  if (!f || !f.id) throw new Error('its Drive folder did not answer');
  if (f.trashed) throw new Error('its Drive folder "' + f.name + '" is in the Drive Trash');
  const st = await folderStanding(f.id, al, f.createdTime);
  if (!st.mine) throw new Error('"' + f.name + '" is not this album’s folder, so it was not read');
  const files = await listAlbumFiles(f.id);
  const byId = Object.fromEntries((await shotsFor(al.id)).map(s => [s.shotId, s]));
  const sent = Object.assign({}, al.sent || {});
  let took = 0, noted = 0;
  for (const def of albumShots(al)) {
    if (def.type !== 'grade' && def.type !== 'matrix') continue;
    const name = baseNameFor(def, al) + '.txt';
    const df = files[name];
    if (!df) continue;
    const rec = byId[def.id];
    if (rec && rec.status !== 'text') continue;   // a photo in that entry stays as it is
    const t = syncText(await (await driveBlob(df.id)).text());
    if (!t) continue;
    if (rec && syncText(rec.text) === t) {
      sent[name] = await sha256Hex(new Blob([rec.text + '\n'], { type: 'text/plain' }));   // already equal: recorded
      noted++;
      continue;
    }
    if (rec && sent[name]) {
      const mine = await sha256Hex(new Blob([rec.text + '\n'], { type: 'text/plain' }));
      if (mine !== sent[name]) { if (held) held.push(name); continue; }   // edited on the phone since: the upload settles it
    }
    sent[name] = await settleText(al, { shotId: def.id }, t);
    took++;
  }
  if (took || noted) {
    al.sent = sent;
    await dbPut('albums', al);
    if (curAlbum && curAlbum.id === al.id) curAlbum.sent = al.sent;
  }
  return took;
}
async function refreshAllFromDrive() {
  const out = $('#refreshStatus'), btn = $('#btnRefreshDrive');
  const all = await dbAll('albums');
  if (all.some(uploadActive)) return toast('Wait for the uploads in progress to finish, then refresh.', 4000);
  const albums = all.filter(a => a.driveFolderId);
  if (!albums.length) { out.textContent = 'No album on this phone has a Drive folder yet.'; return; }
  btn.disabled = true;
  try {
    await getToken();
  } catch (e) {
    btn.disabled = false;
    return toast(e.message, 4500);
  }
  let read = 0, took = 0;
  const changed = [], unread = [], waiting = [], kept = [];
  for (let i = 0; i < albums.length; i++) {
    const al = albums[i];
    // An album whose upload is waiting on a question, or failed, is the
    // collector's to settle first: refreshing it would answer for Drive unasked.
    const ust = al.upload && al.upload.state;
    if (ust === 'ask' || ust === 'failed') {
      waiting.push(`${al.artist} — ${al.title}: ` + (ust === 'ask' ? 'its upload is waiting on your choice - answer it first' : 'its upload failed - retry it first'));
      continue;
    }
    out.textContent = `Reading ${i + 1}/${albums.length}: ${al.artist} — ${al.title}`;
    try {
      const held = [];
      const n = await refreshAlbumFromDrive(al, held);
      read++;
      took += n;
      if (n) changed.push(`${al.artist} — ${al.title}: ${n}`);
      if (held.length) kept.push(`${al.artist} — ${al.title}: ${held.join(', ')}`);
    } catch (e) {
      unread.push(`${al.artist} — ${al.title}: ${String(e && e.message || e).slice(0, 160)}`);
    }
  }
  btn.disabled = false;
  out.textContent =
    `Read ${read} of ${albums.length} album${albums.length === 1 ? '' : 's'}. ` +
    `${took} typed entr${took === 1 ? 'y' : 'ies'} taken from Drive onto this phone; photos left as they are; nothing in Drive changed.` +
    (changed.length ? '\n\nTaken:\n' + changed.join('\n') : '') +
    (kept.length ? '\n\nKept as typed on this phone (changed here since the last upload - the next upload settles them):\n' + kept.join('\n') : '') +
    (waiting.length ? `\n\nNot refreshed ${waiting.length}:\n` + waiting.join('\n') : '') +
    (unread.length ? `\n\nCould not read ${unread.length}:\n` + unread.join('\n') : '');
  toast(`Refreshed from Drive: ${took} typed entr${took === 1 ? 'y' : 'ies'} taken` +
    (waiting.length ? ` · ${waiting.length} waiting on an upload (listed below)` : '') +
    (unread.length ? ` · ${unread.length} folder${unread.length === 1 ? '' : 's'} could not be read (listed below)` : ''), 5000);
}

/* ---------- Google Picker: point the app at an EXISTING Drive folder ----------
 *
 * The app asks for the drive.file scope, which can only see files and folders
 * the app itself created. A folder made by hand in the Drive UI - or one
 * someone else owns and shared with you - is invisible to findFolder(), so
 * uploading "into" it by name quietly created a SECOND folder of the same name
 * that nobody else could see. Photos landed somewhere real and unshareable.
 *
 * Picking a folder in the Google Picker grants this app drive.file access to
 * that folder, which is the only way to reach one it did not create. Same idea
 * as IMPORT_FOLDER in the Sheet script, which takes an id or a plain name.
 *
 * The picker needs two more things from the same Cloud project as the Client
 * ID: an API key, and the project NUMBER (setAppId is required under
 * drive.file). Without them the app behaves exactly as before, by name.
 */
let pickerLoaded = null;
function loadPicker() {
  return pickerLoaded || (pickerLoaded = new Promise((res, rej) => {
    const fail = () => { pickerLoaded = null; rej(new Error('Could not load the Google folder picker (offline?)')); };
    const s = document.createElement('script');
    s.src = 'https://apis.google.com/js/api.js';
    s.onload = () => gapi.load('picker', { callback: res, onerror: fail });
    s.onerror = fail;
    document.head.appendChild(s);
  }));
}
function pickerReady() { return !!(cred('clientId') && cred('apiKey') && cred('projectNumber')); }
// Resolves to { id, name } for the folder chosen, or null if the owner cancels.
async function pickFolder() {
  if (!pickerReady())
    throw new Error('Linking needs the API key and project number in Settings, not just the Client ID');
  const token = await getToken();
  await loadPicker();
  return new Promise(res => {
    // DOCS, not FOLDERS, and no mimeTypes filter. Restricting the view to
    // folders alone hid every file, so each candidate folder looked identical
    // and empty - useless in a Drive holding eight folders whose names all
    // begin "Vinyl Curator". You have to be able to open one and see the
    // albums inside before you can say "yes, that one".
    const folderView = mine => {
      const v = new google.picker.DocsView(google.picker.ViewId.DOCS)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true);
      // LIST gives each row the full width. A grid truncates long, similar
      // names to nothing on a phone, which is exactly when this matters most.
      if (google.picker.DocsViewMode && google.picker.DocsViewMode.LIST) {
        v.setMode(google.picker.DocsViewMode.LIST);
      }
      // a folder someone shares with you sits in "Shared with me", never My Drive
      if (!mine && typeof v.setOwnedByMe === 'function') { v.setOwnedByMe(false); v.setLabel('Shared with me'); }
      return v;
    };
    const picker = new google.picker.PickerBuilder()
      .setTitle('Open a folder to check what is in it, then select it')
      .setDeveloperKey(cred('apiKey'))
      .setAppId(cred('projectNumber'))
      .setOAuthToken(token)
      .addView(folderView(true))
      .addView(folderView(false))
      .setCallback(d => {
        if (d.action === google.picker.Action.PICKED) {
          const doc = d.docs && d.docs[0];
          res(doc ? { id: doc.id, name: doc.name } : null);
        } else if (d.action === google.picker.Action.CANCEL) {
          res(null);
        }
      })
      .build();
    picker.setVisible(true);
  });
}
// Where a folder entry actually uploads to: the linked Drive folder when one
// was picked, otherwise the old find-or-create-by-name in My Drive.
async function resolveRootFolder(name) {
  const id = settings.driveFolderIds[name];
  if (!id) return findOrCreateFolder(name, 'root');
  try {
    const f = await drive('https://www.googleapis.com/drive/v3/files/' + id + '?fields=id,trashed');
    if (f && f.id && !f.trashed) return f.id;
  } catch (e) {
    // deleted, unshared, or access revoked - handled below
  }
  // Deliberately NOT falling back to creating "name" in My Drive: an invisible
  // duplicate of the shared folder is the exact failure linking exists to stop.
  throw new Error('The linked Drive folder for “' + name + '” can’t be opened — re-link it in ⚙ Settings.');
}

/* ---------- automatic sharing ----------
 *
 * The reason a client's photographs used to vanish was never the upload - it
 * was the sharing. They would make a folder by hand, forget to share it, or
 * share a DIFFERENT folder from the one the app wrote into, and the archive
 * saw nothing. Asking a client to get Drive sharing right by hand is asking
 * for the one step most likely to go wrong.
 *
 * So the app does it. A folder this app created is one it can also grant
 * permission on under drive.file, so the first upload into a folder offers to
 * share it, read-only, with the curator. Album subfolders inherit that, which
 * means every future upload arrives without anybody touching Drive again.
 *
 * Best-effort by design: a refusal or a failure must never cost the client
 * their upload, so this reports and returns rather than throwing.
 */
async function shareFolder(folderId, folderName, st) {
  const email = cred('shareWith');
  if (!email) return;
  const seen = (await dbGet('kv', 'sharedFolders')) || {};
  if (seen[folderId]) return;          // already handled, or already declined
  try {
    if (st) st.textContent = 'Checking folder sharing…';
    const perms = await drive('https://www.googleapis.com/drive/v3/files/' + folderId +
      '/permissions?fields=permissions(emailAddress)');
    const already = (perms.permissions || [])
      .some(p => String(p.emailAddress || '').toLowerCase() === email.toLowerCase());
    if (!already) {
      const ok = confirm(
        'Share “' + folderName + '” with ' + email + '?\n\n' +
        'Your album photos are saved into this folder in your own Google Drive. ' +
        'Sharing it read-only lets the archive collect them automatically — ' +
        'otherwise they stay where only you can see them.\n\n' +
        'You stay the owner. Nothing else in your Drive is shared, and you can ' +
        'stop sharing at any time from Drive itself.');
      if (!ok) {
        seen[folderId] = 'declined';
        await dbPut('kv', seen, 'sharedFolders');
        toast('Not shared — the folder stays private to you', 4500);
        return;
      }
      await drive('https://www.googleapis.com/drive/v3/files/' + folderId +
        '/permissions?sendNotificationEmail=true&fields=id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'user', role: 'reader', emailAddress: email }),
      });
      toast('Shared “' + folderName + '” with ' + email + ' ✓', 4000);
    }
    seen[folderId] = Date.now();
    await dbPut('kv', seen, 'sharedFolders');
  } catch (e) {
    // Commonly: the folder is one the client does not own (already linked and
    // shared TO them), where sharing is neither possible nor needed.
    console.error(e);
    toast('Couldn’t set up sharing on this folder — the upload continues', 4500);
  }
}

async function driveBlob(fileId) {
  const token = await getToken();
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (!res.ok) throw new Error('Drive error ' + res.status + ': ' + (await res.text()).slice(0, 200));
  return res.blob();
}
$('#btnDrive').onclick = async () => {
  const st = $('#exportStatus');
  if (!cred('clientId')) {
    st.innerHTML = 'Direct upload needs a <b>one-time Google setup</b> — open ⚙ <b>Settings</b> (top right of the home screen) and follow the steps under “Google Drive direct upload”.';
    toast('Not set up yet — see the note above', 5000);
    return;
  }
  const btn = $('#btnDrive');
  if (uploadActive(curAlbum)) return;
  btn.disabled = true;
  try {
    // Only the part that needs the collector runs here: sign-in, the folder
    // choice and its two questions. The photos themselves go up from the
    // queue while the next record is being shot.
    st.textContent = 'Signing in to Google…';
    await getToken();
    st.textContent = 'Finding Drive folder…';
    const importFolder = $('#expFolder').value || settings.driveFolder || 'Vinyl Curator';
    const root = await resolveRootFolder(importFolder);
    await shareFolder(root, importFolder, st);
    const folderName = sanitize(`${curAlbum.artist}_${curAlbum.title}`);
    const album = await resolveAlbumFolder(curAlbum, folderName, root, exportItems);
    curAlbum.driveFolderName = importFolder;
    curAlbum.driveFolderId = album.id;
    curAlbum.upload = {
      state: 'queued', albumFolder: album.name, importFolder, guard: 1,
      done: 0, total: exportItems.length, queued: Date.now(),
    };
    await dbPut('albums', curAlbum);
    toast(curAlbum.sent && Object.keys(curAlbum.sent).length
      ? `Queued — checking ${exportItems.length} files against Drive; only what changed goes up while you carry on`
      : `Queued ${exportItems.length} files — uploading while you carry on`, 3200);
    goHome();
    pumpUploads();
  } catch (e) {
    console.error(e);
    st.textContent = '';
    toast(e.message, 4500);
  } finally {
    btn.disabled = false;
  }
};

/* ---------- upload queue ----------
 *
 * An album's upload record lives on the album itself (album.upload), so the
 * home list is the queue and nothing needs a second store:
 *   queued    -> folder resolved, waiting its turn
 *   uploading -> files going up; done/total count
 *   paused    -> the Google token ran out and renewing it needs a tap
 *   failed    -> stopped with an error; retry from the home card
 *   ask       -> a file changed on this phone and in Drive: nothing of the
 *                album is sent until the collector chooses (the ⇄ button)
 * Finishing writes the manifest LAST, then the album's uploaded stamp, exactly
 * as the foreground upload did. The record is removed once the album is
 * uploaded; the "Uploaded albums" archive reads the stamp, not the record.
 *
 * The queue drains while the app is open on any screen. A phone that locks or
 * switches apps suspends the page; on the next open the queue resumes from
 * where it stopped. Every file that went up carries its hash (al.sent) the
 * moment it lands, so a resumed or retried album lists the folder again and
 * sends only what is not there yet.
 */
const UPLOAD_PARALLEL = 2;   // files in flight per album: enough to hide the round trip, not enough to starve the camera
let uploadPumpRunning = false;

// In progress or waiting; a failed album is free to be uploaded afresh.
function uploadActive(al) {
  return !!(al && al.upload && /^(queued|uploading|paused)$/.test(al.upload.state));
}
function uploadLabel(al) {
  const u = al.upload;
  if (!u) return '';
  if (u.state === 'queued') return '⏳ Waiting to upload';
  if (u.state === 'uploading') return `☁ Uploading ${u.done}/${u.total}…`;
  if (u.state === 'paused') return '⏸ Upload paused — sign in below to continue';
  if (u.state === 'failed') return '⚠ Upload failed — ' + (u.error || 'tap ↻ to retry');
  if (u.state === 'ask') return '⇄ Changed on this phone and in Drive — tap ⇄ to choose; nothing sent yet';
  return '';
}
// A token with less than two minutes left is not worth starting a file on:
// renewing one opens Google's sign-in, which only a tap may do.
function tokenFresh() {
  return !!(tokenInfo.token && Date.now() < tokenInfo.exp - 120000);
}
async function uploadQueue() {
  return (await dbAll('albums'))
    .filter(a => a.upload && (a.upload.state === 'queued' || a.upload.state === 'uploading' || a.upload.state === 'paused'))
    .sort((a, b) => (a.upload.queued || 0) - (b.upload.queued || 0));
}
async function setUpload(al, patch) {
  Object.assign(al.upload, patch);
  await dbPut('albums', al);
  if (curAlbum && curAlbum.id === al.id) {
    curAlbum.upload = al.upload;
    if (al.sent) curAlbum.sent = al.sent;   // a later save of the open album must not put back an older record
  }
  refreshUploadCards();
}
async function pumpUploads() {
  if (uploadPumpRunning) return;
  uploadPumpRunning = true;
  try {
    for (;;) {
      const queue = await uploadQueue();
      if (!queue.length) break;
      if (!tokenFresh()) {
        for (const al of queue) if (al.upload.state !== 'paused') await setUpload(al, { state: 'paused' });
        refreshUploadCards();
        break;
      }
      const al = queue[0];
      await uploadAlbum(al);
      if (al.upload && al.upload.state === 'paused') break;
    }
    if (settings.logCrops && settings.cropNotice) {
      try {
        const cn = await syncCropLogs();
        if (cn) toast(`+${cn} crop training example${cn === 1 ? '' : 's'} sent`, 3000);
      } catch (e) { console.error('crop sync', e); }
    }
  } finally {
    uploadPumpRunning = false;
    refreshUploadCards();
  }
}
async function uploadAlbum(al) {
  const folder = al.driveFolderId;
  try {
    // Checked again as the files go up, not only when the folder was chosen: an
    // upload resumed or retried later must not write into a folder that another
    // album owns (2026-10-13 - see resolveAlbumFolder).
    const st = await folderStanding(folder, al);
    // a record queued by the build before this guard, into a folder with no
    // album.json, is not trusted: its folder may be another copy's (the old
    // clash question's Cancel merged), so it is chosen again with the questions
    const oldRecord = !st.own && !(al.upload && al.upload.guard) && al.madeFolderId !== folder && !al.ownerId;
    if (!st.mine || oldRecord) {
      // the instruction first: the card keeps 120 characters of an error
      const refused = new Error('Not uploaded: that Drive folder is not this album\'s. Tap Upload to choose a folder. (It holds ' +
        (st.own ? ownerText(st.own) : 'photos from before album records were kept') + '.)');
      refused.ownerRefused = true;
      throw refused;
    }
    const items = await buildExportItems(al);
    if (!items.length) throw new Error('Nothing to upload — no photos or text saved');
    // The folder is listed ONCE and every file decided before anything goes up
    // (see "re-upload: only what changed"). A listing or a read that fails
    // stops the album here with nothing sent - never "Drive has nothing".
    let rows;
    try {
      rows = await planSync(al, items, folder);
    } catch (e) {
      throw new Error('Not uploaded: the Drive folder could not be read, so nothing was sent. Tap ↻ to try again. (' +
        String(e && e.message || e) + ')');
    }
    const asks = rows.filter(r => r.act === 'ask');
    if (asks.length) {
      // one question for the album, however many files it covers
      await setUpload(al, { state: 'ask', error: '', ask: asks.map(r => ({
        name: r.it.name, kind: r.it.kind, shotId: r.it.shotId || '', driveId: r.df.id, p: r.it.hash, d: r.d, why: r.why,
      })) });
      toast(`${al.artist} — ${al.title}: changed on this phone and in Drive. Nothing was sent — tap ⇄ on its card to choose.`, 5000);
      return;
    }
    al.sent = al.sent || {};
    for (const r of rows) {
      if (r.act === 'heal') al.sent[r.it.name] = await settleText(al, r.it, r.dText);
      else if (r.act !== 'send') al.sent[r.it.name] = r.it.hash;   // skip, keep, hold: settled as they stand
    }
    const sends = rows.filter(r => r.act === 'send');
    await setUpload(al, { state: 'uploading', done: 0, total: sends.length, error: '', ask: null });
    let next = 0, failed = null, paused = false;
    const worker = async () => {
      while (next < sends.length && !failed && !paused) {
        if (!tokenFresh()) { paused = true; break; }
        const r = sends[next++];
        try {
          await uploadFile(folder, r.it.name, r.it.mime, r.it.blob);
          al.sent[r.it.name] = r.it.hash;   // what went up, recorded as it lands: a resumed round skips it
          await setUpload(al, { done: al.upload.done + 1 });
        } catch (e) { failed = e; }
      }
    };
    await Promise.all(Array.from({ length: Math.min(UPLOAD_PARALLEL, sends.length) }, worker));
    if (failed) throw failed;
    if (paused) { await setUpload(al, { state: 'paused' }); return; }
    // Last, so a manifest only ever describes a folder whose photos arrived.
    await writeAlbumManifest(folder, al);
    al.uploaded = Date.now();
    delete al.upload;
    await dbPut('albums', al);
    if (curAlbum && curAlbum.id === al.id) curAlbum = al;
    const said = syncSummary(rows);
    toast(`Uploaded ${al.artist} — ${al.title} ✓ (${said.head})${said.more}`, said.more ? 7000 : 3600);
    if ($('#scr-home').classList.contains('active')) goHome();
  } catch (e) {
    console.error('upload', al.id, e);
    const msg = String(e && e.message || e);
    // A refused or cancelled sign-in mid-run is a pause, not a failure.
    if (!(e && e.ownerRefused) && /sign-in|token|401/i.test(msg)) { await setUpload(al, { state: 'paused' }); return; }
    await setUpload(al, { state: 'failed', error: msg.slice(0, 120) });
  }
}
// Repaint the status line on every home card that carries an upload record,
// without rebuilding the list (which would re-read every album's photos).
function refreshUploadCards() {
  if (!$('#scr-home').classList.contains('active')) return;
  (async () => {
    const albums = await dbAll('albums');
    const byId = Object.fromEntries(albums.map(a => [a.id, a]));
    $$('#albumList .albumcard[data-album]').forEach(card => {
      const al = byId[card.dataset.album];
      const line = card.querySelector('.al-up');
      if (!al || !line) return;
      const text = uploadLabel(al);
      line.textContent = text;
      line.className = 'al-up' + (al.upload ? ' ' + al.upload.state : '');
      line.classList.toggle('hidden', !text);
      card.querySelector('.al-del').classList.toggle('hidden', !!(al.upload && al.upload.state === 'uploading'));
      const state = al.upload && al.upload.state, retry = card.querySelector('.al-retry');
      retry.classList.toggle('hidden', !(state === 'failed' || state === 'ask'));
      retry.textContent = state === 'ask' ? '⇄' : '↻';
      retry.setAttribute('aria-label', state === 'ask' ? 'Choose what to keep' : 'Retry upload');
    });
    const waiting = albums.filter(a => a.upload && a.upload.state === 'paused').length;
    const btn = $('#btnUploadSignin');
    btn.classList.toggle('hidden', !waiting);
    btn.textContent = `Sign in to continue ${waiting} upload${waiting === 1 ? '' : 's'}`;
  })();
}
$('#btnUploadSignin').onclick = async () => {
  try {
    await getToken();                       // a tap: Google's sign-in may open
    for (const al of await uploadQueue())
      if (al.upload.state === 'paused') await setUpload(al, { state: 'queued' });
    pumpUploads();
  } catch (e) { toast(e.message, 4000); }
};
// Resume on open and on every return to the foreground; without a fresh token
// the pump marks the albums paused and the home screen offers the sign-in.
document.addEventListener('visibilitychange', () => { if (!document.hidden) pumpUploads(); });

/* ---------- uploaded albums (Drive archive) ---------- */
let arcUrls = [];
let arcAlbumFolder = null;
function arcFree() { arcUrls.forEach(u => URL.revokeObjectURL(u)); arcUrls = []; }
$('#btnArchive').onclick = () => openArchive();

async function openArchive() {
  arcFree();
  show('scr-archive', { title: 'Uploaded albums', back: goHome });
  const sel = $('#arcFolder');
  const last = (await dbGet('kv', 'arcFolder')) || settings.driveFolder;
  sel.innerHTML = settings.driveFolders
    .map(f => `<option${f === last ? ' selected' : ''}>${esc(f)}</option>`).join('');
  sel.classList.toggle('hidden', settings.driveFolders.length < 2 || !cred('clientId'));
  // the one-off that takes Drive's typed entries back onto this phone (reads Drive only)
  $('#btnRefreshDrive').classList.toggle('hidden', !cred('clientId'));
  $('#refreshHint').classList.toggle('hidden', !cred('clientId'));
  $('#refreshStatus').textContent = '';
  await loadArchive();
}
$('#arcFolder').onchange = () => loadArchive();
$('#btnRefreshDrive').onclick = () => refreshAllFromDrive();

async function loadArchive() {
  const st = $('#arcStatus'), list = $('#arcList');
  list.innerHTML = '';
  // albums hidden after a Share-sheet upload — Drive can't show these to the app, but they're still on the phone
  const local = (await dbAll('albums'))
    .filter(a => a.uploaded && !a.driveFolderId)
    .sort((a, b) => b.uploaded - a.uploaded);
  for (const al of local) {
    const row = document.createElement('div');
    row.className = 'albumcard';
    row.innerHTML =
      `<button class="al-open"><div class="al-art">${esc(al.artist)}</div>` +
      `<div class="al-title">${esc(al.title)}</div>` +
      `<div class="al-meta">📱 uploaded via Share · photos still on this phone</div></button>` +
      `<button class="al-del" aria-label="Move back to home screen">↩</button>`;
    row.querySelector('.al-open').onclick = () => openAlbum(al.id);
    row.querySelector('.al-del').onclick = async () => {
      delete al.uploaded;
      await dbPut('albums', al);
      toast('Album is back on the home screen');
      goHome();
    };
    list.appendChild(row);
  }
  if (!cred('clientId')) {
    st.textContent = 'Browsing your Drive folders here needs the one-time Google setup — see ⚙ Settings → “Google Drive direct upload”.';
    return;
  }
  const name = $('#arcFolder').value || settings.driveFolder;
  await dbPut('kv', name, 'arcFolder');
  try {
    st.textContent = 'Loading from Google Drive…';
    const root = settings.driveFolderIds[name]
      ? await resolveRootFolder(name)
      : await findFolder(name, 'root');
    if (!root) {
      st.textContent = `No “${name}” folder in Drive yet — it’s created the first time you upload an album to it.`;
      return;
    }
    const q = `mimeType='application/vnd.google-apps.folder' and '${root}' in parents and trashed=false`;
    const r = await drive('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) +
      '&fields=files(id,name)&orderBy=name&pageSize=1000');
    const folders = r.files || [];
    st.textContent = folders.length
      ? (local.length ? 'In Drive:' : '')
      : `No albums in “${name}” yet.` + (local.length ? '' : ' Upload one with “Upload to Google Drive” and it will appear here.');
    for (const f of folders) {
      const row = document.createElement('div');
      row.className = 'albumcard';
      row.innerHTML =
        `<button class="al-open"><div class="al-art">${esc(f.name.replace('_', ' — '))}</div>` +
        `<div class="al-meta">📁 in Drive · ${esc(name)}</div></button>`;
      row.querySelector('.al-open').onclick = () => openArcAlbum(f);
      list.appendChild(row);
    }
  } catch (e) {
    console.error(e);
    st.textContent = 'Couldn’t load from Drive.';
    toast(e.message, 4500);
  }
}

async function openArcAlbum(f) {
  arcFree();
  arcAlbumFolder = f;
  show('scr-arcalbum', { title: f.name.replace('_', ' — '), back: openArchive });
  $('#arcAlbumHdr').textContent = f.name.replace('_', ' — ');
  const list = $('#arcShots');
  list.innerHTML = '';
  $('#arcAlbumStatus').textContent = 'Loading…';
  const localAl = (await dbAll('albums')).find(a => a.driveFolderId === f.id);
  const unhide = $('#btnUnhide');
  unhide.classList.toggle('hidden', !localAl);
  unhide.onclick = localAl ? async () => {
    delete localAl.uploaded;
    await dbPut('albums', localAl);
    toast('Album is back on the home screen');
    openAlbum(localAl.id);
  } : null;
  const reBtn = $('#btnReimport');
  reBtn.classList.toggle('hidden', !!localAl);
  reBtn.disabled = false;
  reBtn.onclick = localAl ? null : () => reimportAlbum(f);
  try {
    const q = `'${f.id}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'`;
    const r = await drive('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) +
      '&fields=files(id,name,mimeType,thumbnailLink)&orderBy=name&pageSize=1000');
    const files = r.files || [];
    $('#arcAlbumStatus').textContent = files.length ? '' : 'This folder is empty.';
    for (const file of files) {
      const isImg = (file.mimeType || '').startsWith('image/');
      const item = document.createElement('button');
      item.className = 'shotitem';
      item.innerHTML =
        `<span class="thumb">${isImg ? '📷' : '⌨'}</span>` +
        `<span class="shotname">${esc(file.name)}</span>`;
      if (isImg) arcThumb(file, item.querySelector('.thumb'));
      item.onclick = () => openArcView(file);
      list.appendChild(item);
    }
  } catch (e) {
    console.error(e);
    $('#arcAlbumStatus').textContent = '';
    toast(e.message, 4500);
  }
}
function arcThumb(file, holder) {
  const img = document.createElement('img');
  img.alt = '';
  img.onload = () => { holder.textContent = ''; holder.appendChild(img); };
  img.onerror = async () => {
    img.onerror = null;
    try {
      const u = URL.createObjectURL(await driveBlob(file.id));
      arcUrls.push(u);
      img.src = u;
    } catch {}
  };
  if (file.thumbnailLink) img.src = file.thumbnailLink;
  else img.onerror();
}

/* ---------- re-import an uploaded album from Drive ---------- */
// Artist and title for a Drive album folder. The manifest wins; the folder
// name is the fallback for folders uploaded before the app wrote one, and its
// trailing " (2)" is dropped - that suffix keeps two FOLDERS apart and is not
// part of the record's title. The sheet's albumIdentityFrom_ does the same.
function identityFromFolder(folderName, manifest) {
  if (manifest) {
    const a = String(manifest.artist || '').trim();
    const t = String(manifest.title || '').trim();
    if (a || t) return { artist: a, title: t || '(untitled)' };
  }
  const us = folderName.indexOf('_');
  if (us < 1) return { artist: folderName, title: '(untitled)' };
  return {
    artist: folderName.slice(0, us),
    title: folderName.slice(us + 1).replace(/\s*\(\d+\)\s*$/, '') || '(untitled)',
  };
}

// Which file feeds which entry, planned before anything is downloaded. A
// file's shot number opens the LAST " - " part of its name, as the sheet
// reads it: "Leonard Cohen - 10 New Songs - 06 Side 1 Label.jpg" is
// shot 06, never 10. A box set's LP files carry their LP token there instead
// ("... - LP3 Side 5 Label.jpg", "... - LP3 Jacket.jpg").
function reimportJobs(files) {
  const jobs = [];
  for (const file of files) {
    const isImg = (file.mimeType || '').startsWith('image/');
    const isTxt = !isImg && (/\.txt$/i.test(file.name) || (file.mimeType || '').startsWith('text/'));
    const lm = file.name.match(/ - LP(\d{1,2}) (?!.* - )(.+?)(?:\.[^.]+)?$/);
    if (lm) {
      const n = Number(lm[1]), rest = lm[2];
      if (rest === 'Jacket') {
        if (isImg && n >= 1) jobs.push({ kind: 'photo', def: lpJacketDef(n), file });
        continue;
      }
      if (n < 3) continue;   // LP 1 and LP 2 are named by their shot numbers
      const defs = lpSideDefs(n);
      const ofSide = (s, what) => (Number(s) === 2 * n - 1 || Number(s) === 2 * n) ? defs.find(d => d.id === `s${Number(s)}${what}`) : null;
      let m, def;
      if ((m = /^Side (\d+) (Label|Vinyl)$/.exec(rest)) && (def = ofSide(m[1], m[2].toLowerCase()))) {
        if (isImg) jobs.push({ kind: 'photo', def, file });
      } else if ((m = /^Vinyl Grade Side (\d+)$/.exec(rest)) && (def = ofSide(m[1], 'grade'))) {
        if (isTxt) jobs.push({ kind: 'text', def, file });
      } else if ((m = /^Side (\d+) Matrix Runout(?: ([1-4]))?$/.exec(rest)) && (def = ofSide(m[1], 'matrix'))) {
        if (!m[2] && isTxt) jobs.push({ kind: 'mtext', def, file, legacy: false });
        else if (m[2] && isImg) jobs.push({ kind: 'slot', def, file, slot: Number(m[2]) });
      }
      continue;
    }
    const nm = file.name.match(/ - (\d\d)(?!.* - ) /);
    if (!nm) continue;
    const num = Number(nm[1]);
    if (num >= 14 && num <= 21) {
      // matrix/runout block; odd numbers are the retired Dead Wax Other files
      const def = SHOTS.find(s => s.id === `s${Math.floor((num - 14) / 2) + 1}matrix`);
      if (!def) continue;
      if (isTxt) jobs.push({ kind: 'mtext', def, file, legacy: num % 2 === 1 });
      else if (isImg) {
        const sm = file.name.match(/ [A-D]([1-4])\.[^.]+$/i);
        jobs.push({ kind: 'slot', def, file, slot: sm ? Number(sm[1]) : null });
      }
      continue;
    }
    const def = SHOTS.find(s => s.n === num);
    if (!def) continue;
    if (def.type === 'grade' && isTxt) jobs.push({ kind: 'text', def, file });
    else if (def.type !== 'grade' && isImg) jobs.push({ kind: 'photo', def, file });
  }
  return jobs;
}
// A box set comes back a box set with its count of LPs (album.json says so,
// and so does any LP file); any other album as it always did - two discs when
// a side 3-4 file is there.
function reimportShape(jobs, manifest) {
  const box = !!(manifest && manifest.box === true) || jobs.some(j => j.def.tok);
  if (!box) return { discs: jobs.some(j => j.def.disc === 2) ? 2 : 1 };
  const said = Number(manifest && manifest.discs) || 0;
  return { box: true, discs: Math.min(BOX_MAX_LPS, Math.max(1, said, ...jobs.map(j => j.def.disc || 1))) };
}

async function reimportAlbum(f) {
  const st = $('#arcAlbumStatus');
  const btn = $('#btnReimport');
  // The listing and the manifest come first, because what this album is called
  // decides what the duplicate question asks. Their own try: this runs before
  // the download loop below, and a failed listing is not a failed download.
  let files, manifest = null;
  try {
    const q = `'${f.id}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'`;
    // Drive's own SHA-256 of each file comes with the listing: what is
    // downloaded below is recorded with it (al.sent - see below)
    const r = await drive('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) +
      '&fields=files(id,name,mimeType,sha256Checksum)&orderBy=name&pageSize=1000');
    files = r.files || [];
    const mf = files.find(x => x.name === 'album.json');
    // A manifest that will not read is not an error: the folder name still answers.
    if (mf) {
      try { manifest = JSON.parse(await (await driveBlob(mf.id)).text()); } catch (e) { manifest = null; }
    }
  } catch (e) {
    console.error(e);
    toast('Could not read that folder: ' + e.message, 4500);
    return;
  }
  const { artist, title } = identityFromFolder(f.name, manifest);
  const dup = (await dbAll('albums')).find(a =>
    a.artist.toLowerCase() === artist.toLowerCase() && a.title.toLowerCase() === title.toLowerCase());
  if (dup && !confirm(`"${artist} — ${title}" already exists on this phone. Download a second copy anyway?`)) return;
  btn.disabled = true;
  try {
    // plan which file feeds which record before downloading anything
    const jobs = reimportJobs(files);
    if (!jobs.length) {
      st.textContent = '';
      btn.disabled = false;
      return toast('No recognizable album files in this folder.');
    }
    const shape = reimportShape(jobs, manifest);
    const al = {
      id: Date.now().toString(36),
      artist, title,
      discs: shape.discs,
      ...(shape.box ? { box: true } : {}),
      created: Date.now(),
      upc: upcCheck(manifest && manifest.upc) || '',
      personalNote: String((manifest && manifest.personalNote) || ''),
      gradeNotes: gradeNotesFromManifest(manifest),
      driveFolderName: $('#arcFolder').value || settings.driveFolder,
      driveFolderId: f.id,
      // linked to that folder, but not its owner until the collector says it
      // is the same copy (resolveAlbumFolder asks on the first upload)
      reimportedFrom: f.id,
    };
    const taken = {};
    const texts = {};      // matrix shotId -> {main, extra[], mains[]}
    const usedSlots = {};  // matrix shotId -> {slotNumber: true}
    // WHAT WAS DOWNLOADED IS THE RECORD (owner, 2026-10-29): each file the
    // phone now holds as it is in Drive is recorded, by its name, with Drive's
    // own SHA-256 from the listing above (al.sent, the re-upload's record). So a
    // photo re-shot on the phone before the first re-upload is SENT - the phone
    // changed, Drive did not - instead of kept for want of a record, and a
    // photo changed in Drive since stays Drive's. A runout entry merged from
    // more than one file is no one file's copy and is left unrecorded.
    const sent = {};
    const recordAsDrive = file => { if (file && file.sha256Checksum) sent[file.name] = file.sha256Checksum; };
    let done = 0;
    for (const j of jobs) {
      done++;
      st.textContent = `Downloading ${done}/${jobs.length}: ${j.file.name}`;
      const blob = await driveBlob(j.file.id);
      if (j.kind === 'photo') {
        if (taken[j.def.id]) continue;
        taken[j.def.id] = true;
        await dbPut('shots', { albumId: al.id, shotId: j.def.id, status: 'done', blob, when: Date.now() });
        recordAsDrive(j.file);
      } else if (j.kind === 'text') {
        if (taken[j.def.id]) continue;
        taken[j.def.id] = true;
        const t = (await blob.text()).trim();
        if (t) {
          await dbPut('shots', { albumId: al.id, shotId: j.def.id, status: 'text', text: t, when: Date.now() });
          recordAsDrive(j.file);
        }
      } else if (j.kind === 'mtext') {
        const t = (await blob.text()).trim();
        if (!t) continue;
        const cur = texts[j.def.id] || (texts[j.def.id] = { main: '', extra: [], mains: [] });
        if (j.legacy) cur.extra.push(t);
        else { cur.main = cur.main ? cur.main + '\n' + t : t; cur.mains.push(j.file); }
      } else if (j.kind === 'slot') {
        const used = usedSlots[j.def.id] || (usedSlots[j.def.id] = {});
        let slot = j.slot;
        if (!slot || used[slot]) slot = SLOTS.find(s2 => !used[s2]);
        if (!slot) continue;
        used[slot] = true;
        await dbPut('shots', { albumId: al.id, shotId: slotId(j.def, slot), status: 'photo', blob, when: Date.now() });
        recordAsDrive(j.file);
      }
    }
    for (const sid of Object.keys(texts)) {
      const t = [texts[sid].main, ...texts[sid].extra].filter(Boolean).join('\n');
      if (t) await dbPut('shots', { albumId: al.id, shotId: sid, status: 'text', text: t, when: Date.now() });
      if (t && !texts[sid].extra.length && texts[sid].mains.length === 1) recordAsDrive(texts[sid].mains[0]);
    }
    if (Object.keys(sent).length) al.sent = sent;
    await dbPut('albums', al);
    st.textContent = '';
    toast('Album downloaded ✓ — add to it, then re-upload when done');
    openAlbum(al.id);
  } catch (e) {
    console.error(e);
    st.textContent = '';
    btn.disabled = false;
    toast('Download failed: ' + e.message, 4500);
  }
}

async function openArcView(file) {
  show('scr-arcview', { title: 'Uploaded file', back: () => openArcAlbum(arcAlbumFolder) });
  $('#arcViewName').textContent = file.name;
  $('#arcViewImg').classList.add('hidden');
  $('#arcViewText').classList.add('hidden');
  $('#arcViewStatus').textContent = 'Loading…';
  try {
    const blob = await driveBlob(file.id);
    if ((file.mimeType || '').startsWith('image/')) {
      const u = URL.createObjectURL(blob);
      arcUrls.push(u);
      $('#arcViewImg').src = u;
      $('#arcViewImg').classList.remove('hidden');
    } else {
      $('#arcViewText').textContent = await blob.text();
      $('#arcViewText').classList.remove('hidden');
    }
    $('#arcViewStatus').textContent = '';
  } catch (e) {
    console.error(e);
    $('#arcViewStatus').textContent = 'Couldn’t load this file.';
    toast(e.message, 4500);
  }
}

/* ---------- settings ---------- */
let editFolders = [], editDefault = '', editFolderIds = {};
function renderFolderList() {
  const list = $('#folderList');
  list.innerHTML = '';
  for (const f of editFolders) {
    const isDef = f === editDefault;
    const row = document.createElement('div');
    row.className = 'folderrow';
    const linked = editFolderIds[f];
    row.innerHTML =
      `<button class="f-pick">${isDef ? '●' : '○'} ${esc(f)}${isDef ? ' <em>· default</em>' : ''}` +
      `${linked ? '<em class="f-linked">🔗 linked to this folder in Drive</em>' : ''}</button>` +
      `<button class="f-link">${linked ? 'Linked' : 'Link…'}</button>` +
      (editFolders.length > 1 ? '<button class="f-del" aria-label="Remove folder">✕</button>' : '');
    row.querySelector('.f-pick').onclick = () => { editDefault = f; renderFolderList(); };
    row.querySelector('.f-link').onclick = () => linkFolder(f);
    const del = row.querySelector('.f-del');
    if (del) del.onclick = () => {
      editFolders = editFolders.filter(x => x !== f);
      if (editDefault === f) editDefault = editFolders[0];
      renderFolderList();
    };
    list.appendChild(row);
  }
}
// The picker needs live credentials and the owner may have only just typed
// them, so take them off the form - and keep them - before opening it.
async function syncCredsFromForm() {
  const was = [settings.clientId, settings.apiKey, settings.projectNumber].join('|');
  settings.clientId = $('#inClientId').value.trim();
  settings.apiKey = $('#inApiKey').value.trim();
  settings.projectNumber = $('#inProjectNumber').value.trim();
  if ([settings.clientId, settings.apiKey, settings.projectNumber].join('|') === was) return;
  tokenInfo = { token: null, exp: 0 };   // a different client id invalidates the old token
  await saveSettings();
}
async function linkFolder(f) {
  if (editFolderIds[f]) {
    if (!confirm('“' + f + '” is linked to a folder in Drive.\n\n' +
      'OK = unlink it. Uploads go back to a folder of this name in My Drive.\n\n' +
      'Cancel = keep the link.')) return;
    delete editFolderIds[f];
    renderFolderList();
    return;
  }
  try {
    await syncCredsFromForm();
    const picked = await pickFolder();
    if (!picked) return;
    // Take the folder's real Drive name so the list and Drive agree, and so the
    // Sheet script's import-by-name keeps matching.
    if (picked.name !== f) {
      if (editFolders.some(x => x !== f && x.toLowerCase() === picked.name.toLowerCase()))
        return toast('“' + picked.name + '” is already in the list');
      editFolders = editFolders.map(x => (x === f ? picked.name : x));
      if (editDefault === f) editDefault = picked.name;
      delete editFolderIds[f];
    }
    editFolderIds[picked.name] = picked.id;
    renderFolderList();
    toast('Linked to “' + picked.name + '” in Drive ✓', 3600);
  } catch (e) {
    console.error(e);
    toast(e.message, 5000);
  }
}
$('#btnAddFolder').onclick = () => {
  const name = sanitize($('#inNewFolder').value);
  if (!name) return toast('Type a folder name first');
  if (editFolders.some(f => f.toLowerCase() === name.toLowerCase())) return toast('That folder is already in the list');
  editFolders.push(name);
  $('#inNewFolder').value = '';
  renderFolderList();
};
function openSettings() {
  $('#inClientId').value = settings.clientId;
  $('#inApiKey').value = settings.apiKey;
  $('#inAutoCrop').checked = settings.autoCrop !== false;
  $('#inAutoLevel').checked = settings.autoLevel !== false;
  $('#inLogCrops').checked = !!settings.logCrops;
  updateCropStat();
  $('#inProjectNumber').value = settings.projectNumber;
  $('#inShareWith').value = settings.shareWith;
  // a built-in value is shown as the placeholder, so leaving the box empty
  // visibly means "use the one this build ships with"
  $('#inShareWith').placeholder = BUILTIN.shareWith || 'nobody — uploads stay private';
  $('#inClientId').placeholder = BUILTIN.clientId || 'xxxxxxxx.apps.googleusercontent.com';
  $('#builtinNote').classList.toggle('hidden', !BUILTIN.clientId);
  editFolders = [...settings.driveFolders];
  editDefault = settings.driveFolder;
  editFolderIds = { ...settings.driveFolderIds };
  $('#inNewFolder').value = '';
  renderFolderList();
  $('#inMaxOut').value = String(settings.maxOut);
  $('#inQuality').value = String(settings.quality);
  show('scr-settings', { title: 'Settings', back: goHome });
}
$('#btnSaveSettings').onclick = async () => {
  settings.clientId = $('#inClientId').value.trim();
  settings.apiKey = $('#inApiKey').value.trim();
  settings.autoCrop = $('#inAutoCrop').checked;
  settings.autoLevel = $('#inAutoLevel').checked;
  const cropsWere = settings.logCrops;
  settings.logCrops = $('#inLogCrops').checked;
  if (settings.logCrops) settings.cropNotice = settings.cropNotice || 1;   // ticked with its description in view
  else if (cropsWere) await dropUnsentCrops();
  settings.projectNumber = $('#inProjectNumber').value.trim();
  const shareWas = cred('shareWith');
  settings.shareWith = $('#inShareWith').value.trim();
  // a new address has shared nothing yet, so let every folder be offered again
  if (cred('shareWith') !== shareWas) await dbPut('kv', {}, 'sharedFolders');
  settings.driveFolders = editFolders.length ? [...editFolders] : ['Vinyl Curator'];
  settings.driveFolder = settings.driveFolders.includes(editDefault) ? editDefault : settings.driveFolders[0];
  settings.driveFolderIds = {};
  for (const f of settings.driveFolders)
    if (editFolderIds[f]) settings.driveFolderIds[f] = editFolderIds[f];
  settings.maxOut = Number($('#inMaxOut').value) || 2400;
  settings.quality = Number($('#inQuality').value) || 0.92;
  await saveSettings();
  toast('Settings saved');
  goHome();
};
$('#btnWipe').onclick = async () => {
  if (!confirm('Delete ALL albums, photos, and settings stored by this app on this phone?')) return;
  await dbClear('shots');
  await dbClear('albums');
  await dbClear('croplog');   // crop training copies not yet sent
  await dbClear('checks');    // record checks and their photos
  await dbClear('kv');
  toast('All app data deleted');
  goHome();
};

/* ---------- install prompt ---------- */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  $('#btnInstall').classList.remove('hidden');
});
$('#btnInstall').onclick = () => {
  if (deferredPrompt) deferredPrompt.prompt();
  deferredPrompt = null;
  $('#btnInstall').classList.add('hidden');
};
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  $('#btnInstall').classList.add('hidden');
  $('#iosInstall').classList.add('hidden');
});

function isStandalone() {
  return navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
}

/* iOS never fires beforeinstallprompt — Share → Add to Home Screen is the only
   route there — so coach it instead. iPadOS reports itself as a Macintosh,
   hence the touch-points test. */
function isIOS() {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}
async function maybeCoachIosInstall() {
  if (!isIOS() || isStandalone()) return;
  if (await dbGet('kv', 'iosInstallDismissed')) return;
  $('#iosInstall').classList.remove('hidden');
}
$('#btnIosDismiss').onclick = async () => {
  $('#iosInstall').classList.add('hidden');
  await dbPut('kv', 1, 'iosInstallDismissed');
};

/* ---------- service worker + update prompt ---------- */
/* An installed app has no address bar and no reliable way to force a reload, so
   a new version has to announce itself. The worker waits until the user taps
   Update; skipWaiting then triggers controllerchange, and we reload once. */
let swReg = null;
let updateRequested = false;

$('#btnUpdate').onclick = () => {
  $('#btnUpdate').disabled = true;
  updateRequested = true;
  if (swReg && swReg.waiting) swReg.waiting.postMessage('SKIP_WAITING');
  else location.reload();
};

async function initServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(location.hostname)) return;

  // On a first-ever install the worker's clients.claim() also fires
  // controllerchange. That is not an update, and reloading on it would make the
  // very first visit flicker for no reason. Reload only when this page was
  // already controlled, or when the user actually asked for the update (a
  // deploy landing during someone's first session is otherwise missed).
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !(hadController || updateRequested)) return;
    reloading = true;
    location.reload();
  });

  // updateViaCache:'none' — never let the HTTP cache answer the worker-script
  // update check, so a resume always compares against the freshest deploy.
  try { swReg = await navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }); }
  catch (e) { return; }

  // controller check throughout: on a first-ever install there is no old
  // version to update from, and the bar would be a lie.
  const announce = () => { if (navigator.serviceWorker.controller) $('#updateBar').classList.remove('hidden'); };

  if (swReg.waiting) announce();                    // left waiting by an earlier session
  swReg.addEventListener('updatefound', () => {
    const nw = swReg.installing;
    if (!nw) return;
    nw.addEventListener('statechange', () => { if (nw.state === 'installed') announce(); });
  });

  // A standalone app is resumed far more often than it is launched, so a resume
  // is our real chance to notice a new build. Await the update check, then
  // announce a worker that is already waiting — don't rely only on catching the
  // updatefound event in the moment (a resume can land after it fired, or after
  // one was left waiting while backgrounded). This is what makes the bar appear
  // on a plain reopen, instead of only after a manual pull-to-refresh.
  const checkForUpdate = async () => {
    if (!swReg) return;
    try { await swReg.update(); } catch (e) {}
    if (swReg.waiting) announce();
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkForUpdate(); });
}

async function showVersion() {
  $('#verStamp').textContent = APP_VERSION;
  if (isStandalone()) $('#verInstalled').textContent = ' — installed';
}

/* ---------- one-time migration: Dead Wax Other entries fold into Matrix/Runout ---------- */
async function migrateRunout() {
  if (await dbGet('kv', 'migratedRunout')) return;
  const albums = await dbAll('albums');
  for (const al of albums) {
    const shots = await shotsFor(al.id);
    const byId = Object.fromEntries(shots.map(s => [s.shotId, s]));
    for (const side of [1, 2, 3, 4]) {
      const mxId = `s${side}matrix`, dwoId = `s${side}dwo`;
      const mx = byId[mxId], dwo = byId[dwoId];
      const putSlot = async blob => {
        const free = SLOTS.find(n => !byId[`${mxId}_p${n}`]);
        if (!free) return;
        const rec = { albumId: al.id, shotId: `${mxId}_p${free}`, status: 'photo', blob, when: Date.now() };
        byId[rec.shotId] = rec;
        await dbPut('shots', rec);
      };
      // a matrix photo saved while matrix entries were camera-first becomes slot photo 1
      if (mx && mx.status === 'done' && mx.blob) {
        await putSlot(mx.blob);
        delete byId[mxId];
        await dbDel('shots', [al.id, mxId]);
      }
      if (!dwo) continue;
      if (dwo.status === 'text' && dwo.text) {
        const cur = byId[mxId];
        const merged = cur && cur.status === 'text' && cur.text ? cur.text + '\n' + dwo.text : dwo.text;
        const rec = { albumId: al.id, shotId: mxId, status: 'text', text: merged, when: Date.now() };
        byId[mxId] = rec;
        await dbPut('shots', rec);
      } else if (dwo.status === 'done' && dwo.blob) {
        await putSlot(dwo.blob);
      }
      await dbDel('shots', [al.id, dwoId]);
    }
  }
  await dbPut('kv', 1, 'migratedRunout');
}

/* ---------- init ---------- */
(async function init() {
  await loadSettings();
  try { await migrateRunout(); } catch (e) { console.error('runout migration failed', e); }
  initServiceWorker();
  showVersion();
  maybeCoachIosInstall().catch(() => {});
  await goHome();
  try { await maybeCropNotice(); } catch (e) { console.error('crop notice', e); }
  pumpUploads();   // an interrupted queue: no token yet, so this marks it paused and shows the sign-in
})();
