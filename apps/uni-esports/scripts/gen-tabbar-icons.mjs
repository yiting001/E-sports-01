/**
 * tabBar 图标生成脚本（构建期一次性工具，产物已提交 src/static/tabbar/）。
 * 不引入绘图依赖：手写 PNG 编码（zlib deflate + CRC32），81×81 RGBA，
 * 4 组图标（首页/分类/消息/我的）× 普通态/选中态，3×3 超采样抗锯齿。
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SIZE = 81;
const SAMPLES = 3;

const COLORS = {
  normal: [0x67, 0x73, 0x8c],
  active: [0xff, 0xb0, 0x20],
};

/** 圆角矩形 SDF：<= 0 表示点在图形内部 */
function insideRoundRect(x, y, cx, cy, hw, hh, r) {
  const dx = Math.abs(x - cx) - (hw - r);
  const dy = Math.abs(y - cy) - (hh - r);
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  return outside + Math.min(Math.max(dx, dy), 0) - r <= 0;
}

function insideCircle(x, y, cx, cy, r) {
  return Math.hypot(x - cx, y - cy) <= r;
}

function insideTriangle(x, y, ax, ay, bx, by, cx, cy) {
  const sign = (x1, y1, x2, y2, x3, y3) =>
    (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3);
  const d1 = sign(x, y, ax, ay, bx, by);
  const d2 = sign(x, y, bx, by, cx, cy);
  const d3 = sign(x, y, cx, cy, ax, ay);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

const SHAPES = {
  home(x, y) {
    const roof = y >= 0.1 && y <= 0.52 && Math.abs(x - 0.5) <= (y - 0.1) * 0.98 + 0.03;
    const body = x >= 0.2 && x <= 0.8 && y >= 0.48 && y <= 0.9;
    const door = x >= 0.42 && x <= 0.58 && y >= 0.64 && y <= 0.9;
    return (roof || body) && !door;
  },

  category(x, y) {
    const cells = [
      [0.29, 0.29],
      [0.71, 0.29],
      [0.29, 0.71],
      [0.71, 0.71],
    ];
    return cells.some(([cx, cy]) => insideRoundRect(x, y, cx, cy, 0.19, 0.19, 0.05));
  },

  message(x, y) {
    const bubble = insideRoundRect(x, y, 0.5, 0.38, 0.4, 0.24, 0.1);
    const tail = insideTriangle(x, y, 0.26, 0.6, 0.26, 0.86, 0.54, 0.6);
    return bubble || tail;
  },

  profile(x, y) {
    const head = insideCircle(x, y, 0.5, 0.3, 0.18);
    const shoulder = y <= 0.78 && insideCircle(x, y, 0.5, 0.78, 0.3);
    return head || shoulder;
  },
};

/* ===== 聊天工具图标（48×48，灰 #9aa6bb） ===== */

const UI_COLORS = { normal: [0x9a, 0xa6, 0xbb] };

const UI_ICONS = {
  'chat-image'(x, y) {
    // 圆角矩形相框 + 左上光点 + 山形
    const frame = insideRoundRect(x, y, 0.5, 0.5, 0.42, 0.34, 0.08);
    const mountain = insideTriangle(x, y, 0.14, 0.72, 0.44, 0.34, 0.56, 0.72)
      || insideTriangle(x, y, 0.46, 0.72, 0.66, 0.48, 0.88, 0.72);
    const dot = insideCircle(x, y, 0.32, 0.34, 0.05);
    return frame && (mountain || dot) && y <= 0.72;
  },

  'chat-video'(x, y) {
    // 圆角矩形 + 内部播放三角
    const frame = insideRoundRect(x, y, 0.5, 0.5, 0.42, 0.34, 0.08);
    const play = insideTriangle(x, y, 0.4, 0.34, 0.4, 0.66, 0.68, 0.5);
    return frame && play;
  },
};

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let row = 0; row < size; row += 1) {
    raw[row * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, row * (size * 4 + 1) + 1, row * size * 4, (row + 1) * size * 4);
  }
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function render(shapeFn, color) {
  const rgba = Buffer.alloc(SIZE * SIZE * 4);
  for (let py = 0; py < SIZE; py += 1) {
    for (let px = 0; px < SIZE; px += 1) {
      let hits = 0;
      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          const x = (px + (sx + 0.5) / SAMPLES) / SIZE;
          const y = (py + (sy + 0.5) / SAMPLES) / SIZE;
          if (shapeFn(x, y)) {
            hits += 1;
          }
        }
      }
      const alpha = Math.round((255 * hits) / (SAMPLES * SAMPLES));
      const offset = (py * SIZE + px) * 4;
      rgba[offset] = color[0];
      rgba[offset + 1] = color[1];
      rgba[offset + 2] = color[2];
      rgba[offset + 3] = alpha;
    }
  }
  return rgba;
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'static', 'tabbar');
mkdirSync(outDir, { recursive: true });

for (const [name, shapeFn] of Object.entries(SHAPES)) {
  writeFileSync(join(outDir, `${name}.png`), encodePng(SIZE, render(shapeFn, COLORS.normal)));
  writeFileSync(join(outDir, `${name}-active.png`), encodePng(SIZE, render(shapeFn, COLORS.active)));
  console.log(`生成 ${name}.png / ${name}-active.png`);
}

const uiDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'static', 'icons');
mkdirSync(uiDir, { recursive: true });

for (const [name, shapeFn] of Object.entries(UI_ICONS)) {
  writeFileSync(join(uiDir, `${name}.png`), encodePng(48, render(shapeFn, UI_COLORS.normal)));
  console.log(`生成 ${name}.png`);
}
