const fs = require('fs');
const zlib = require('zlib');

function crc32Table() {
  const t = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
}
const TABLE = crc32Table();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = TABLE[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function makePng(size, path) {
  const w = size;
  const h = size;
  const bg = [26, 26, 46];
  const fg = [14, 165, 233];
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const dx = (x - w / 2) / (w / 2);
      const dy = (y - h / 2) / (h / 2);
      const d = Math.sqrt(dx * dx + dy * dy);
      let r;
      let g;
      let b;
      if (d < 0.52) {
        r = fg[0];
        g = fg[1];
        b = fg[2];
      } else if (d < 0.6) {
        r = 255;
        g = 255;
        b = 255;
      } else {
        r = bg[0];
        g = bg[1];
        b = bg[2];
      }
      const o = y * (w * 4 + 1) + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const out = Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.mkdirSync('public', { recursive: true });
  fs.writeFileSync(path, out);
  console.log(path, out.length + ' octets');
}

makePng(192, 'public/pwa-192x192.png');
makePng(512, 'public/pwa-512x512.png');
fs.copyFileSync('public/pwa-192x192.png', 'public/apple-touch-icon.png');
fs.copyFileSync('public/pwa-512x512.png', 'public/pwa-maskable-512x512.png');
console.log('OK');
