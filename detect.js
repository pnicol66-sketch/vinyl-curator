'use strict';
/*
 * Detect — outline detection + perspective crop.
 *
 * detect(imageData)            -> quad [{x,y} x4] (TL,TR,BR,BL) or null
 * outputSize(quad, maxOut)     -> {w,h} true-aspect output size for the quad
 * warp(imageData, quad, w, h)  -> ImageData, perspective-corrected crop
 *
 * Method: Sobel edges -> gradient-gated Hough transform restricted to
 * near-vertical / near-horizontal lines -> strongest line on each of the four
 * sides -> intersect for corners. Works best with the record/sleeve on a
 * plain, contrasting background (which the UI tells the user to use).
 */
const Detect = (() => {

  function toGray(imageData) {
    const d = imageData.data, n = imageData.width * imageData.height;
    const g = new Float32Array(n);
    for (let i = 0, p = 0; i < n; i++, p += 4) {
      g[i] = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
    }
    return g;
  }

  function blur3(src, w, h) {
    const tmp = new Float32Array(w * h), dst = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        const xm = x > 0 ? x - 1 : 0, xp = x < w - 1 ? x + 1 : w - 1;
        tmp[row + x] = (src[row + xm] + src[row + x] + src[row + xp]) / 3;
      }
    }
    for (let y = 0; y < h; y++) {
      const ym = (y > 0 ? y - 1 : 0) * w, yc = y * w, yp = (y < h - 1 ? y + 1 : h - 1) * w;
      for (let x = 0; x < w; x++) {
        dst[yc + x] = (tmp[ym + x] + tmp[yc + x] + tmp[yp + x]) / 3;
      }
    }
    return dst;
  }

  function sobel(g, w, h) {
    const mag = new Float32Array(w * h);
    const ang = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const a = g[i - w - 1], b = g[i - w], c = g[i - w + 1];
        const d = g[i - 1], f = g[i + 1];
        const p = g[i + w - 1], q = g[i + w], r = g[i + w + 1];
        const gx = (c + 2 * f + r) - (a + 2 * d + p);
        const gy = (p + 2 * q + r) - (a + 2 * b + c);
        mag[i] = Math.sqrt(gx * gx + gy * gy);
        ang[i] = Math.atan2(gy, gx);
      }
    }
    return { mag, ang };
  }

  // Keep the strongest ~6% of gradient pixels as edge points.
  function edgePoints(mag, ang, w, h) {
    let max = 0;
    for (let i = 0; i < mag.length; i++) if (mag[i] > max) max = mag[i];
    if (max <= 0) return { count: 0 };
    const BINS = 512, hist = new Uint32Array(BINS);
    const hscale = (BINS - 1) / max;
    for (let i = 0; i < mag.length; i++) hist[(mag[i] * hscale) | 0]++;
    const target = mag.length * 0.06;
    let cum = 0, t = max;
    for (let b = BINS - 1; b >= 0; b--) {
      cum += hist[b];
      if (cum > target) { t = b / hscale; break; }
    }
    t = Math.max(t, 25);
    const cap = 70000;
    const xs = new Float32Array(cap), ys = new Float32Array(cap), na = new Float32Array(cap);
    const HP = Math.PI / 2;
    let n = 0;
    for (let y = 2; y < h - 2 && n < cap; y++) {
      for (let x = 2; x < w - 2; x++) {
        const i = y * w + x;
        if (mag[i] <= t) continue;
        if (n >= cap) break;
        let a = ang[i];                     // gradient dir = line normal, mod pi
        if (a >= HP) a -= Math.PI; else if (a < -HP) a += Math.PI;
        xs[n] = x; ys[n] = y; na[n] = a; n++;
      }
    }
    return { xs, ys, na, count: n };
  }

  const TH = 30 * Math.PI / 180;       // lines up to 30 deg off axis
  const STEP = 1.5 * Math.PI / 180;
  const SPREAD = 15 * Math.PI / 180;   // vote window around a point's normal
  const HPI = Math.PI / 2;

  // Find the best near-vertical line pair (left, right). With transposed=true
  // the frame is transposed first, which finds the top/bottom pair instead.
  // Returns [line, line] where a line is two points in ORIGINAL coordinates.
  function bestPair(p, w0, h0, transposed) {
    const W = transposed ? h0 : w0, H = transposed ? w0 : h0;
    const NT = Math.round((2 * TH) / STEP) + 1;
    const RSTEP = 2;
    const diag = Math.ceil(Math.sqrt(W * W + H * H));
    const NR = Math.ceil((2 * diag) / RSTEP) + 2;
    const acc = new Int32Array(NT * NR);
    const cosT = new Float64Array(NT), sinT = new Float64Array(NT);
    for (let b = 0; b < NT; b++) {
      const th = b * STEP - TH;
      cosT[b] = Math.cos(th); sinT[b] = Math.sin(th);
    }
    for (let i = 0; i < p.count; i++) {
      let x = p.xs[i], y = p.ys[i], a = p.na[i];
      if (transposed) {
        const tx = x; x = y; y = tx;
        a = HPI - a;
        if (a >= HPI) a -= Math.PI;
      }
      if (a < -TH - SPREAD || a > TH + SPREAD) continue;
      const t0 = Math.max(-TH, a - SPREAD), t1 = Math.min(TH, a + SPREAD);
      const b0 = Math.max(0, Math.round((t0 + TH) / STEP));
      const b1 = Math.min(NT - 1, Math.round((t1 + TH) / STEP));
      for (let b = b0; b <= b1; b++) {
        const rho = x * cosT[b] + y * sinT[b];
        const rb = Math.round((rho + diag) / RSTEP);
        if (rb >= 0 && rb < NR) acc[b * NR + rb]++;
      }
    }
    const minVotes = Math.max(25, 0.13 * H);
    let bestL = null, bestR = null;
    for (let b = 0; b < NT; b++) {
      const base = b * NR, ct = cosT[b], st = sinT[b];
      const th = b * STEP - TH;
      // Mildly prefer axis-aligned lines: a real straight edge easily out-votes
      // this, but on a circle (all tangents equal) it picks the bounding-box
      // tangents instead of arbitrary slanted ones.
      const axisBias = 1 - 0.35 * Math.abs(th) / TH;
      for (let r = 1; r < NR - 1; r++) {
        const v = acc[base + r - 1] + acc[base + r] + acc[base + r + 1];
        if (v < minVotes) continue;
        const score = v * axisBias;
        const rho = r * RSTEP - diag;
        const xc = (rho - (H / 2) * st) / ct;   // line's x at mid-height
        if (xc >= -0.06 * W && xc <= 0.47 * W) {
          if (!bestL || score > bestL.score) bestL = { th, rho, score };
        } else if (xc >= 0.53 * W && xc <= 1.06 * W) {
          if (!bestR || score > bestR.score) bestR = { th, rho, score };
        }
      }
    }
    if (!bestL || !bestR) return null;
    return [lineToPoints(bestL, transposed, H), lineToPoints(bestR, transposed, H)];
  }

  function lineToPoints(line, transposed, H) {
    const ct = Math.cos(line.th), st = Math.sin(line.th);
    const xA = line.rho / ct;
    const xB = (line.rho - H * st) / ct;
    let p1 = { x: xA, y: 0 }, p2 = { x: xB, y: H };
    if (transposed) {
      p1 = { x: p1.y, y: p1.x };
      p2 = { x: p2.y, y: p2.x };
    }
    return [p1, p2];
  }

  function intersect(l1, l2) {
    const [a, b] = l1, [c, d] = l2;
    const A1 = b.y - a.y, B1 = a.x - b.x, C1 = A1 * a.x + B1 * a.y;
    const A2 = d.y - c.y, B2 = c.x - d.x, C2 = A2 * c.x + B2 * c.y;
    const det = A1 * B2 - A2 * B1;
    if (Math.abs(det) < 1e-9) return null;
    return { x: (B2 * C1 - B1 * C2) / det, y: (A1 * C2 - A2 * C1) / det };
  }

  function validQuad(q, w, h) {
    let sign = 0, area = 0;
    for (let i = 0; i < 4; i++) {
      const p = q[i];
      if (!p || p.x < -0.12 * w || p.x > 1.12 * w || p.y < -0.12 * h || p.y > 1.12 * h) return false;
    }
    for (let i = 0; i < 4; i++) {
      const p0 = q[i], p1 = q[(i + 1) % 4], p2 = q[(i + 2) % 4];
      const cr = (p1.x - p0.x) * (p2.y - p1.y) - (p1.y - p0.y) * (p2.x - p1.x);
      if (cr === 0) return false;
      const s = cr > 0 ? 1 : -1;
      if (sign === 0) sign = s; else if (s !== sign) return false;
      area += p0.x * p1.y - p1.x * p0.y;
    }
    area = Math.abs(area) / 2;
    if (area < 0.10 * w * h) return false;
    return true;
  }

  function detect(imageData) {
    const w = imageData.width, h = imageData.height;
    if (w < 40 || h < 40) return null;
    const gray = blur3(toGray(imageData), w, h);
    const { mag, ang } = sobel(gray, w, h);
    const pts = edgePoints(mag, ang, w, h);
    if (pts.count < 60) return null;
    const vert = bestPair(pts, w, h, false);
    const horz = bestPair(pts, w, h, true);
    if (!vert || !horz) return null;
    const [L, R] = vert, [T, B] = horz;
    const quad = [intersect(T, L), intersect(T, R), intersect(B, R), intersect(B, L)];
    if (!validQuad(quad, w, h)) return null;
    for (const p of quad) {
      p.x = Math.max(0, Math.min(w, p.x));
      p.y = Math.max(0, Math.min(h, p.y));
    }
    return quad;
  }

  function outputSize(quad, maxOut) {
    const d = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    const W = (d(quad[0], quad[1]) + d(quad[3], quad[2])) / 2;
    const H = (d(quad[0], quad[3]) + d(quad[1], quad[2])) / 2;
    const s = Math.min(1, maxOut / Math.max(W, H, 1));
    return { w: Math.max(2, Math.round(W * s)), h: Math.max(2, Math.round(H * s)) };
  }

  // Homography H mapping output-rect (u,v) -> source (x,y).
  function homographyFromRect(W, Hh, quad) {
    const dst = [{ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: Hh }, { x: 0, y: Hh }];
    const A = [];
    for (let i = 0; i < 4; i++) {
      const u = dst[i].x, v = dst[i].y, x = quad[i].x, y = quad[i].y;
      A.push([u, v, 1, 0, 0, 0, -u * x, -v * x, x]);
      A.push([0, 0, 0, u, v, 1, -u * y, -v * y, y]);
    }
    for (let col = 0; col < 8; col++) {
      let piv = col;
      for (let r = col + 1; r < 8; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
      if (Math.abs(A[piv][col]) < 1e-10) return null;
      const tmp = A[col]; A[col] = A[piv]; A[piv] = tmp;
      const pv = A[col][col];
      for (let r = 0; r < 8; r++) {
        if (r === col) continue;
        const f = A[r][col] / pv;
        if (f === 0) continue;
        for (let c = col; c <= 8; c++) A[r][c] -= f * A[col][c];
      }
    }
    const hm = new Float64Array(9);
    for (let i = 0; i < 8; i++) hm[i] = A[i][8] / A[i][i];
    hm[8] = 1;
    return hm;
  }

  function warp(srcData, quad, outW, outH) {
    const Hm = homographyFromRect(outW, outH, quad);
    if (!Hm) throw new Error('Invalid crop shape — adjust the corners');
    const sw = srcData.width, sh = srcData.height, sp = srcData.data;
    const out = new Uint8ClampedArray(outW * outH * 4);
    const h0 = Hm[0], h1 = Hm[1], h2 = Hm[2], h3 = Hm[3], h4 = Hm[4],
          h5 = Hm[5], h6 = Hm[6], h7 = Hm[7];
    let o = 0;
    for (let v = 0; v < outH; v++) {
      const vy = v + 0.5;
      for (let u = 0; u < outW; u++) {
        const ux = u + 0.5;
        const den = h6 * ux + h7 * vy + 1;
        const sx = (h0 * ux + h1 * vy + h2) / den - 0.5;
        const sy = (h3 * ux + h4 * vy + h5) / den - 0.5;
        const x0 = Math.floor(sx), y0 = Math.floor(sy);
        const fx = sx - x0, fy = sy - y0;
        const cx0 = x0 < 0 ? 0 : (x0 >= sw ? sw - 1 : x0);
        const cx1 = x0 + 1 < 0 ? 0 : (x0 + 1 >= sw ? sw - 1 : x0 + 1);
        const cy0 = y0 < 0 ? 0 : (y0 >= sh ? sh - 1 : y0);
        const cy1 = y0 + 1 < 0 ? 0 : (y0 + 1 >= sh ? sh - 1 : y0 + 1);
        const i00 = (cy0 * sw + cx0) * 4, i10 = (cy0 * sw + cx1) * 4;
        const i01 = (cy1 * sw + cx0) * 4, i11 = (cy1 * sw + cx1) * 4;
        const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy),
              w01 = (1 - fx) * fy, w11 = fx * fy;
        out[o++] = sp[i00] * w00 + sp[i10] * w10 + sp[i01] * w01 + sp[i11] * w11;
        out[o++] = sp[i00 + 1] * w00 + sp[i10 + 1] * w10 + sp[i01 + 1] * w01 + sp[i11 + 1] * w11;
        out[o++] = sp[i00 + 2] * w00 + sp[i10 + 2] * w10 + sp[i01 + 2] * w01 + sp[i11 + 2] * w11;
        out[o++] = 255;
      }
    }
    return new ImageData(out, outW, outH);
  }

  return { detect, outputSize, warp };
})();
