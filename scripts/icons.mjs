import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

await mkdir('public/icons', { recursive: true });
const size = 512;
const pixels = Buffer.alloc(size * size * 3);
const palette = [[200, 227, 213], [240, 198, 187], [196, 220, 237], [232, 214, 156]];
for (let vertical = 0; vertical < size; vertical++) {
  for (let horizontal = 0; horizontal < size; horizontal++) {
    const inside = horizontal >= 80 && horizontal < 432 && vertical >= 80 && vertical < 432;
    const divider = Math.abs(horizontal - 256) < 9 || Math.abs(vertical - 256) < 9;
    const color = inside && !divider ? palette[(vertical >= 256 ? 2 : 0) + (horizontal >= 256 ? 1 : 0)] : [32, 38, 34];
    const offset = (vertical * size + horizontal) * 3;
    pixels[offset] = color[0]; pixels[offset + 1] = color[1]; pixels[offset + 2] = color[2];
  }
}
const image = await sharp(pixels, { raw: { width: size, height: size, channels: 3 } }).png().toBuffer();
for (const [file, dimension] of [['icon-192.png', 192], ['icon-512.png', 512], ['maskable-512.png', 512], ['apple-touch-180.png', 180]]) {
  await sharp(image).resize(dimension, dimension).png().toFile(`public/icons/${file}`);
}