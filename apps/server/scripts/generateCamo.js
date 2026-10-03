const fs = require('fs');
const path = require('path');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs>
    <filter id="camo-blur" x="0" y="0">
      <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
      <feComponentTransfer><feFuncA type="discrete" tableValues="1 1"/></feComponentTransfer>
    </filter>
  </defs>
  <rect width="400" height="400" fill="#2E3321"/>
  <g filter="url(#camo-blur)">
    <!-- Dark green blotches -->
    <path fill="#161B11" d="M30 50 Q100 0 150 70 T250 50 Q300 150 200 200 T50 250 Q0 150 30 50 Z" />
    <path fill="#161B11" d="M300 300 Q350 250 380 320 T350 400 Q250 450 220 350 T300 300 Z" />
    <!-- Brown blotches -->
    <path fill="#4A3B22" d="M150 250 Q200 180 280 250 T350 180 Q400 280 320 320 T200 350 Q100 320 150 250 Z" />
    <path fill="#4A3B22" d="M-20 80 Q50 30 80 100 T50 200 Q-50 150 -20 80 Z" />
    <!-- Khaki blotches -->
    <path fill="#857C5A" d="M220 30 Q280 -20 320 40 T280 120 Q200 150 180 80 T220 30 Z" />
    <path fill="#857C5A" d="M50 320 Q120 280 150 350 T80 420 Q0 380 50 320 Z" />
  </g>
</svg>`;

const targetPath = path.join(__dirname, '../../../apps/web/public/camo.svg');
fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.writeFileSync(targetPath, svg);
console.log('Camo SVG generated at:', targetPath);
