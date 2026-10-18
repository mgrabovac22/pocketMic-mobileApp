const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { Buffer } = require('buffer');

const RES_DIR = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

const DENSITIES = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

function svgDefs() {
  return `
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0" stop-color="#101a30"/>
        <stop offset="1" stop-color="#070b13"/>
      </linearGradient>
      <linearGradient id="micBody" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffffff"/>
        <stop offset="1" stop-color="#93c5fd"/>
      </linearGradient>
      <linearGradient id="wave" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#3b82f6"/>
        <stop offset="1" stop-color="#22d3ee"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.5" cy="0.42" r="0.55">
        <stop offset="0" stop-color="#1d4ed8" stop-opacity="0.5"/>
        <stop offset="1" stop-color="#1d4ed8" stop-opacity="0"/>
      </radialGradient>
    </defs>`;
}

function svgContent() {
  return `
    <rect width="192" height="192" fill="url(#glow)"/>
    <path d="M44 76 Q28 96 44 116" fill="none" stroke="url(#wave)" stroke-width="10" stroke-linecap="round"/>
    <path d="M148 76 Q164 96 148 116" fill="none" stroke="url(#wave)" stroke-width="10" stroke-linecap="round"/>
    <path d="M56 92 A40 40 0 0 0 136 92" fill="none" stroke="#e2e8f0" stroke-width="12" stroke-linecap="round"/>
    <rect x="83" y="34" width="26" height="66" rx="13" fill="url(#micBody)"/>
    <rect x="90" y="126" width="12" height="28" rx="6" fill="#e2e8f0"/>
    <rect x="68" y="152" width="56" height="12" rx="6" fill="url(#micBody)"/>`;
}

function buildSvg(shape) {
  const background =
    shape === 'round'
      ? '<circle cx="96" cy="96" r="96" fill="url(#bg)"/>'
      : '<rect width="192" height="192" rx="44" fill="url(#bg)"/>';
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">${svgDefs()}${background}${svgContent()}</svg>`,
  );
}

async function main() {
  const square = buildSvg('square');
  const round = buildSvg('round');

  for (const { dir, size } of DENSITIES) {
    const outDir = path.join(RES_DIR, dir);
    fs.mkdirSync(outDir, { recursive: true });
    await sharp(square, { density: 300 }).resize(size, size).png().toFile(path.join(outDir, 'ic_launcher.png'));
    await sharp(round, { density: 300 }).resize(size, size).png().toFile(path.join(outDir, 'ic_launcher_round.png'));
    console.log(`${dir}: ${size}px ok`);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
