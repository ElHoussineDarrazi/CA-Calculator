const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.join(__dirname, '..', 'public');
const svg = path.join(root, 'favicon.svg');

async function png(out, size, opts) {
  const o = opts || {};
  const radiusPct = o.radiusPct || 0;
  const paddingPct = o.paddingPct || 0;
  const background = o.background || '#1a1a2e';
  let img = sharp(svg).resize(size, size);
  if (paddingPct > 0) {
    const inner = Math.round(size * (1 - paddingPct * 2));
    const resized = await sharp(svg).resize(inner, inner).png().toBuffer();
    const off = Math.round((size - inner) / 2);
    img = sharp({ create: { width: size, height: size, channels: 4, background } }).composite([
      { input: resized, left: off, top: off },
    ]);
  }
  if (radiusPct > 0) {
    const r = Math.round(size * radiusPct);
    const mask = Buffer.from(
      '<svg width="' + size + '" height="' + size + '"><rect width="' + size + '" height="' + size + '" rx="' + r + '" fill="#fff"/></svg>',
    );
    img = img.composite([{ input: mask, blend: 'dest-in' }]);
  }
  await img.png().toFile(path.join(root, out));
  console.log(out, size + 'px');
}

async function main() {
  await png('favicon-32x32.png', 32, { radiusPct: 0.22 });
  await png('favicon-16x16.png', 16, { radiusPct: 0.22 });
  await png('pwa-192x192.png', 192, {});
  await png('pwa-512x512.png', 512, {});
  await png('pwa-maskable-512x512.png', 512, { paddingPct: 0.1 });
  await png('apple-touch-icon.png', 180, { radiusPct: 0.225 });
  console.log('OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

