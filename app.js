'use strict';

/* Build stamp — rewritten by bump-version.ps1 (and the pre-commit hook) so it
   always matches the service worker's cache name. Shown in Settings. */
const APP_VERSION = '20260826-002836';

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

/* ---------- IndexedDB ---------- */
let _db = null;
function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('vinylsnap', 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      d.createObjectStore('albums', { keyPath: 'id' });
      d.createObjectStore('shots', { keyPath: ['albumId', 'shotId'] });
      d.createObjectStore('kv');
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
const settings = { clientId: '', apiKey: '', projectNumber: '', shareWith: '', aiKey: '', maxOut: 2400, quality: 0.92, driveFolder: 'Vinyl Curator', driveFolders: null, driveFolderIds: null };
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
    const visible = SHOTS.filter(s => s.disc <= al.discs);
    const done = shots.filter(s => s.status === 'done' || s.status === 'text').length;
    const row = document.createElement('div');
    row.className = 'albumcard';
    row.innerHTML =
      `<button class="al-open"><div class="al-art">${esc(al.artist)}</div>` +
      `<div class="al-title">${esc(al.title)}</div>` +
      `<div class="al-meta">${al.discs === 2 ? '2 discs' : '1 disc'} · ${done}/${visible.length} photos</div></button>` +
      `<button class="al-del" aria-label="Delete album">🗑</button>`;
    row.querySelector('.al-open').onclick = () => openAlbum(al.id);
    row.querySelector('.al-del').onclick = async () => {
      if (!confirm(`Delete "${al.artist} — ${al.title}" and its photos from this phone?`)) return;
      for (const s of shots) await dbDel('shots', [al.id, s.shotId]);
      await dbDel('albums', al.id);
      goHome();
    };
    list.appendChild(row);
  }
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
  const al = {
    id: Date.now().toString(36),
    artist, title,
    discs: $('#inDiscs2').checked ? 2 : 1,
    created: Date.now(),
  };
  await dbPut('albums', al);
  openAlbum(al.id);
};

/* ---------- album checklist ---------- */
let curAlbum = null;
let thumbUrls = [];
async function openAlbum(id) {
  curAlbum = await dbGet('albums', id);
  if (!curAlbum) return goHome();
  backToAlbum();
}
function backToAlbum() {
  stopCam();
  freeReview();
  stopVoice();
  freeSlotUrls();
  textDraft = null;
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
  const visible = SHOTS.filter(s => s.disc <= curAlbum.discs);
  let done = 0;
  for (const def of visible) {
    const rec = byId[def.id];
    const status = rec?.status || '';
    if (status === 'done' || status === 'text') done++;
    const isMatrix = def.type === 'matrix';
    const slotRecs = isMatrix ? SLOTS.map(n => byId[slotId(def, n)]).filter(Boolean) : [];
    const item = document.createElement('button');
    item.className = 'shotitem';
    const thumbChar = status === 'done' ? '' : status === 'text' ? (slotRecs.length ? '' : '⌨') : status === 'skipped' ? '—' : (def.type === 'grade' || isMatrix) ? '⌨' : '📷';
    let nameExtra = status === 'text'
      ? ` <em>· ${esc(rec.text.length > 22 ? rec.text.slice(0, 22) + '…' : rec.text)}</em>`
      : def.opt ? ' <em>· optional</em>' : '';
    if (slotRecs.length) nameExtra += ` <em>· 📷×${slotRecs.length}</em>`;
    item.innerHTML =
      `<span class="thumb">${thumbChar}</span>` +
      `<span class="shotname">${pad2(def.n)} ${esc(def.name)}${nameExtra}</span>` +
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
    list.appendChild(item);
  }
  $('#albumProgress').textContent = `${done}/${visible.length}`;
  $('#btnExport').disabled = done === 0;
}
function baseNameFor(def) {
  return sanitize(`${curAlbum.artist} - ${curAlbum.title} - ${pad2(def.n)} ${def.fname || def.name}`);
}
function filenameFor(def) {
  return baseNameFor(def) + '.jpg';
}
function slotFilename(def, n) {
  return `${baseNameFor(def)} ${def.letter}${n}.jpg`;
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
  const label = curSlot ? `${pad2(def.n)} ${def.name} · Photo ${curSlot}` : `${pad2(def.n)} ${def.name}`;
  show('scr-camera', { title: label, back: camBack });
  $('#camLabel').textContent = curSlot ? `${pad2(def.n)} · ${def.name} · Photo ${curSlot}` : `${pad2(def.n)} · ${def.name}`;
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
  try {
    const n = 32;
    const c = document.createElement('canvas');
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
    bmp = await createImageBitmap(c);
    if (isBlankFrame(bmp)) {
      if (bmp.close) bmp.close();
      return toast('Camera returned a blank frame — hold steady and snap again', 3000);
    }
  }
  openReview(bmp);
}

/* ---------- review / crop ---------- */
let review = { bmp: null, quad: null, circle: null, ellipse: null, shape: 'quad', mode: 'adjust', taps: [], tapActive: null, rot: 0, scale: 1, dpr: 1, dragging: null, loupe: null };
function freeReview() {
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
    rot: 0, scale: 1, dpr: 1, dragging: null, loupe: null,
  };
  $('#btnRotate').textContent = '⟳ 0°';
  // run-outs are flat, straight crops: swap the (redundant) Auto button for the
  // rectangle/skew toggle, so the frame can't be knocked out of square by accident
  $('#btnAuto').classList.toggle('hidden', type === 'matrix');
  $('#btnAuto').textContent = type === 'label' ? '○ Circle' : 'Auto';
  $('#btnShape').classList.toggle('hidden', type !== 'matrix');
  $('#btnUndo').classList.toggle('hidden', shape === 'rect');
  updateShapeBtn();
  show('scr-review', { title: `${pad2(curShot.n)} ${curShot.name}`, back: () => openCamera(curShot, curSlot) });
  layoutReview();
  if (tapMode && aiEnabled()) tryAiThenTap(bmp);
  else if (tapMode) enterTapMode();
  else { updateTapPrompt(); autoDetect(); }
}
// owner AI auto-crop: seed the crop from Claude vision, then hand off to the same
// manual review (drag / retap / ○ Circle). Any miss falls back to tapping.
async function tryAiThenTap(bmp) {
  const type = curShot && curShot.type;
  review.mode = 'ai';
  $('#tapPrompt').classList.remove('hidden', 'tapping');
  $('#tapPips').innerHTML = '';
  $('#tapMsg').textContent = '✨ AI cropping…';
  drawReview();
  const res = await aiDetect(bmp, type);
  // bail if the user navigated away or retook while we were waiting
  if (review.bmp !== bmp || !$('#scr-review').classList.contains('active')) return;
  if (res && res.kind === 'quad') {
    review.quad = res.quad; review.shape = 'quad'; review.mode = 'adjust';
    updateShapeBtn(); updateTapPrompt(); drawReview();
    toast('AI cropped ✓ — drag any corner to fix, then Save');
  } else if (res && res.kind === 'ellipse') {
    review.ellipse = res.ellipse; review.shape = 'ellipse'; review.mode = 'adjust';
    updateTapPrompt(); drawReview();
    toast('AI cropped ✓ — drag to fix, or ○ Circle, then Save');
  } else {
    enterTapMode();
    toast('AI couldn’t crop it — do it by tapping', 2600);
  }
}
function enterTapMode() {
  const type = curShot && curShot.type;
  review.shape = type === 'label' ? 'ellipse' : type === 'matrix' ? 'rect' : 'quad';
  review.mode = 'tap';
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
/* ---------- owner-only AI auto-crop (Claude vision, browser-direct) ---------- */
function aiEnabled() { return !!(settings.aiKey && settings.aiKey.trim()) && navigator.onLine; }
function pullJson(text) {
  const m = String(text || '').match(/[\[{][\s\S]*[\]}]/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch (e) { return null; }
}
// Ask Claude for the crop geometry: 4 cover corners, or 8 rim points for a round
// label/disc. Returns { kind:'quad', quad } | { kind:'ellipse', ellipse } | null.
async function aiDetect(bmp, type) {
  if (!aiEnabled()) return null;
  const round = type === 'label';
  const maxSide = 1024;
  const scd = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.max(2, Math.round(bmp.width * scd)), h = Math.max(2, Math.round(bmp.height * scd));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').drawImage(bmp, 0, 0, w, h);
  const b64 = c.toDataURL('image/jpeg', 0.85).split(',')[1];
  const prompt = round
    ? 'This photo shows a vinyl record\'s round paper LABEL (or the whole black disc) lying on a background. It is a circle seen at an angle, so it looks like an ellipse. Return ONLY a JSON array of 8 points spread evenly right around the OUTER edge of the label/disc, as normalized [x,y] with x from left and y from top, each in 0..1: [[x,y],[x,y],...]. Trace the true rim precisely. Output only the JSON array.'
    : 'This photo shows a vinyl record album COVER (a square printed cardboard sleeve) on a background such as a table. Return ONLY a JSON object with the four corners of the cover as normalized [x,y] (x from left, y from top, each 0..1): {"tl":[x,y],"tr":[x,y],"br":[x,y],"bl":[x,y]}. Trace the actual cover edges and exclude the background; if a clear plastic outer sleeve overhangs the cardboard, use the cardboard edge. Output only the JSON object.';
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  let data;
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: ctrl.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': settings.aiKey.trim(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: settings.aiModel || 'claude-opus-5',
        max_tokens: 1200,
        output_config: { effort: 'low' },
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } },
          { type: 'text', text: prompt },
        ] }],
      }),
    });
    clearTimeout(timer);
    if (!resp.ok) { console.error('AI crop', resp.status, await resp.text().catch(() => '')); return null; }
    data = await resp.json();
  } catch (e) { clearTimeout(timer); console.error('AI crop', e); return null; }
  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  const json = pullJson(text);
  if (!json) return null;
  const inBmp = ([x, y]) => ({ x: Math.max(0, Math.min(1, x)) * bmp.width, y: Math.max(0, Math.min(1, y)) * bmp.height });
  if (round) {
    const arr = Array.isArray(json) ? json : json.points;
    if (!Array.isArray(arr) || arr.length < 5) return null;
    const e = fitEllipse(arr.filter(p => Array.isArray(p) && p.length >= 2).map(inBmp));
    return e ? { kind: 'ellipse', ellipse: e } : null;
  }
  const q = ['tl', 'tr', 'br', 'bl'].map(k => Array.isArray(json[k]) ? inBmp(json[k]) : null);
  if (q.some(p => !p)) return null;
  return { kind: 'quad', quad: q };
}
function commitTap(p) {
  review.taps.push({ x: p.x, y: p.y });
  review.tapActive = null;
  review.loupe = null;
  if (review.taps.length >= tapsNeeded()) {
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
  if (tapping) {
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
  if (!review.bmp) return;
  const bmp = review.bmp;
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
    review.tapActive = { x: Math.max(0, Math.min(w, px)), y: Math.max(0, Math.min(h, py)) };
    review.loupe = review.tapActive;
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
  if (review.mode === 'tap') { review.mode = 'adjust'; }
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
async function saveShot() {
  if (!review.bmp) return;
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
  try {
    const bmp = review.bmp;
    let outCanvas;
    if (review.shape === 'ellipse') {
      // deskew: un-squash the ellipse back to a true circle (rotate its axes to
      // upright, scale each to R), then mask to that circle
      const e = review.ellipse;
      const R = Math.max(e.ax, e.ay);
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
      octx.rotate(-e.theta);
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
      const sc = document.createElement('canvas');
      sc.width = bmp.width; sc.height = bmp.height;
      const sctx = sc.getContext('2d', { willReadFrequently: true });
      sctx.drawImage(bmp, 0, 0);
      const srcData = sctx.getImageData(0, 0, sc.width, sc.height);
      const outData = Detect.warp(srcData, q, ow, oh);
      outCanvas = document.createElement('canvas');
      outCanvas.width = ow; outCanvas.height = oh;
      outCanvas.getContext('2d').putImageData(outData, 0, 0);
    }
    if (review.rot) outCanvas = rotateCanvas(outCanvas, review.rot);
    const blob = await new Promise((res, rej) =>
      outCanvas.toBlob(b => b ? res(b) : rej(new Error('JPEG encode failed')), 'image/jpeg', settings.quality));
    if (curSlot) {
      await dbPut('shots', { albumId: curAlbum.id, shotId: slotId(curShot, curSlot), status: 'photo', blob, when: Date.now() });
      const saved = curSlot;
      await openTextEntry(curShot);
      toast(`Photo ${saved} saved ✓`);
    } else {
      await dbPut('shots', { albumId: curAlbum.id, shotId: curShot.id, status: 'done', blob, when: Date.now() });
      backToAlbum();
      toast('Saved ✓');
    }
  } catch (e) {
    console.error(e);
    toast('Save failed: ' + e.message, 4000);
  } finally {
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
    ? (def.name.includes('Cover') ? 'Cover grade' : 'Vinyl grade for this side')
    : 'Matrix/Runout text — exactly as etched or stamped';
  $('#inShotText').placeholder = isGrade ? 'e.g. VG+' : 'e.g. ST-A-681234-B-1';
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
  if (!isGrade) await renderSlots(def);
  show('scr-text', { title: `${pad2(def.n)} ${def.name}`, back: backToAlbum });
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
  const t = $('#inShotText').value.trim();
  if (!t) return toast(curShot.type === 'grade' ? 'Type the grade first, or go back' : 'Type the matrix text first, or go back');
  await dbPut('shots', { albumId: curAlbum.id, shotId: curShot.id, status: 'text', text: t, when: Date.now() });
  backToAlbum();
  toast('Saved ✓');
};
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
function voiceToMatrix(s) {
  const words = s.trim().split(/\s+/).map(w => {
    const key = w.toLowerCase().replace(/[.,]+$/, '');
    return VOICE_MAP[key] !== undefined ? VOICE_MAP[key] : w;
  });
  return words.join(' ')
    .replace(/\s*([-/.#*+=])\s*/g, '$1')   // no spaces around symbols
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
    .replace(/([+-])(\d-EYE)\b/g, '$1 $2');
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
  // "near mid" etc. In a grade box a leading "near m..." can only be near mint.
  t = t.replace(/\bnear(?:ly\b|\s+m\w*)/g, ' near mint ');
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
          if (mf) { voiceBase = (voiceBase ? voiceBase + ' ' : '') + mf; voiceProgress = true; }
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
  show('scr-viewer', { title: `${pad2(def.n)} ${def.name}`, back: backToAlbum });
}
function openSlotViewer(def, n, rec) {
  viewShot = def;
  viewSlot = n;
  if (viewerUrl) URL.revokeObjectURL(viewerUrl);
  viewerUrl = URL.createObjectURL(rec.blob);
  $('#viewerImg').src = viewerUrl;
  $('#viewerName').textContent = slotFilename(def, n);
  show('scr-viewer', { title: `${pad2(def.n)} ${def.name} · Photo ${n}`, back: () => openTextEntry(def) });
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
async function openExport() {
  const shots = await shotsFor(curAlbum.id);
  const byId = Object.fromEntries(shots.map(s => [s.shotId, s]));
  exportItems = SHOTS
    .filter(def => def.disc <= curAlbum.discs)
    .flatMap(def => {
      const rec = byId[def.id];
      const items = [];
      if (rec && rec.status === 'text')
        items.push({ name: baseNameFor(def) + '.txt', blob: new Blob([rec.text + '\n'], { type: 'text/plain' }), mime: 'text/plain' });
      else if (rec && rec.status === 'done')
        items.push({ name: filenameFor(def), blob: rec.blob, mime: 'image/jpeg' });
      if (def.type === 'matrix') {
        for (const n of SLOTS) {
          const sr = byId[slotId(def, n)];
          if (sr) items.push({ name: slotFilename(def, n), blob: sr.blob, mime: 'image/jpeg' });
        }
      }
      return items;
    });
  const fmtSize = n => n < 1048576 ? Math.max(1, Math.round(n / 1024)) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
  $('#exportList').innerHTML = exportItems
    .map(i => `<div class="exportrow"><div>${esc(i.name)}</div><span>${fmtSize(i.blob.size)}</span></div>`)
    .join('');
  $('#exportStatus').textContent = '';
  $('#btnDrive').textContent = cred('clientId')
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
// The clash question defaults to the SAFE answer. OK - the button Enter
// presses, the one a tired hand hits - now makes a new folder and touches
// nothing. Merging two copies' photographs is the deliberate branch, and it
// says how many files it would replace before you choose it.
async function resolveAlbumFolder(album, folderName, root, itemNames) {
  if (album.driveFolderId) {
    try {
      const f = await drive('https://www.googleapis.com/drive/v3/files/' +
        album.driveFolderId + '?fields=id,name,trashed');
      if (f && f.id && !f.trashed) return { id: f.id, name: f.name };
    } catch (e) {
      // folder deleted or unreachable - fall through and treat as a new upload
    }
  }
  const existing = await findFolder(folderName, root);
  if (!existing) return { id: await findOrCreateFolder(folderName, root), name: folderName };
  const clashes = await countClashingFiles(existing, itemNames);
  const newFolder = confirm(
    'Drive already has a folder called "' + folderName + '".\n\n' +
    'OK = a DIFFERENT copy (another pressing or variant). Upload into a new ' +
    'folder and leave that one untouched.\n\n' +
    'Cancel = the SAME record. Add these photos to the existing folder' +
    (clashes
      ? ', REPLACING ' + clashes + ' file' + (clashes === 1 ? '' : 's') + ' already in it.'
      : '.'));
  if (!newFolder) return { id: existing, name: folderName };
  for (let n = 2; n < 50; n++) {
    const alt = folderName + ' (' + n + ')';
    if (!(await findFolder(alt, root))) {
      return { id: await findOrCreateFolder(alt, root), name: alt };
    }
  }
  throw new Error('Could not find a free folder name for "' + folderName + '".');
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

// The album's own record of what it is, written into its Drive folder.
//
// The sheet used to learn an album's artist and title by splitting the FOLDER
// NAME at the first underscore, which made the folder name carry meaning it
// was never safe to carry: an artist containing "_" broke it, and a "(2)"
// added to keep two copies apart arrived in the sheet as part of the album
// title and went out on eBay and Discogs listings that way. The manifest says
// what the album is; the folder name goes back to being just a name.
async function writeAlbumManifest(folder, album) {
  const manifest = {
    vinylCurator: 1,
    appAlbumId: album.id,
    artist: album.artist,
    title: album.title,
    discs: album.discs || 1,
    updated: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
  await uploadFile(folder, 'album.json', 'application/json', blob);
}

// How many of these file names already exist in that folder - i.e. how many
// photographs an "add to the existing folder" would overwrite. The owner is
// told the number before choosing, not after.
async function countClashingFiles(folder, names) {
  if (!names || !names.length) return 0;
  const q = `'${folder}' in parents and trashed=false`;
  const r = await drive('https://www.googleapis.com/drive/v3/files?q=' +
    encodeURIComponent(q) + '&fields=files(name)&pageSize=1000');
  const have = {};
  (r.files || []).forEach(f => { have[f.name] = true; });
  return names.filter(n => have[n]).length;
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
  btn.disabled = true;
  try {
    st.textContent = 'Signing in to Google…';
    await getToken();
    st.textContent = 'Finding Drive folder…';
    const importFolder = $('#expFolder').value || settings.driveFolder || 'Vinyl Curator';
    const root = await resolveRootFolder(importFolder);
    await shareFolder(root, importFolder, st);
    const folderName = sanitize(`${curAlbum.artist}_${curAlbum.title}`);
    const album = await resolveAlbumFolder(curAlbum, folderName, root,
      exportItems.map(i => i.name));
    const folder = album.id;
    let n = 0;
    for (const item of exportItems) {
      n++;
      st.textContent = `Uploading ${n}/${exportItems.length}: ${item.name}`;
      await uploadFile(folder, item.name, item.mime, item.blob);
    }
    // Last, so a manifest only ever describes a folder whose photos arrived.
    st.textContent = 'Writing album details…';
    await writeAlbumManifest(folder, curAlbum);
    st.textContent = `Done ✓ ${exportItems.length} photos in Drive → ${importFolder} / ${album.name}`;
    curAlbum.uploaded = Date.now();
    curAlbum.driveFolderName = importFolder;
    curAlbum.driveFolderId = folder;
    await dbPut('albums', curAlbum);
    toast(`Uploaded ${exportItems.length} files ✓ — album moved to “Uploaded albums”`, 3600);
    goHome();
  } catch (e) {
    console.error(e);
    st.textContent = '';
    toast(e.message, 4500);
  } finally {
    btn.disabled = false;
  }
};

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
  await loadArchive();
}
$('#arcFolder').onchange = () => loadArchive();

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

async function reimportAlbum(f) {
  const st = $('#arcAlbumStatus');
  const btn = $('#btnReimport');
  // The listing and the manifest come first, because what this album is called
  // decides what the duplicate question asks. Their own try: this runs before
  // the download loop below, and a failed listing is not a failed download.
  let files, manifest = null;
  try {
    const q = `'${f.id}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'`;
    const r = await drive('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) +
      '&fields=files(id,name,mimeType)&orderBy=name&pageSize=1000');
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
    const jobs = [];
    for (const file of files) {
      const nm = file.name.match(/ - (\d\d) /);
      if (!nm) continue;
      const num = Number(nm[1]);
      const isImg = (file.mimeType || '').startsWith('image/');
      const isTxt = !isImg && (/\.txt$/i.test(file.name) || (file.mimeType || '').startsWith('text/'));
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
    if (!jobs.length) {
      st.textContent = '';
      btn.disabled = false;
      return toast('No recognizable album files in this folder.');
    }
    const al = {
      id: Date.now().toString(36),
      artist, title,
      discs: jobs.some(j => j.def.disc === 2) ? 2 : 1,
      created: Date.now(),
      driveFolderName: $('#arcFolder').value || settings.driveFolder,
      driveFolderId: f.id,
    };
    const taken = {};
    const texts = {};      // matrix shotId -> {main, extra[]}
    const usedSlots = {};  // matrix shotId -> {slotNumber: true}
    let done = 0;
    for (const j of jobs) {
      done++;
      st.textContent = `Downloading ${done}/${jobs.length}: ${j.file.name}`;
      const blob = await driveBlob(j.file.id);
      if (j.kind === 'photo') {
        if (taken[j.def.id]) continue;
        taken[j.def.id] = true;
        await dbPut('shots', { albumId: al.id, shotId: j.def.id, status: 'done', blob, when: Date.now() });
      } else if (j.kind === 'text') {
        if (taken[j.def.id]) continue;
        taken[j.def.id] = true;
        const t = (await blob.text()).trim();
        if (t) await dbPut('shots', { albumId: al.id, shotId: j.def.id, status: 'text', text: t, when: Date.now() });
      } else if (j.kind === 'mtext') {
        const t = (await blob.text()).trim();
        if (!t) continue;
        const cur = texts[j.def.id] || (texts[j.def.id] = { main: '', extra: [] });
        if (j.legacy) cur.extra.push(t);
        else cur.main = cur.main ? cur.main + '\n' + t : t;
      } else if (j.kind === 'slot') {
        const used = usedSlots[j.def.id] || (usedSlots[j.def.id] = {});
        let slot = j.slot;
        if (!slot || used[slot]) slot = SLOTS.find(s2 => !used[s2]);
        if (!slot) continue;
        used[slot] = true;
        await dbPut('shots', { albumId: al.id, shotId: slotId(j.def, slot), status: 'photo', blob, when: Date.now() });
      }
    }
    for (const sid of Object.keys(texts)) {
      const t = [texts[sid].main, ...texts[sid].extra].filter(Boolean).join('\n');
      if (t) await dbPut('shots', { albumId: al.id, shotId: sid, status: 'text', text: t, when: Date.now() });
    }
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
  $('#inAiKey').value = settings.aiKey || '';
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
  settings.aiKey = $('#inAiKey').value.trim();
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
  goHome();
})();
