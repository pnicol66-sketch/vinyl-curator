'use strict';

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
const SHOTS = [
  { id: 'front',      n: 1,  name: 'Front Cover',           type: 'cover',  disc: 1 },
  { id: 'frontgrade', n: 2,  name: 'Front Cover Grade',     type: 'grade',  disc: 1 },
  { id: 'back',       n: 3,  name: 'Back Cover',            type: 'cover',  disc: 1 },
  { id: 'backgrade',  n: 4,  name: 'Back Cover Grade',      type: 'grade',  disc: 1 },
  { id: 'other',      n: 5,  name: 'Other',                 type: 'cover',  disc: 1, opt: true },
  { id: 's1label',    n: 6,  name: 'Side 1 Label',          type: 'label',  disc: 1 },
  { id: 's1grade',    n: 7,  name: 'Vinyl Grade Side 1',    type: 'grade',  disc: 1 },
  { id: 's2label',    n: 8,  name: 'Side 2 Label',          type: 'label',  disc: 1 },
  { id: 's2grade',    n: 9,  name: 'Vinyl Grade Side 2',    type: 'grade',  disc: 1 },
  { id: 's3label',    n: 10, name: 'Side 3 Label',          type: 'label',  disc: 2 },
  { id: 's3grade',    n: 11, name: 'Vinyl Grade Side 3',    type: 'grade',  disc: 2 },
  { id: 's4label',    n: 12, name: 'Side 4 Label',          type: 'label',  disc: 2 },
  { id: 's4grade',    n: 13, name: 'Vinyl Grade Side 4',    type: 'grade',  disc: 2 },
  { id: 's1matrix',   n: 14, name: 'Side 1 Matrix',         type: 'matrix', disc: 1 },
  { id: 's1dwo',      n: 15, name: 'Side 1 Dead Wax Other', type: 'matrix', disc: 1, opt: true },
  { id: 's2matrix',   n: 16, name: 'Side 2 Matrix',         type: 'matrix', disc: 1 },
  { id: 's2dwo',      n: 17, name: 'Side 2 Dead Wax Other', type: 'matrix', disc: 1, opt: true },
  { id: 's3matrix',   n: 18, name: 'Side 3 Matrix',         type: 'matrix', disc: 2 },
  { id: 's3dwo',      n: 19, name: 'Side 3 Dead Wax Other', type: 'matrix', disc: 2, opt: true },
  { id: 's4matrix',   n: 20, name: 'Side 4 Matrix',         type: 'matrix', disc: 2 },
  { id: 's4dwo',      n: 21, name: 'Side 4 Dead Wax Other', type: 'matrix', disc: 2, opt: true },
];
const TIPS = {
  cover: 'Lay flat on a plain, contrasting background and fill the frame — the outline is detected automatically.',
  label: 'Center the label and fill the frame — the round outline is detected and cropped as a circle.',
  matrix: 'Get close to the run-out groove. Angle the disc under light (try 🔦) so the etching casts shadows.',
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

/* ---------- settings ---------- */
const settings = { clientId: '', maxOut: 2400, quality: 0.92, driveFolder: 'Vinyl Curator' };
async function loadSettings() { const s = await dbGet('kv', 'settings'); if (s) Object.assign(settings, s); }
async function saveSettings() { await dbPut('kv', { ...settings }, 'settings'); }

/* ---------- navigation ---------- */
let backAction = null;
function show(id, { title = 'Vinyl Curator', back = null, gear = false } = {}) {
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
  const albums = (await dbAll('albums')).sort((a, b) => b.created - a.created);
  const list = $('#albumList');
  list.innerHTML = '';
  if (!albums.length) {
    list.innerHTML = '<p class="empty">No albums yet.<br>Tap “New Album” to start shooting.</p>';
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
    const item = document.createElement('button');
    item.className = 'shotitem';
    const thumbChar = status === 'done' ? '' : status === 'text' ? '⌨' : status === 'skipped' ? '—' : def.type === 'grade' ? '⌨' : '📷';
    const nameExtra = status === 'text'
      ? ` <em>· ${esc(rec.text.length > 22 ? rec.text.slice(0, 22) + '…' : rec.text)}</em>`
      : def.opt ? ' <em>· optional</em>' : '';
    item.innerHTML =
      `<span class="thumb">${thumbChar}</span>` +
      `<span class="shotname">${pad2(def.n)} ${esc(def.name)}${nameExtra}</span>` +
      `<span class="shotstate ${status === 'text' ? 'done' : status}">${status === 'done' || status === 'text' ? '✓' : status === 'skipped' ? 'skipped' : ''}</span>`;
    if (status === 'done') {
      const url = URL.createObjectURL(rec.blob);
      thumbUrls.push(url);
      const img = document.createElement('img');
      img.src = url;
      item.querySelector('.thumb').appendChild(img);
    }
    item.onclick = () => {
      if (status === 'done') openViewer(def, rec);
      else if (status === 'text' || def.type === 'grade') openTextEntry(def, rec);
      else openCamera(def);
    };
    list.appendChild(item);
  }
  $('#albumProgress').textContent = `${done}/${visible.length}`;
  $('#btnExport').disabled = done === 0;
}
function baseNameFor(def) {
  return sanitize(`${curAlbum.artist} - ${curAlbum.title} - ${pad2(def.n)} ${def.name}`);
}
function filenameFor(def) {
  return baseNameFor(def) + '.jpg';
}

/* ---------- camera ---------- */
let stream = null, track = null, imageCapture = null, curShot = null, torchOn = false;
async function openCamera(def) {
  curShot = def;
  freeReview();
  show('scr-camera', { title: `${pad2(def.n)} ${def.name}`, back: backToAlbum });
  $('#camLabel').textContent = `${pad2(def.n)} · ${def.name}`;
  $('#camTip').textContent = TIPS[def.type] || '';
  $('#btnSkip').classList.toggle('hidden', !def.opt);
  $('#btnTypeIt').classList.toggle('hidden', def.type !== 'matrix');
  $('#btnType2').classList.toggle('hidden', def.type !== 'matrix');
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
    zoomEl.classList.remove('hidden');
  } else {
    zoomEl.classList.add('hidden');
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
async function snap() {
  let bmp = null;
  if (imageCapture && imageCapture.takePhoto) {
    try {
      const blob = await Promise.race([
        imageCapture.takePhoto(),
        new Promise((_, rj) => setTimeout(() => rj(new Error('timeout')), 3000)),
      ]);
      bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    } catch {}
  }
  if (!bmp) {
    const v = $('#video');
    if (!v.videoWidth) return toast('Camera not ready');
    const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    bmp = await createImageBitmap(c);
  }
  openReview(bmp);
}

/* ---------- review / crop ---------- */
let review = { bmp: null, quad: null, circle: null, shape: 'quad', rot: 0, scale: 1, dpr: 1, dragging: null };
function freeReview() {
  if (review.bmp && review.bmp.close) review.bmp.close();
  review.bmp = null;
  review.quad = null;
  review.circle = null;
}
function openReview(bmp) {
  stopCam();
  freeReview();
  review = {
    bmp, quad: null, circle: null,
    shape: curShot && curShot.type === 'label' ? 'circle' : 'quad',
    rot: 0, scale: 1, dpr: 1, dragging: null,
  };
  $('#btnRotate').textContent = '⟳ 0°';
  show('scr-review', { title: `${pad2(curShot.n)} ${curShot.name}`, back: () => openCamera(curShot) });
  layoutReview();
  autoDetect();
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
    toast('Full frame kept for dead wax — drag corners to crop if you like');
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
    if (circ) {
      review.circle = { cx: circ.cx / sc2, cy: circ.cy / sc2, r: circ.r / sc2 };
      toast('Circle detected ✓ — drag to move, drag the edge to resize');
    } else {
      review.circle = defaultCircle();
      toast('Couldn’t find the circle — drag it into place');
    }
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
    toast('Outline detected ✓ — drag corners to fine-tune');
  } else {
    review.quad = defaultQuad();
    toast('Couldn’t find the outline — drag the corners to fit');
  }
  drawReview();
}
function drawReview() {
  const canvas = $('#reviewCanvas');
  if (!review.bmp || !canvas.width) return;
  const ctx = canvas.getContext('2d');
  const s = review.scale * review.dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(review.bmp, 0, 0, canvas.width, canvas.height);
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
}
const rc = $('#reviewCanvas');
rc.addEventListener('pointerdown', e => {
  const r = rc.getBoundingClientRect();
  const px = (e.clientX - r.left) / review.scale;
  const py = (e.clientY - r.top) / review.scale;
  if (review.shape === 'circle') {
    const c0 = review.circle;
    if (!c0) return;
    const d = Math.hypot(px - c0.cx, py - c0.cy);
    const tol = 44 / review.scale;
    if (Math.abs(d - c0.r) <= tol) review.dragging = 'resize';
    else if (d < c0.r) review.dragging = 'move';
    else return;
    rc.setPointerCapture(e.pointerId);
    e.preventDefault();
    return;
  }
  if (!review.quad) return;
  let best = -1, bd = Infinity;
  review.quad.forEach((p, i) => {
    const d = Math.hypot(p.x - px, p.y - py);
    if (d < bd) { bd = d; best = i; }
  });
  if (bd * review.scale <= 40) {
    review.dragging = best;
    rc.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
});
rc.addEventListener('pointermove', e => {
  if (review.dragging === null || review.dragging === -1 || !review.bmp) return;
  const r = rc.getBoundingClientRect();
  const w = review.bmp.width, h = review.bmp.height;
  const px = Math.max(0, Math.min(w, (e.clientX - r.left) / review.scale));
  const py = Math.max(0, Math.min(h, (e.clientY - r.top) / review.scale));
  if (review.shape === 'circle') {
    const c0 = review.circle;
    if (!c0) return;
    if (review.dragging === 'move') { c0.cx = px; c0.cy = py; }
    else if (review.dragging === 'resize') {
      c0.r = Math.max(24, Math.hypot(px - c0.cx, py - c0.cy));
    }
  } else if (typeof review.dragging === 'number' && review.quad) {
    review.quad[review.dragging] = { x: px, y: py };
  }
  drawReview();
});
rc.addEventListener('pointerup', () => { review.dragging = null; });
rc.addEventListener('pointercancel', () => { review.dragging = null; });

$('#btnAuto').onclick = autoDetect;
$('#btnFull').onclick = () => {
  if (review.shape === 'circle') review.circle = fullCircle();
  else review.quad = fullQuad();
  drawReview();
};
$('#btnRotate').onclick = () => {
  review.rot = (review.rot + 1) % 4;
  $('#btnRotate').textContent = `⟳ ${review.rot * 90}°`;
};
$('#btnRetake').onclick = () => openCamera(curShot);
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
  if (review.shape === 'circle') {
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
    if (review.shape === 'circle') {
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
    await dbPut('shots', { albumId: curAlbum.id, shotId: curShot.id, status: 'done', blob, when: Date.now() });
    backToAlbum();
    toast('Saved ✓');
  } catch (e) {
    console.error(e);
    toast('Save failed: ' + e.message, 4000);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save';
  }
}

/* ---------- manual text entry (matrix / dead wax / vinyl grade) ---------- */
async function openTextEntry(def, rec) {
  stopCam();
  freeReview();
  curShot = def;
  if (rec === undefined) rec = await dbGet('shots', [curAlbum.id, def.id]);
  const isGrade = def.type === 'grade';
  $('#inShotTextLabel').textContent = isGrade
    ? (def.name.includes('Cover') ? 'Cover grade' : 'Vinyl grade for this side')
    : 'Matrix / dead wax text — exactly as etched or stamped';
  $('#inShotText').placeholder = isGrade ? 'e.g. VG+' : 'e.g. ST-A-681234-B-1';
  $('#inShotText').value = (rec && rec.status === 'text' && rec.text) || '';
  $('#btnTextPhoto').classList.toggle('hidden', isGrade);
  $('#btnTextDelete').classList.toggle('hidden', !(rec && rec.status === 'text'));
  show('scr-text', { title: `${pad2(def.n)} ${def.name}`, back: backToAlbum });
}
$('#btnTypeIt').onclick = () => openTextEntry(curShot);
$('#btnType2').onclick = () => openTextEntry(curShot);
$('#btnTextSave').onclick = async () => {
  const t = $('#inShotText').value.trim();
  if (!t) return toast(curShot.type === 'grade' ? 'Type the grade first, or go back' : 'Type the matrix text first, or go back');
  await dbPut('shots', { albumId: curAlbum.id, shotId: curShot.id, status: 'text', text: t, when: Date.now() });
  backToAlbum();
  toast('Saved ✓');
};
$('#btnTextPhoto').onclick = () => openCamera(curShot);
$('#btnTextDelete').onclick = async () => {
  if (!confirm('Delete this text entry?')) return;
  await dbDel('shots', [curAlbum.id, curShot.id]);
  backToAlbum();
};

/* ---------- viewer ---------- */
let viewShot = null, viewerUrl = null;
function openViewer(def, rec) {
  viewShot = def;
  if (viewerUrl) URL.revokeObjectURL(viewerUrl);
  viewerUrl = URL.createObjectURL(rec.blob);
  $('#viewerImg').src = viewerUrl;
  $('#viewerName').textContent = filenameFor(def);
  show('scr-viewer', { title: `${pad2(def.n)} ${def.name}`, back: backToAlbum });
}
$('#btnVRetake').onclick = () => openCamera(viewShot);
$('#btnVDelete').onclick = async () => {
  if (!confirm('Delete this photo?')) return;
  await dbDel('shots', [curAlbum.id, viewShot.id]);
  backToAlbum();
};

/* ---------- export ---------- */
let exportItems = [];
$('#btnExport').onclick = openExport;
async function openExport() {
  const shots = await shotsFor(curAlbum.id);
  const byId = Object.fromEntries(shots.map(s => [s.shotId, s]));
  exportItems = SHOTS
    .filter(def => def.disc <= curAlbum.discs)
    .map(def => ({ def, rec: byId[def.id] }))
    .filter(x => x.rec && (x.rec.status === 'done' || x.rec.status === 'text'))
    .map(x => x.rec.status === 'text'
      ? { name: baseNameFor(x.def) + '.txt', blob: new Blob([x.rec.text + '\n'], { type: 'text/plain' }), mime: 'text/plain' }
      : { name: filenameFor(x.def), blob: x.rec.blob, mime: 'image/jpeg' });
  const fmtSize = n => n < 1048576 ? Math.max(1, Math.round(n / 1024)) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
  $('#exportList').innerHTML = exportItems
    .map(i => `<div class="exportrow"><div>${esc(i.name)}</div><span>${fmtSize(i.blob.size)}</span></div>`)
    .join('');
  $('#exportStatus').textContent = '';
  $('#btnDrive').textContent = settings.clientId
    ? 'Upload to Google Drive'
    : 'Upload to Google Drive (needs setup — see Settings)';
  show('scr-export', { title: 'Save photos', back: backToAlbum });
}
$('#btnShare').onclick = async () => {
  const files = exportItems.map(i => new File([i.blob], i.name, { type: i.mime || 'image/jpeg' }));
  if (navigator.canShare && navigator.canShare({ files })) {
    try {
      await navigator.share({ files });
      toast('Shared ✓');
      goHome();
    } catch (e) {
      if (e.name !== 'AbortError') toast('Share failed: ' + e.message);
    }
  } else {
    toast('This browser can’t share files — use ZIP or Drive upload instead.');
  }
};

/* ---------- ZIP (store method, no compression — JPEGs don't compress) ---------- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(u8) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function makeZip(files) {
  const enc = new TextEncoder();
  const parts = [], central = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true);
    lh.setUint16(4, 20, true);
    lh.setUint16(6, 0x0800, true);
    lh.setUint16(8, 0, true);
    lh.setUint16(10, dosTime, true);
    lh.setUint16(12, dosDate, true);
    lh.setUint32(14, crc, true);
    lh.setUint32(18, f.data.length, true);
    lh.setUint32(22, f.data.length, true);
    lh.setUint16(26, name.length, true);
    lh.setUint16(28, 0, true);
    parts.push(lh.buffer, name, f.data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true);
    ch.setUint16(4, 20, true);
    ch.setUint16(6, 20, true);
    ch.setUint16(8, 0x0800, true);
    ch.setUint16(10, 0, true);
    ch.setUint16(12, dosTime, true);
    ch.setUint16(14, dosDate, true);
    ch.setUint32(16, crc, true);
    ch.setUint32(20, f.data.length, true);
    ch.setUint32(24, f.data.length, true);
    ch.setUint16(28, name.length, true);
    ch.setUint32(42, offset, true);
    central.push(ch.buffer, name);
    offset += 30 + name.length + f.data.length;
  }
  let cdSize = 0;
  for (const c of central) cdSize += c.byteLength;
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true);
  end.setUint32(16, offset, true);
  parts.push(...central, end.buffer);
  return new Blob(parts, { type: 'application/zip' });
}
$('#btnZip').onclick = async () => {
  $('#exportStatus').textContent = 'Building ZIP…';
  try {
    const files = [];
    for (const i of exportItems) {
      files.push({ name: i.name, data: new Uint8Array(await i.blob.arrayBuffer()) });
    }
    const blob = makeZip(files);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = sanitize(`${curAlbum.artist} - ${curAlbum.title}`) + '.zip';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    toast('ZIP downloaded — find it in your Downloads.');
    goHome();
  } catch (e) {
    $('#exportStatus').textContent = '';
    toast('ZIP failed: ' + e.message, 4000);
  }
};

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
  if (!settings.clientId) throw new Error('Add your Google OAuth Client ID in Settings first (or use Share…)');
  if (tokenInfo.token && Date.now() < tokenInfo.exp - 60000) return tokenInfo.token;
  await loadGsi();
  return new Promise((res, rej) => {
    const tc = google.accounts.oauth2.initTokenClient({
      client_id: settings.clientId,
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
async function findOrCreateFolder(name, parent) {
  const q = `name='${qEsc(name)}' and mimeType='application/vnd.google-apps.folder' and '${parent}' in parents and trashed=false`;
  const r = await drive('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&fields=files(id)');
  if (r.files && r.files.length) return r.files[0].id;
  const made = await drive('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parent] }),
  });
  return made.id;
}
$('#btnDrive').onclick = async () => {
  const st = $('#exportStatus');
  if (!settings.clientId) {
    st.innerHTML = 'Direct upload needs a <b>one-time Google setup</b> — open ⚙ <b>Settings</b> (top right of the home screen) and follow the steps under “Google Drive direct upload”.<br><br>' +
      'No setup needed for <b>Share…</b> below: tap it, pick <b>Drive</b> in the share sheet, choose a folder, done.';
    toast('Not set up yet — see the note above, or use Share…', 5000);
    return;
  }
  const btn = $('#btnDrive');
  btn.disabled = true;
  try {
    st.textContent = 'Signing in to Google…';
    await getToken();
    st.textContent = 'Finding Drive folder…';
    const root = await findOrCreateFolder(settings.driveFolder || 'Vinyl Curator', 'root');
    const folderName = sanitize(`${curAlbum.artist}_${curAlbum.title}`);
    const folder = await findOrCreateFolder(folderName, root);
    let n = 0;
    for (const item of exportItems) {
      n++;
      st.textContent = `Uploading ${n}/${exportItems.length}: ${item.name}`;
      const q = `name='${qEsc(item.name)}' and '${folder}' in parents and trashed=false`;
      const existing = await drive('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&fields=files(id)');
      if (existing.files && existing.files.length) {
        await drive(`https://www.googleapis.com/upload/drive/v3/files/${existing.files[0].id}?uploadType=media&fields=id`, {
          method: 'PATCH',
          headers: { 'Content-Type': item.mime },
          body: item.blob,
        });
      } else {
        const boundary = 'vinylsnap' + Date.now();
        const body = new Blob([
          `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
          JSON.stringify({ name: item.name, parents: [folder] }),
          `\r\n--${boundary}\r\nContent-Type: ${item.mime}\r\n\r\n`,
          item.blob,
          `\r\n--${boundary}--`,
        ]);
        await drive('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
          method: 'POST',
          headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
          body,
        });
      }
    }
    st.textContent = `Done ✓ ${exportItems.length} photos in Drive → ${settings.driveFolder || 'Vinyl Curator'} / ${folderName}`;
    toast(`Uploaded ${exportItems.length} files to Google Drive ✓`);
    goHome();
  } catch (e) {
    console.error(e);
    st.textContent = '';
    toast(e.message, 4500);
  } finally {
    btn.disabled = false;
  }
};

/* ---------- settings ---------- */
function openSettings() {
  $('#inClientId').value = settings.clientId;
  $('#inDriveFolder').value = settings.driveFolder || 'Vinyl Curator';
  $('#inMaxOut').value = String(settings.maxOut);
  $('#inQuality').value = String(settings.quality);
  show('scr-settings', { title: 'Settings', back: goHome });
}
$('#btnSaveSettings').onclick = async () => {
  settings.clientId = $('#inClientId').value.trim();
  settings.driveFolder = $('#inDriveFolder').value.trim() || 'Vinyl Curator';
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

/* ---------- init ---------- */
(async function init() {
  await loadSettings();
  if ('serviceWorker' in navigator &&
      (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  goHome();
})();
