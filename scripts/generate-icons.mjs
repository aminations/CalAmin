// Generates the PWA app icons (rounded calendar glyph on the accent color)
// as PNGs without any image library: shapes are evaluated per pixel and the
// PNG is assembled by hand on top of node's zlib.
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')

const ACCENT = [0x7c, 0xa8, 0xd8] // app accent — also the maskable full-bleed background
const DEEP = [0x4e, 0x7d, 0xb1]
const WHITE = [0xff, 0xff, 0xff]
const PALE = [0xd9, 0xe4, 0xf2]

// ---- PNG encoding ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}

function encodePng(size, rgb) {
  const stride = size * 3
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type: truecolor RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---- drawing (unit coordinates, signed-distance shapes) ----
function inRoundRect(u, v, cx, cy, hw, hh, r) {
  const dx = Math.abs(u - cx) - (hw - r)
  const dy = Math.abs(v - cy) - (hh - r)
  const ax = Math.max(dx, 0)
  const ay = Math.max(dy, 0)
  return Math.hypot(ax, ay) + Math.min(Math.max(dx, dy), 0) - r <= 0
}

function inCircle(u, v, cx, cy, r) {
  return Math.hypot(u - cx, v - cy) <= r
}

const GRID_DOTS = [
  [0.38, 0.585, false],
  [0.5, 0.585, false],
  [0.62, 0.585, false],
  [0.38, 0.7, false],
  [0.5, 0.7, false],
  [0.62, 0.7, true], // "today"
]

function colorAt(u, v) {
  // binding rings poke above the card, on top of everything
  for (const rx of [0.375, 0.625]) {
    if (inRoundRect(u, v, rx, 0.345, 0.024, 0.07, 0.024)) return WHITE
  }
  if (inRoundRect(u, v, 0.5, 0.6, 0.3, 0.24, 0.075)) {
    if (v < 0.47) return DEEP // header band
    for (const [dx, dy, today] of GRID_DOTS) {
      if (inCircle(u, v, dx, dy, 0.032)) return today ? ACCENT : PALE
    }
    return WHITE
  }
  return ACCENT
}

function render(size) {
  const rgb = Buffer.alloc(size * size * 3)
  const SS = 3 // 3x3 supersampling
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      for (let i = 0; i < SS; i++) {
        for (let j = 0; j < SS; j++) {
          const c = colorAt((x + (i + 0.5) / SS) / size, (y + (j + 0.5) / SS) / size)
          r += c[0]
          g += c[1]
          b += c[2]
        }
      }
      const o = (y * size + x) * 3
      rgb[o] = Math.round(r / (SS * SS))
      rgb[o + 1] = Math.round(g / (SS * SS))
      rgb[o + 2] = Math.round(b / (SS * SS))
    }
  }
  return encodePng(size, rgb)
}

mkdirSync(OUT_DIR, { recursive: true })
for (const [size, name] of [
  [512, 'icon-512.png'],
  [192, 'icon-192.png'],
  [180, 'apple-touch-icon.png'],
]) {
  writeFileSync(join(OUT_DIR, name), render(size))
  console.log(`wrote public/icons/${name} (${size}x${size})`)
}
