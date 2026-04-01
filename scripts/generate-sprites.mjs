/**
 * Generates pixel art sprites as PNG files for CanvasBuddy.
 * Each sprite is 32x32 pixels, drawn using raw RGBA pixel data.
 * Run with: node scripts/generate-sprites.mjs
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../src/public/sprites");
const ICON_DIR = join(__dirname, "../src/public/icons");

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(ICON_DIR, { recursive: true });

// Minimal PNG encoder - no dependencies needed
function encodePng(width, height, pixels) {
  // pixels: Uint8Array of RGBA values, length = width * height * 4
  function adler32(data) {
    let s1 = 1, s2 = 0;
    for (const b of data) {
      s1 = (s1 + b) % 65521;
      s2 = (s2 + s1) % 65521;
    }
    return (s2 << 16) | s1;
  }

  function crc32(data) {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[i] = c;
    }
    let crc = 0xffffffff;
    for (const b of data) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function u32be(n) {
    return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
  }

  function chunk(type, data) {
    const typeBytes = [...type].map(c => c.charCodeAt(0));
    const crcInput = [...typeBytes, ...data];
    return [...u32be(data.length), ...typeBytes, ...data, ...u32be(crc32(crcInput))];
  }

  // Build raw image data (filter byte 0 per scanline)
  const raw = [];
  for (let y = 0; y < height; y++) {
    raw.push(0); // filter type None
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      raw.push(pixels[i], pixels[i+1], pixels[i+2], pixels[i+3]);
    }
  }

  // Deflate using uncompressed blocks (BTYPE=00)
  function deflateUncompressed(data) {
    const out = [0x78, 0x01]; // zlib header, deflate, default compression
    const BLOCK_SIZE = 65535;
    for (let offset = 0; offset < data.length; offset += BLOCK_SIZE) {
      const block = data.slice(offset, offset + BLOCK_SIZE);
      const last = offset + BLOCK_SIZE >= data.length ? 1 : 0;
      const len = block.length;
      const nlen = (~len) & 0xffff;
      out.push(last, len & 0xff, (len >> 8) & 0xff, nlen & 0xff, (nlen >> 8) & 0xff, ...block);
    }
    const checksum = adler32(data);
    out.push(...u32be(checksum));
    return out;
  }

  const ihdr = [...u32be(width), ...u32be(height), 8, 6, 0, 0, 0]; // 8-bit RGBA
  const idat = deflateUncompressed(raw);

  const bytes = [
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
    ...chunk("IHDR", ihdr),
    ...chunk("IDAT", idat),
    ...chunk("IEND", []),
  ];

  return Buffer.from(bytes);
}

function makePixels(w, h, drawFn) {
  const buf = new Uint8Array(w * h * 4);
  function set(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const i = (y * w + x) * 4;
    buf[i] = r; buf[i+1] = g; buf[i+2] = b; buf[i+3] = a;
  }
  function rect(x, y, rw, rh, r, g, b, a = 255) {
    for (let dy = 0; dy < rh; dy++)
      for (let dx = 0; dx < rw; dx++)
        set(x + dx, y + dy, r, g, b, a);
  }
  function circle(cx, cy, radius, r, g, b, a = 255) {
    for (let dy = -radius; dy <= radius; dy++)
      for (let dx = -radius; dx <= radius; dx++)
        if (dx*dx + dy*dy <= radius*radius)
          set(cx + dx, cy + dy, r, g, b, a);
  }
  drawFn({ set, rect, circle, w, h });
  return buf;
}

// Color palettes
const C = {
  // Inklet colors
  inkBlue: [30, 60, 140],
  inkDark: [10, 20, 80],
  inkLight: [100, 140, 220],
  inkHighlight: [180, 210, 255],
  // Flasky colors
  flaskGreen: [50, 160, 80],
  flaskDark: [20, 80, 40],
  flaskLight: [120, 220, 130],
  flaskGlow: [200, 255, 180],
  // Nappie colors
  nappieRed: [180, 60, 50],
  nappieDark: [100, 30, 20],
  nappieLight: [230, 140, 100],
  nappieHighlight: [255, 200, 160],
  nappieCream: [255, 240, 200],
  // Shared
  white: [255, 255, 255],
  black: [20, 20, 20],
  outline: [30, 30, 30],
  eyeWhite: [240, 240, 240],
  pupil: [20, 20, 20],
  shine: [255, 255, 255],
  transparent: [0, 0, 0, 0],
};

function p(color, a = 255) { return [...color, a]; }

// ---- INKLET sprites ----

function drawInklet1(frame) {
  return makePixels(32, 32, ({ set, rect, circle }) => {
    // Ink drop body - dark blue teardrop
    const bx = 8, by = 6;
    // Main body (oval drop shape)
    circle(16, 19, 8, ...C.inkBlue);
    circle(16, 19, 7, ...C.inkBlue);
    // Pointy top
    rect(14, 8, 4, 8, ...C.inkBlue);
    set(15, 7, ...C.inkBlue); set(16, 7, ...C.inkBlue);
    set(15, 6, ...C.inkBlue);
    // Outline
    for (let y = 6; y < 28; y++)
      for (let x = 6; x < 26; x++) {
        const i = (y * 32 + x) * 4;
        // We'll use circle for outline
      }
    circle(16, 19, 9, ...C.inkDark);
    circle(16, 19, 8, ...C.inkBlue);
    rect(13, 7, 6, 9, ...C.inkDark);
    rect(14, 8, 4, 8, ...C.inkBlue);
    set(15, 6, ...C.inkDark); set(16, 6, ...C.inkDark);
    set(15, 5, ...C.inkBlue); set(16, 5, ...C.inkBlue);
    set(15, 4, ...C.inkDark); set(16, 4, ...C.inkDark);
    // Shine
    circle(13, 15, 2, ...C.inkHighlight);
    set(13, 14, ...C.shine);
    // Eyes
    set(13, 18, ...C.eyeWhite); set(14, 18, ...C.eyeWhite);
    set(13, 19, ...C.eyeWhite); set(14, 19, ...C.eyeWhite);
    set(19, 18, ...C.eyeWhite); set(20, 18, ...C.eyeWhite);
    set(19, 19, ...C.eyeWhite); set(20, 19, ...C.eyeWhite);
    // Pupils (shifted slightly for frame)
    const px = frame === "a" ? 0 : 0;
    const py = frame === "a" ? 0 : 1;
    set(14 + px, 18 + py, ...C.pupil); set(20 + px, 18 + py, ...C.pupil);
    // Shine on eyes
    set(13, 18, ...C.shine);
    set(19, 18, ...C.shine);
    // Smile
    set(14, 22, ...C.inkDark); set(15, 23, ...C.inkDark);
    set(16, 23, ...C.inkDark); set(17, 23, ...C.inkDark);
    set(18, 22, ...C.inkDark);
  });
}

function drawInklet2(frame) {
  return makePixels(32, 32, ({ set, rect, circle }) => {
    // Open book with small arms and legs
    // Book body
    rect(4, 10, 12, 14, ...C.inkLight);  // left page
    rect(16, 10, 12, 14, ...C.inkDark);  // right page (darker)
    rect(15, 8, 2, 18, ...C.outline);    // spine
    // Page lines
    for (let y = 13; y < 22; y += 2) {
      rect(6, y, 8, 1, ...C.inkDark);
      rect(18, y, 8, 1, ...C.inkLight);
    }
    // Book outline
    rect(3, 9, 26, 16, ...C.outline);
    rect(4, 10, 24, 14, 0, 0, 0, 0);
    rect(4, 10, 12, 14, ...C.inkLight);
    rect(16, 10, 12, 14, ...C.inkDark);
    rect(15, 8, 2, 18, ...C.outline);
    // Eyes on book face
    set(9, 15, ...C.eyeWhite); set(10, 15, ...C.eyeWhite);
    set(9, 16, ...C.eyeWhite); set(10, 16, ...C.eyeWhite);
    set(22, 15, ...C.eyeWhite); set(23, 15, ...C.eyeWhite);
    set(22, 16, ...C.eyeWhite); set(23, 16, ...C.eyeWhite);
    const py = frame === "a" ? 0 : 1;
    set(10, 15 + py, ...C.pupil); set(23, 15 + py, ...C.pupil);
    set(9, 15, ...C.shine); set(22, 15, ...C.shine);
    // Smile
    set(9, 19, ...C.inkDark); set(10, 20, ...C.inkDark);
    set(11, 20, ...C.inkDark); set(12, 19, ...C.inkDark);
    // Arms
    rect(1, 14, 3, 2, ...C.inkBlue);
    rect(28, 14, 3, 2, ...C.inkBlue);
    // Legs
    rect(8, 24, 3, 4, ...C.inkBlue);
    rect(21, 24, 3, 4, ...C.inkBlue);
    rect(6, 27, 3, 2, ...C.inkBlue);
    rect(23, 27, 3, 2, ...C.inkBlue);
  });
}

function drawInklet3(frame) {
  return makePixels(32, 32, ({ set, rect, circle }) => {
    // Grand illuminated tome with magical glow
    // Glow aura
    for (let y = 2; y < 30; y++)
      for (let x = 2; x < 30; x++) {
        const dx = x - 16, dy = y - 16;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 14) {
          const alpha = Math.floor(80 * (1 - dist / 14));
          set(x, y, 100, 140, 255, alpha);
        }
      }
    // Book
    rect(5, 4, 22, 26, ...C.inkDark);
    rect(6, 5, 20, 24, ...C.inkBlue);
    rect(6, 5, 3, 24, ...C.inkDark);  // thick spine
    // Gold clasp
    rect(22, 14, 4, 4, 200, 170, 50);
    rect(23, 15, 2, 2, 255, 220, 80);
    // Page lines (golden)
    for (let y = 9; y < 26; y += 2)
      rect(11, y, 12, 1, 200, 180, 100);
    // Stars on cover
    set(15, 8, 255, 255, 180); set(14, 7, 255, 255, 180); set(16, 7, 255, 255, 180);
    set(15, 6, 255, 255, 180); set(13, 8, 255, 255, 180); set(17, 8, 255, 255, 180);
    // Eyes
    set(13, 16, ...C.inkHighlight); set(14, 16, ...C.inkHighlight);
    set(13, 17, ...C.inkHighlight); set(14, 17, ...C.inkHighlight);
    set(19, 16, ...C.inkHighlight); set(20, 16, ...C.inkHighlight);
    set(19, 17, ...C.inkHighlight); set(20, 17, ...C.inkHighlight);
    const py = frame === "a" ? 0 : 1;
    set(14, 16 + py, ...C.inkDark); set(20, 16 + py, ...C.inkDark);
    set(13, 16, ...C.shine); set(19, 16, ...C.shine);
    // Smile
    set(13, 20, ...C.inkHighlight); set(14, 21, ...C.inkHighlight);
    set(16, 21, ...C.inkHighlight); set(17, 21, ...C.inkHighlight); set(18, 21, ...C.inkHighlight);
    set(19, 20, ...C.inkHighlight);
  });
}

// ---- FLASKY sprites ----

function drawFlasky1(frame) {
  return makePixels(32, 32, ({ set, rect, circle }) => {
    // Small test tube with bubbles
    // Tube body
    rect(13, 4, 6, 2, ...C.flaskDark); // rim
    rect(12, 6, 8, 2, ...C.flaskDark); // neck
    rect(11, 8, 10, 16, ...C.flaskDark); // outline body
    rect(12, 8, 8, 15, ...C.flaskGreen); // fill
    // Rounded bottom
    circle(16, 23, 4, ...C.flaskDark);
    circle(16, 23, 3, ...C.flaskGreen);
    // Liquid
    rect(12, 18, 8, 6, 80, 200, 100);
    circle(16, 23, 3, 80, 200, 100);
    // Shine on glass
    rect(13, 9, 2, 8, ...C.flaskLight);
    // Bubbles
    const bOff = frame === "a" ? 0 : -1;
    circle(15, 14 + bOff, 1, ...C.flaskGlow);
    circle(18, 17 + bOff, 1, ...C.flaskGlow);
    circle(14, 20 + bOff, 1, ...C.flaskGlow);
    // Eyes on tube
    set(14, 12, ...C.eyeWhite); set(15, 12, ...C.eyeWhite);
    set(17, 12, ...C.eyeWhite); set(18, 12, ...C.eyeWhite);
    const py = frame === "a" ? 0 : 1;
    set(15, 12 + py, ...C.pupil); set(18, 12 + py, ...C.pupil);
    set(14, 12, ...C.shine); set(17, 12, ...C.shine);
    // Smile
    set(14, 15, ...C.flaskDark); set(15, 16, ...C.flaskDark);
    set(16, 16, ...C.flaskDark); set(17, 16, ...C.flaskDark); set(18, 15, ...C.flaskDark);
  });
}

function drawFlasky2(frame) {
  return makePixels(32, 32, ({ set, rect, circle }) => {
    // Beaker with animated bubbling
    // Beaker shape
    rect(10, 4, 12, 3, ...C.flaskDark); // rim
    rect(9, 7, 14, 18, ...C.flaskDark); // body outline
    rect(10, 8, 12, 16, ...C.flaskGreen);
    // Liquid fill
    rect(10, 16, 12, 8, 60, 190, 90);
    // Pouring spout
    rect(19, 5, 5, 2, ...C.flaskDark);
    // Bubbles rising
    const bOff = frame === "a" ? 0 : -2;
    circle(13, 18 + bOff, 1, ...C.flaskGlow);
    circle(16, 15 + bOff, 2, ...C.flaskGlow);
    circle(20, 17 + bOff, 1, ...C.flaskGlow);
    circle(14, 12 + bOff, 1, ...C.flaskLight);
    // Bottom
    rect(10, 24, 12, 2, ...C.flaskDark);
    // Stand legs
    rect(10, 26, 3, 4, ...C.flaskDark);
    rect(19, 26, 3, 4, ...C.flaskDark);
    // Shine
    rect(11, 9, 3, 10, ...C.flaskLight);
    // Eyes
    set(13, 11, ...C.eyeWhite); set(14, 11, ...C.eyeWhite);
    set(13, 12, ...C.eyeWhite); set(14, 12, ...C.eyeWhite);
    set(18, 11, ...C.eyeWhite); set(19, 11, ...C.eyeWhite);
    set(18, 12, ...C.eyeWhite); set(19, 12, ...C.eyeWhite);
    const py = frame === "a" ? 0 : 1;
    set(14, 11 + py, ...C.pupil); set(19, 11 + py, ...C.pupil);
    set(13, 11, ...C.shine); set(18, 11, ...C.shine);
    // Smile
    set(13, 14, ...C.flaskDark); set(14, 15, ...C.flaskDark);
    set(16, 15, ...C.flaskDark); set(17, 15, ...C.flaskDark); set(18, 14, ...C.flaskDark);
  });
}

function drawFlasky3(frame) {
  return makePixels(32, 32, ({ set, rect, circle }) => {
    // Ornate alchemist's flask with swirling colors
    // Glow
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        const dx = x - 16, dy = y - 20;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 13) set(x, y, 40, 180, 60, Math.floor(60 * (1 - dist/13)));
      }
    // Flask body (rounder, fancier)
    circle(16, 20, 10, ...C.flaskDark);
    circle(16, 20, 9, ...C.flaskGreen);
    // Neck
    rect(13, 6, 6, 8, ...C.flaskDark);
    rect(14, 7, 4, 7, ...C.flaskGreen);
    // Rim with gold
    rect(12, 4, 8, 3, 160, 130, 30);
    rect(13, 5, 6, 2, 220, 190, 60);
    // Swirl inside
    const swOff = frame === "a" ? 0 : 2;
    circle(13 + swOff, 20, 3, 100, 230, 120);
    circle(20 - swOff, 22, 3, 150, 255, 100);
    circle(16, 17 + swOff, 2, 200, 255, 150);
    // Shine
    circle(12, 16, 2, ...C.flaskLight);
    set(12, 15, ...C.shine); set(11, 15, ...C.shine);
    // Gold runes on side
    set(20, 18, 220, 190, 60); set(20, 20, 220, 190, 60); set(20, 22, 220, 190, 60);
    set(12, 23, 220, 190, 60); set(13, 24, 220, 190, 60); set(14, 23, 220, 190, 60);
    // Eyes
    set(13, 19, ...C.flaskGlow); set(14, 19, ...C.flaskGlow);
    set(13, 20, ...C.flaskGlow); set(14, 20, ...C.flaskGlow);
    set(19, 19, ...C.flaskGlow); set(20, 19, ...C.flaskGlow);
    set(19, 20, ...C.flaskGlow); set(20, 20, ...C.flaskGlow);
    const py = frame === "a" ? 0 : 1;
    set(14, 19 + py, ...C.flaskDark); set(20, 19 + py, ...C.flaskDark);
    set(13, 19, ...C.shine); set(19, 19, ...C.shine);
    // Wide smile
    for (let x = 13; x <= 20; x++) {
      const col = (x === 13 || x === 20) ? C.flaskDark : C.flaskGlow;
      set(x, 24, ...col);
    }
    set(12, 23, ...C.flaskDark); set(21, 23, ...C.flaskDark);
  });
}

// ---- NAPPIE sprites ----

function drawNappie1(frame) {
  return makePixels(32, 32, ({ set, rect, circle }) => {
    // Sleepy coffee cup
    // Cup outline
    rect(7, 12, 18, 16, ...C.nappieDark);
    rect(8, 13, 16, 14, ...C.nappieRed);
    // Handle
    rect(25, 15, 3, 8, ...C.nappieDark);
    rect(25, 16, 2, 6, ...C.nappieRed);
    // Rim
    rect(6, 10, 20, 3, ...C.nappieDark);
    rect(7, 11, 18, 2, ...C.nappieLight);
    // Saucer
    rect(4, 27, 24, 3, ...C.nappieDark);
    rect(5, 28, 22, 2, ...C.nappieLight);
    // Steam (sleepy wavy lines)
    const sOff = frame === "a" ? 0 : 1;
    set(12, 7 - sOff, ...C.nappieLight); set(13, 6 - sOff, ...C.nappieLight);
    set(14, 7 - sOff, ...C.nappieLight); set(15, 6 - sOff, ...C.nappieLight);
    set(16, 7 - sOff, ...C.nappieLight); set(17, 8 - sOff, ...C.nappieLight);
    set(18, 7 - sOff, ...C.nappieLight);
    set(10, 5 - sOff, ...C.nappieLight); set(11, 4 - sOff, ...C.nappieLight);
    set(12, 5 - sOff, ...C.nappieLight);
    // Sleepy eyes (half-closed)
    rect(10, 17, 4, 1, ...C.nappieDark); // left brow down
    rect(18, 17, 4, 1, ...C.nappieDark);
    set(11, 18, ...C.eyeWhite); set(12, 18, ...C.eyeWhite);
    set(11, 19, ...C.eyeWhite); set(12, 19, ...C.eyeWhite);
    set(19, 18, ...C.eyeWhite); set(20, 18, ...C.eyeWhite);
    set(19, 19, ...C.eyeWhite); set(20, 19, ...C.eyeWhite);
    set(12, 18, ...C.pupil); set(20, 18, ...C.pupil);
    // ZZZ indicator
    set(20, 9, ...C.nappieDark); set(21, 8, ...C.nappieDark); set(22, 9, ...C.nappieDark);
    set(20, 8, ...C.nappieDark); set(22, 8, ...C.nappieDark);
    // Sleepy smile
    set(12, 22, ...C.nappieDark); set(13, 23, ...C.nappieDark);
    set(14, 23, ...C.nappieDark); set(15, 23, ...C.nappieDark); set(16, 22, ...C.nappieDark);
    // Shine on cup
    rect(9, 14, 2, 6, ...C.nappieHighlight);
  });
}

function drawNappie2(frame) {
  return makePixels(32, 32, ({ set, rect, circle }) => {
    // Caffeinated little owl with wide eyes
    // Body
    circle(16, 20, 9, ...C.nappieDark);
    circle(16, 20, 8, ...C.nappieRed);
    // Belly
    circle(16, 22, 5, ...C.nappieCream);
    // Head
    circle(16, 11, 7, ...C.nappieDark);
    circle(16, 11, 6, ...C.nappieRed);
    // Ear tufts
    rect(10, 4, 3, 4, ...C.nappieDark);
    rect(19, 4, 3, 4, ...C.nappieDark);
    rect(11, 5, 2, 3, ...C.nappieRed);
    rect(20, 5, 2, 3, ...C.nappieRed);
    // WIDE awake eyes
    circle(13, 11, 3, ...C.nappieDark);
    circle(19, 11, 3, ...C.nappieDark);
    circle(13, 11, 2, ...C.eyeWhite);
    circle(19, 11, 2, ...C.eyeWhite);
    const py = frame === "a" ? 0 : 1;
    circle(13, 11 + py, 1, ...C.pupil);
    circle(19, 11 + py, 1, ...C.pupil);
    set(12, 10, ...C.shine); set(18, 10, ...C.shine);
    // Beak
    rect(15, 14, 2, 2, 220, 160, 40);
    rect(14, 15, 4, 1, 200, 140, 30);
    // Wings
    rect(4, 17, 6, 8, ...C.nappieDark);
    rect(5, 18, 4, 6, ...C.nappieRed);
    rect(22, 17, 6, 8, ...C.nappieDark);
    rect(23, 18, 4, 6, ...C.nappieRed);
    // Feet
    rect(12, 28, 4, 2, 200, 150, 50);
    rect(17, 28, 4, 2, 200, 150, 50);
    // Coffee cup it's holding
    rect(13, 23, 6, 5, ...C.nappieDark);
    rect(14, 24, 4, 3, 80, 50, 30);
    // Energy lines around
    const eOff = frame === "a" ? 0 : 1;
    set(6, 8 + eOff, 255, 220, 50); set(5, 7 + eOff, 255, 220, 50);
    set(26, 8 + eOff, 255, 220, 50); set(27, 7 + eOff, 255, 220, 50);
    set(4, 13 + eOff, 255, 220, 50);
    set(28, 13 + eOff, 255, 220, 50);
  });
}

function drawNappie3(frame) {
  return makePixels(32, 32, ({ set, rect, circle }) => {
    // Fully awake scholar owl in graduation cap
    // Gown glow
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        const dx = x - 16, dy = y - 18;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 14) set(x, y, 180, 80, 50, Math.floor(50 * (1 - dist/14)));
      }
    // Body/gown
    circle(16, 21, 10, ...C.nappieDark);
    circle(16, 21, 9, 80, 50, 100);  // purple gown
    // Gown accent
    rect(10, 24, 12, 4, 100, 60, 120);
    // Head
    circle(16, 11, 7, ...C.nappieDark);
    circle(16, 11, 6, ...C.nappieRed);
    // Graduation cap
    rect(9, 5, 14, 3, ...C.nappieDark);
    rect(8, 4, 16, 2, ...C.nappieDark); // brim
    rect(14, 2, 4, 3, ...C.nappieDark); // top cap
    // Cap tassel
    set(22, 4, 220, 190, 60); set(23, 5, 220, 190, 60); set(23, 6, 220, 190, 60);
    set(23, 7, 220, 190, 60); set(22, 8, 220, 190, 60); set(21, 8, 220, 190, 60);
    // Wise eyes
    circle(13, 11, 3, ...C.nappieDark);
    circle(19, 11, 3, ...C.nappieDark);
    circle(13, 11, 2, ...C.eyeWhite);
    circle(19, 11, 2, ...C.eyeWhite);
    const py = frame === "a" ? 0 : 1;
    circle(13, 11 + py, 1, ...C.pupil);
    circle(19, 11 + py, 1, ...C.pupil);
    set(12, 10, ...C.shine); set(18, 10, ...C.shine);
    // Monocle
    circle(20, 11, 3, ...C.nappieDark);
    circle(20, 11, 3, 220, 190, 60);
    circle(20, 11, 2, ...C.eyeWhite);
    circle(20, 11, 1, ...C.pupil);
    set(19, 10, ...C.shine);
    set(21, 14, 220, 190, 60); set(22, 15, 220, 190, 60);
    // Beak
    rect(15, 14, 2, 2, 220, 160, 40);
    // Wings/arms with books
    rect(3, 16, 7, 8, ...C.nappieDark);
    rect(4, 17, 5, 6, 80, 50, 100);
    rect(22, 16, 7, 8, ...C.nappieDark);
    rect(23, 17, 5, 6, 80, 50, 100);
    // Book in left wing
    rect(2, 17, 4, 6, ...C.inkBlue);
    rect(3, 18, 2, 4, ...C.inkLight);
    // Smile
    set(13, 15, ...C.nappieDark); set(14, 16, ...C.nappieDark);
    set(16, 16, ...C.nappieDark); set(17, 16, ...C.nappieDark); set(18, 16, ...C.nappieDark);
    set(19, 15, ...C.nappieDark);
  });
}

// Draw and save all sprites
const sprites = [
  { name: "inklet-1a", draw: () => drawInklet1("a") },
  { name: "inklet-1b", draw: () => drawInklet1("b") },
  { name: "inklet-2a", draw: () => drawInklet2("a") },
  { name: "inklet-2b", draw: () => drawInklet2("b") },
  { name: "inklet-3a", draw: () => drawInklet3("a") },
  { name: "inklet-3b", draw: () => drawInklet3("b") },
  { name: "flasky-1a", draw: () => drawFlasky1("a") },
  { name: "flasky-1b", draw: () => drawFlasky1("b") },
  { name: "flasky-2a", draw: () => drawFlasky2("a") },
  { name: "flasky-2b", draw: () => drawFlasky2("b") },
  { name: "flasky-3a", draw: () => drawFlasky3("a") },
  { name: "flasky-3b", draw: () => drawFlasky3("b") },
  { name: "nappie-1a", draw: () => drawNappie1("a") },
  { name: "nappie-1b", draw: () => drawNappie1("b") },
  { name: "nappie-2a", draw: () => drawNappie2("a") },
  { name: "nappie-2b", draw: () => drawNappie2("b") },
  { name: "nappie-3a", draw: () => drawNappie3("a") },
  { name: "nappie-3b", draw: () => drawNappie3("b") },
];

for (const sprite of sprites) {
  const pixels = sprite.draw();
  const png = encodePng(32, 32, pixels);
  const outPath = join(OUT_DIR, `${sprite.name}.png`);
  writeFileSync(outPath, png);
  console.log(`Generated ${sprite.name}.png`);
}

// Generate extension icons (simple colored square with "CB" text isn't possible without
// a font rasterizer, so we'll make a distinctive geometric icon instead)
function makeIcon(size) {
  return makePixels(size, size, ({ rect, circle, set }) => {
    const s = size;
    const cx = Math.floor(s / 2);
    // Dark background
    rect(0, 0, s, s, 30, 20, 50);
    // Rounded corners approximation
    set(0, 0, 0, 0, 0, 0); set(1, 0, 0, 0, 0, 0); set(0, 1, 0, 0, 0, 0);
    set(s-1, 0, 0, 0, 0, 0); set(s-2, 0, 0, 0, 0, 0); set(s-1, 1, 0, 0, 0, 0);
    set(0, s-1, 0, 0, 0, 0); set(1, s-1, 0, 0, 0, 0); set(0, s-2, 0, 0, 0, 0);
    set(s-1, s-1, 0, 0, 0, 0); set(s-2, s-1, 0, 0, 0, 0); set(s-1, s-2, 0, 0, 0, 0);
    // Ink drop shape in center
    const r = Math.floor(s * 0.28);
    circle(cx, cx + Math.floor(s * 0.08), r, 40, 80, 180);
    circle(cx, cx + Math.floor(s * 0.08), r - 1, 60, 110, 220);
    // Drop tip
    const tipH = Math.floor(s * 0.25);
    const tipX = cx - 1;
    const tipY = Math.floor(s * 0.15);
    for (let y = tipY; y < tipY + tipH; y++) {
      const w2 = Math.floor((y - tipY) / tipH * 2) + 1;
      for (let x = tipX - w2; x <= tipX + w2; x++)
        set(x, y, 60, 110, 220);
    }
    // Shine
    circle(cx - Math.floor(r * 0.4), cx - Math.floor(r * 0.1), Math.max(1, Math.floor(r * 0.25)), 180, 210, 255);
  });
}

for (const size of [16, 32, 48, 128]) {
  const pixels = makeIcon(size);
  const png = encodePng(size, size, pixels);
  writeFileSync(join(ICON_DIR, `icon-${size}.png`), png);
  console.log(`Generated icon-${size}.png`);
}

console.log("Done! All sprites and icons generated.");
