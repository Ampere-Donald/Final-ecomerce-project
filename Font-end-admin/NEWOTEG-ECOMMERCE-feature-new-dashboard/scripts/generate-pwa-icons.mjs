// Génère les icônes PWA (192/512, standard + maskable) à partir de public/logo.png.
// Usage : node scripts/generate-pwa-icons.mjs
import sharp from 'sharp';
import { mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'public', 'logo.png');
const outDir = path.join(root, 'public', 'icons');
const THEME_BG = '#1c19a3';

mkdirSync(outDir, { recursive: true });

async function squareOnBackground(size, background) {
  // Le logo source (238x254) n'est pas carré : on le redimensionne en respectant
  // le ratio puis on le centre sur un canevas carré de la couleur de thème.
  const inner = Math.round(size * 0.82);
  const resized = await sharp(source)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toBuffer();
}

async function main() {
  const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
  const themeBg = { r: 0x1c, g: 0x19, b: 0xa3, alpha: 1 };

  const icon192 = await squareOnBackground(192, transparent);
  await sharp(icon192).toFile(path.join(outDir, 'icon-192.png'));

  const icon512 = await squareOnBackground(512, transparent);
  await sharp(icon512).toFile(path.join(outDir, 'icon-512.png'));

  // Maskable : le logo doit rester dans la "safe zone" centrale (~80%) sur fond opaque,
  // les OS Android peuvent rogner en cercle/carré arrondi.
  const maskable512 = await squareOnBackground(512, themeBg);
  await sharp(maskable512).toFile(path.join(outDir, 'icon-maskable-512.png'));

  console.log('Icônes générées dans public/icons/ :', 'icon-192.png, icon-512.png, icon-maskable-512.png');
}

main().catch((err) => {
  console.error('Échec de la génération des icônes :', err);
  process.exit(1);
});
