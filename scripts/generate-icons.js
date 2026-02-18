// Generate modern Xmoji icon — gradient "X" with emoji face at center
const fs = require('fs');
const path = require('path');
const { deflateSync } = require('zlib');

const iconsDir = path.resolve(__dirname, '../icons');
fs.mkdirSync(iconsDir, { recursive: true });

// --- SDF helpers ---

function sdfRoundedRect(x, y, cx, cy, hw, hh, r) {
  const dx = Math.abs(x - cx) - hw + r;
  const dy = Math.abs(y - cy) - hh + r;
  const outside = Math.sqrt(Math.max(dx, 0) ** 2 + Math.max(dy, 0) ** 2);
  const inside = Math.min(Math.max(dx, dy), 0);
  return outside + inside - r;
}

function sdfSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.sqrt((px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2);
}

function sdfCircle(x, y, cx, cy, r) {
  return Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) - r;
}

function sdfEllipse(x, y, cx, cy, rx, ry) {
  const nx = (x - cx) / rx;
  const ny = (y - cy) / ry;
  return Math.sqrt(nx * nx + ny * ny) - 1;
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// --- Color helpers ---

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpColor(c1, c2, t) {
  return [
    lerp(c1[0], c2[0], t),
    lerp(c1[1], c2[1], t),
    lerp(c1[2], c2[2], t),
    lerp(c1[3], c2[3], t),
  ];
}

function alphaComposite(dst, src) {
  const sa = src[3] / 255;
  const da = dst[3] / 255;
  const outA = sa + da * (1 - sa);
  if (outA === 0) return [0, 0, 0, 0];
  return [
    (src[0] * sa + dst[0] * da * (1 - sa)) / outA,
    (src[1] * sa + dst[1] * da * (1 - sa)) / outA,
    (src[2] * sa + dst[2] * da * (1 - sa)) / outA,
    outA * 255,
  ];
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

// --- Color palette ---
const BG_COLOR = [26, 26, 31, 255];            // #1A1A1F dark background
const X_TOP = [255, 213, 79, 255];             // #FFD54F warm gold
const X_BOTTOM = [255, 107, 53, 255];          // #FF6B35 warm orange-red
const FACE_TOP = [255, 228, 110, 255];         // #FFE46E bright yellow
const FACE_BOTTOM = [255, 165, 50, 255];       // #FFA532 bright orange
const RING_COLOR = [30, 28, 36, 255];          // dark ring to separate face from X
const EYE_COLOR = [74, 40, 16, 255];           // #4A2810 dark brown
const EYE_HIGHLIGHT = [255, 255, 255, 204];    // white at 80% opacity
const SMILE_COLOR = [140, 58, 18, 255];        // #8C3A12 warm brown

// --- PNG encoder ---

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([len, typeAndData, crc]);
}

function createPNG(size) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const aa = Math.max(0.6, size / 100);

  const center = size / 2;

  // Background rounded rect
  const rectHalf = size * 0.45;
  const cornerR = size * 0.22;

  // X shape
  const xMargin = size * 0.22;
  const xStrokeHalf = Math.max(size * 0.085, 1.4);
  const a1x = xMargin, a1y = xMargin;
  const b1x = size - xMargin, b1y = size - xMargin;
  const a2x = size - xMargin, a2y = xMargin;
  const b2x = xMargin, b2y = size - xMargin;

  // Face circle at center
  const faceR = size * 0.22;
  const borderW = Math.max(size * 0.02, 0.8);
  const borderR = faceR + borderW;

  // Eyes (offsets relative to face center)
  const eyeOffX = faceR * 0.36;
  const eyeOffY = -faceR * 0.14;
  const eyeRx = Math.max(faceR * 0.17, 1.0);
  const eyeRy = Math.max(faceR * 0.22, 1.2);

  // Eye highlights
  const hlOffX = -faceR * 0.07;
  const hlOffY = -faceR * 0.09;
  const hlR = Math.max(faceR * 0.08, 0.5);

  // Smile arc
  const smileOffY = faceR * 0.18;
  const smileArcR = faceR * 0.40;
  const smileStroke = Math.max(faceR * 0.12, 0.7);

  const rawRows = [];

  for (let y = 0; y < size; y++) {
    rawRows.push(0); // filter: none
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;

      let pixel = [0, 0, 0, 0];

      // --- Layer 1: Dark rounded rect background ---
      const rectDist = sdfRoundedRect(px, py, center, center, rectHalf, rectHalf, cornerR);
      const rectAlpha = 1 - smoothstep(-aa, aa, rectDist);
      if (rectAlpha > 0) {
        pixel = alphaComposite(pixel, [BG_COLOR[0], BG_COLOR[1], BG_COLOR[2], rectAlpha * 255]);
      }

      // --- Layer 2: Gradient X letterform ---
      const d1 = sdfSegment(px, py, a1x, a1y, b1x, b1y);
      const d2 = sdfSegment(px, py, a2x, a2y, b2x, b2y);
      const xDist = Math.min(d1, d2) - xStrokeHalf;
      const xAlpha = 1 - smoothstep(-aa, aa, xDist);
      if (xAlpha > 0) {
        const t = clamp01((py - xMargin) / (size - 2 * xMargin));
        const xColor = lerpColor(X_TOP, X_BOTTOM, t);
        xColor[3] = xAlpha * 255;
        pixel = alphaComposite(pixel, xColor);
      }

      // --- Layer 3: Dark ring behind face (separation border) ---
      const borderDist = sdfCircle(px, py, center, center, borderR);
      const borderAlpha = 1 - smoothstep(-aa, aa, borderDist);
      if (borderAlpha > 0) {
        pixel = alphaComposite(pixel, [RING_COLOR[0], RING_COLOR[1], RING_COLOR[2], borderAlpha * 255]);
      }

      // --- Layer 4: Emoji face with yellow→orange gradient ---
      const faceDist = sdfCircle(px, py, center, center, faceR);
      const faceAlpha = 1 - smoothstep(-aa, aa, faceDist);
      if (faceAlpha > 0) {
        const t = clamp01((py - (center - faceR)) / (2 * faceR));
        const faceColor = lerpColor(FACE_TOP, FACE_BOTTOM, t);
        faceColor[3] = faceAlpha * 255;
        pixel = alphaComposite(pixel, faceColor);
      }

      // --- Layers 5-6: Eyes (skip at 16px) ---
      if (size >= 32) {
        for (const sign of [-1, 1]) {
          const ex = center + sign * eyeOffX;
          const ey = center + eyeOffY;
          const eDist = sdfEllipse(px, py, ex, ey, eyeRx, eyeRy);
          const eAlpha = 1 - smoothstep(-aa * 0.7, aa * 0.7, eDist);
          if (eAlpha > 0) {
            pixel = alphaComposite(pixel, [EYE_COLOR[0], EYE_COLOR[1], EYE_COLOR[2], eAlpha * 255]);
          }
        }
      }

      // --- Layers 7-8: Eye highlights (skip at ≤32px) ---
      if (size >= 48) {
        for (const sign of [-1, 1]) {
          const hx = center + sign * eyeOffX + hlOffX;
          const hy = center + eyeOffY + hlOffY;
          const hDist = sdfCircle(px, py, hx, hy, hlR);
          const hAlpha = 1 - smoothstep(-aa * 0.5, aa * 0.5, hDist);
          if (hAlpha > 0) {
            pixel = alphaComposite(pixel, [255, 255, 255, hAlpha * EYE_HIGHLIGHT[3]]);
          }
        }
      }

      // --- Layer 9: Smile arc (skip at 16px) ---
      if (size >= 32) {
        const smCenterY = center + smileOffY;
        const smDx = px - center;
        const smDy = py - smCenterY;
        const smDist = Math.sqrt(smDx * smDx + smDy * smDy);
        const ringDist = Math.abs(smDist - smileArcR) - smileStroke / 2;
        // Only bottom half of the arc
        if (py > smCenterY) {
          const smAlpha = 1 - smoothstep(-aa * 0.8, aa * 0.8, ringDist);
          if (smAlpha > 0) {
            pixel = alphaComposite(pixel, [SMILE_COLOR[0], SMILE_COLOR[1], SMILE_COLOR[2], smAlpha * 255]);
          }
        }
      }

      // Write RGBA
      rawRows.push(
        Math.round(Math.max(0, Math.min(255, pixel[0]))),
        Math.round(Math.max(0, Math.min(255, pixel[1]))),
        Math.round(Math.max(0, Math.min(255, pixel[2]))),
        Math.round(Math.max(0, Math.min(255, pixel[3]))),
      );
    }
  }

  const compressed = deflateSync(Buffer.from(rawRows));

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [16, 32, 48, 128]) {
  const png = createPNG(size);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), png);
  console.log(`Created icon${size}.png (${png.length} bytes)`);
}
