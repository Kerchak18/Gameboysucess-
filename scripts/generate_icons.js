const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background / Face Gradient -->
    <radialGradient id="faceGrad" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#FFDF00" />
      <stop offset="70%" stop-color="#FFB800" />
      <stop offset="100%" stop-color="#E59400" />
    </radialGradient>

    <!-- Hat Gradient -->
    <linearGradient id="hatGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1B2A4A" />
      <stop offset="100%" stop-color="#0A1128" />
    </linearGradient>

    <!-- Visor/Brim Gradient -->
    <linearGradient id="brimGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#333333" />
      <stop offset="100%" stop-color="#111111" />
    </linearGradient>

    <!-- Badge Gradient -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFE57F" />
      <stop offset="50%" stop-color="#FFC107" />
      <stop offset="100%" stop-color="#FF8F00" />
    </linearGradient>

    <!-- Shades Gradient -->
    <linearGradient id="glassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#222222" />
      <stop offset="100%" stop-color="#050505" />
    </linearGradient>

    <!-- Silver Whistle Gradient -->
    <linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="50%" stop-color="#B0BEC5" />
      <stop offset="100%" stop-color="#546E7A" />
    </linearGradient>

    <!-- Drop Shadow -->
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Emoji Head Base -->
  <circle cx="256" cy="270" r="180" fill="url(#faceGrad)" filter="url(#shadow)" />

  <!-- EYES behind shades (for structure) -->
  <circle cx="190" cy="240" r="14" fill="#222" />
  <circle cx="322" cy="240" r="14" fill="#222" />

  <!-- DARK SHADES / SUNGLASSES -->
  <g id="sunglasses" filter="url(#shadow)">
    <!-- Bridge -->
    <rect x="236" y="222" width="40" height="10" rx="4" fill="#111" />
    <!-- Left Lens -->
    <path d="M 130 215 Q 240 215 235 220 L 230 270 Q 185 295 140 270 Z" fill="url(#glassGrad)" stroke="#111" stroke-width="6" stroke-linejoin="round" />
    <!-- Right Lens -->
    <path d="M 277 220 Q 272 215 382 215 L 372 270 Q 327 295 282 270 Z" fill="url(#glassGrad)" stroke="#111" stroke-width="6" stroke-linejoin="round" />
    <!-- Lens Reflection Highlights -->
    <path d="M 145 225 L 205 225 L 180 250 L 145 250 Z" fill="#FFFFFF" opacity="0.25" />
    <path d="M 292 225 L 352 225 L 327 250 L 292 250 Z" fill="#FFFFFF" opacity="0.25" />
  </g>

  <!-- BEARD AND MUSTACHE -->
  <g id="beard">
    <!-- Full Beard Base on Jaw -->
    <path d="M 100 290 Q 75 390 170 435 Q 256 460 342 435 Q 437 390 412 290 Q 380 380 340 410 Q 256 430 172 410 Q 132 380 100 290 Z" fill="#1C130E" />
    <!-- Mustache -->
    <path d="M 170 315 Q 220 300 256 325 Q 292 300 342 315 Q 360 350 310 350 Q 256 335 202 350 Q 152 350 170 315 Z" fill="#120B07" />
    <path d="M 230 380 Q 256 395 282 380 Q 270 415 256 415 Q 242 415 230 380 Z" fill="#120B07" />
  </g>

  <!-- POLICE WHISTLE AT MOUTH (Angled Upwards) -->
  <g id="whistle" transform="translate(230, 315) rotate(-20)" filter="url(#shadow)">
    <!-- Mouth Grip Piece -->
    <rect x="0" y="10" width="35" height="14" rx="3" fill="#37474F" />
    <!-- Main Whistle Cylinder Body -->
    <path d="M 30 5 L 90 5 C 105 5 115 15 115 30 C 115 45 105 55 90 55 L 30 55 Z" fill="url(#silverGrad)" stroke="#37474F" stroke-width="2" />
    <!-- Whistle Ball Chamber / Top Slot -->
    <rect x="50" y="2" width="16" height="8" rx="2" fill="#263238" />
    <!-- Attachment Ring at End -->
    <circle cx="110" cy="30" r="7" fill="none" stroke="url(#silverGrad)" stroke-width="4" />
    <!-- Pea sound hole -->
    <ellipse cx="75" cy="30" rx="10" ry="14" fill="#1A237E" opacity="0.3" />
    <!-- Sound Peep Rays / Air Blow Effects -->
    <path d="M 45 -5 L 35 -18 M 55 -8 L 52 -24 M 68 -5 L 72 -20" stroke="#00E5FF" stroke-width="4" stroke-linecap="round" opacity="0.8" />
  </g>

  <!-- POLICE COP HAT -->
  <g id="cop-hat" filter="url(#shadow)">
    <!-- Crown / Top Fabric of Hat -->
    <path d="M 100 135 C 110 50 200 20 256 20 C 312 20 402 50 412 135 C 370 155 142 155 100 135 Z" fill="url(#hatGrad)" />

    <!-- Hat Band -->
    <path d="M 105 135 Q 256 165 407 135 L 412 150 Q 256 182 100 150 Z" fill="#0D131D" />
    <!-- Gold Strap / Trim on Band -->
    <path d="M 115 145 Q 256 172 397 145" stroke="url(#goldGrad)" stroke-width="6" fill="none" stroke-linecap="round" />
    <circle cx="120" cy="146" r="6" fill="url(#goldGrad)" />
    <circle cx="392" cy="146" r="6" fill="url(#goldGrad)" />

    <!-- Black Visor / Brim -->
    <path d="M 90 142 Q 256 205 422 142 Q 410 185 256 195 Q 102 185 90 142 Z" fill="url(#brimGrad)" stroke="#000" stroke-width="3" />
    <path d="M 115 152 Q 256 188 397 152" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.25" />

    <!-- Police Badge / Star Emblem -->
    <g id="police-badge" transform="translate(256, 95)">
      <!-- Shield Base -->
      <path d="M 0 -35 L 28 -20 L 22 20 L 0 38 L -22 20 L -28 -20 Z" fill="url(#goldGrad)" stroke="#B78103" stroke-width="2" />
      <!-- Inner Star -->
      <path d="M 0 -22 L 6 -6 L 22 -6 L 9 3 L 14 18 L 0 9 L -14 18 L -9 3 L -22 -6 L -6 -6 Z" fill="#FFFFFF" />
      <circle cx="0" cy="0" r="5" fill="#0D131D" />
    </g>
  </g>
</svg>`;

const iconsDir = path.join(__dirname, '..', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgIcon.trim());

async function generatePNGs() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const sizes = [16, 32, 48, 128, 512];
  for (const size of sizes) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; width: ${size}px; height: ${size}px; }
            svg { width: ${size}px; height: ${size}px; display: block; }
          </style>
        </head>
        <body>
          ${svgIcon.trim()}
        </body>
      </html>
    `);
    const pngBuffer = await page.screenshot({ omitBackground: true, type: 'png' });
    fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), pngBuffer);
    console.log(`Generated icon${size}.png (${pngBuffer.length} bytes)`);
  }

  await browser.close();
  console.log('All icons generated successfully!');
}

generatePNGs().catch(console.error);
