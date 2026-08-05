/**
 * Generates PNG app icons from resources/icon.svg.
 * Requires: npm install -D sharp
 * Run: node scripts/generate-brand-icons.mjs
 */
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const sizes = [1024, 512, 192, 64];

async function main() {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.error('Install sharp first: npm install -D sharp');
    process.exit(1);
  }

  const svg = await readFile(join(root, 'resources/icon.svg'));
  const outDir = join(root, 'public/icons');
  await mkdir(outDir, { recursive: true });

  for (const size of sizes) {
    const out = join(outDir, `icon-${size}.png`);
    await sharp(svg).resize(size, size).png().toFile(out);
    console.log('wrote', out);
  }

  // Android launcher source
  await sharp(svg).resize(1024, 1024).png().toFile(join(root, 'resources/icon.png'));
  console.log('wrote resources/icon.png');
}

void main();
