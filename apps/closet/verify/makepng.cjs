const zlib = require('zlib')

const crcTable = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

/**
 * A fake garment photo: a solid rectangle of `color` centred on a flat white
 * background, which is exactly the case the background trimmer targets.
 */
function garmentPng(width, height, color) {
  const raw = Buffer.alloc(height * (1 + width * 3))
  const x0 = Math.floor(width * 0.28)
  const x1 = Math.floor(width * 0.72)
  const y0 = Math.floor(height * 0.2)
  const y1 = Math.floor(height * 0.8)
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 3)
    raw[rowStart] = 0
    for (let x = 0; x < width; x++) {
      const p = rowStart + 1 + x * 3
      const inside = x >= x0 && x < x1 && y >= y0 && y < y1
      raw[p] = inside ? color[0] : 246
      raw[p + 1] = inside ? color[1] : 246
      raw[p + 2] = inside ? color[2] : 246
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

module.exports = { garmentPng }
