const fs = require('fs');
const path = require('path');

function generate9ColorTerrainSVG() {
  const width = 20000;
  const height = 20000;

  const toSvgX = (lng) => lng;
  const toSvgY = (lat) => 20000 - lat;

  // Grid lines & edge labels (2000 unit steps)
  let gridLines = '';
  let gridLabels = '';
  for (let i = 2000; i <= 18000; i += 2000) {
    const svgX = toSvgX(i);
    const svgY = toSvgY(i);

    // #3C3C3D Grid lines
    gridLines += `<line x1="${svgX}" y1="500" x2="${svgX}" y2="19500" stroke="#3C3C3D" stroke-width="25" stroke-dasharray="100 100" opacity="0.6" />\n`;
    gridLines += `<line x1="500" y1="${svgY}" x2="19500" y2="${svgY}" stroke="#3C3C3D" stroke-width="25" stroke-dasharray="100 100" opacity="0.6" />\n`;

    // #A9A9A9 Grid labels
    gridLabels += `<text x="${svgX}" y="400" fill="#A9A9A9" font-family="'JetBrains Mono', monospace" font-size="340" font-weight="bold" text-anchor="middle">${i}</text>\n`;
    gridLabels += `<text x="${svgX}" y="19900" fill="#A9A9A9" font-family="'JetBrains Mono', monospace" font-size="340" font-weight="bold" text-anchor="middle">${i}</text>\n`;
    gridLabels += `<text x="450" y="${svgY + 100}" fill="#A9A9A9" font-family="'JetBrains Mono', monospace" font-size="340" font-weight="bold" text-anchor="end">${i}</text>\n`;
    gridLabels += `<text x="19550" y="${svgY + 100}" fill="#A9A9A9" font-family="'JetBrains Mono', monospace" font-size="340" font-weight="bold" text-anchor="start">${i}</text>\n`;
  }

  // Exact 9-color Palette Mountain Fills:
  // Base Valley: #2F4F4F (Dark Slate Gray)
  // Low Mountain: #4B5320 (Army Green)
  // High Peak: #6B8E23 (Olive Drab)
  const mountainFills = [
    '#2F4F4F',
    '#3B4928',
    '#445124',
    '#4B5320',
    '#536221',
    '#5B7122',
    '#638022',
    '#6B8E23',
    '#749D24'
  ];

  const createMountainPeakSvg = (leafletLat, leafletLng, rx, ry, levels, seed) => {
    let svg = '';
    const cx = toSvgX(leafletLng);
    const cy = toSvgY(leafletLat);

    for (let l = 0; l < levels; l++) {
      const ratio = 1 - (l / levels);
      const curRx = rx * ratio;
      const curRy = ry * ratio;
      const color = mountainFills[Math.min(l, mountainFills.length - 1)];
      
      let d = '';
      const points = 16;
      for (let p = 0; p <= points; p++) {
        const angle = (p / points) * Math.PI * 2;
        const n1 = Math.sin(angle * 4 + seed + l * 0.5) * 0.18;
        const n2 = Math.cos(angle * 7 - seed) * 0.12;
        const rFactor = 1 + n1 + n2;
        const px = cx + Math.cos(angle) * curRx * rFactor;
        const py = cy + Math.sin(angle) * curRy * rFactor;
        if (p === 0) d += `M ${px.toFixed(0)},${py.toFixed(0)}`;
        else d += ` L ${px.toFixed(0)},${py.toFixed(0)}`;
      }
      d += ' Z';
      
      const isMajorContour = l % 2 === 0;
      // Minor Contours: #A9A9A9, Major Contours: #B0C4DE
      const strokeWidth = isMajorContour ? 50 : 25;
      const strokeColor = isMajorContour ? '#B0C4DE' : '#A9A9A9';
      
      svg += `<path d="${d}" fill="${color}" fill-opacity="0.88" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-opacity="0.6" />\n`;
    }
    return svg;
  };

  // Mountain Ranges
  const northKailashPeak = createMountainPeakSvg(15500, 9000, 7500, 3000, 8, 1.2);
  const northEastRidge = createMountainPeakSvg(16000, 15000, 4000, 2500, 7, 2.5);
  const northWestRidge = createMountainPeakSvg(16000, 3500, 4000, 2500, 7, 3.8);

  const centralWestPeak = createMountainPeakSvg(9500, 3000, 2500, 5000, 7, 4.1);
  const centralEastPeak = createMountainPeakSvg(9500, 15000, 2500, 5000, 7, 5.7);

  const southWestHills = createMountainPeakSvg(3500, 4000, 4000, 2500, 6, 6.3);
  const southEastHills = createMountainPeakSvg(3500, 15000, 4000, 2500, 6, 7.9);
  const southCentralRidge = createMountainPeakSvg(2500, 9000, 4500, 2000, 6, 8.4);

  const sectorWestHill = createMountainPeakSvg(7000, 6200, 1400, 2200, 5, 9.1);
  const sectorEastHill = createMountainPeakSvg(11500, 11500, 1600, 2000, 5, 9.8);

  // Tactical Routes in SVG coordinates (matching Leaflet positions)
  const pLogistics = [toSvgX(8000), toSvgY(7000)];
  const pTraining = [toSvgX(8000), toSvgY(8000)];
  const pComms = [toSvgX(7500), toSvgY(8200)];
  const pCommand = [toSvgX(8200), toSvgY(8500)];
  const pOps = [toSvgX(8500), toSvgY(9000)];
  const pSP1 = [toSvgX(9000), toSvgY(10000)];
  const pSP2 = [toSvgX(9500), toSvgY(11000)];
  const pObs = [toSvgX(10000), toSvgY(12000)];

  const mainRoutePath = `M ${pLogistics[0]},${pLogistics[1]} L ${pTraining[0]},${pTraining[1]} L ${pCommand[0]},${pCommand[1]} L ${pOps[0]},${pOps[1]} L ${pSP1[0]},${pSP1[1]} L ${pSP2[0]},${pSP2[1]} L ${pObs[0]},${pObs[1]}`;
  const secRoute1 = `M ${pComms[0]},${pComms[1]} L ${pCommand[0]},${pCommand[1]}`;
  const secRoute2 = `M ${toSvgX(7000)},${toSvgY(6000)} L ${pLogistics[0]},${pLogistics[1]}`;

  const sectorPolyPoints = `5500,6800 12500,6800 12500,14800 5500,14800`;

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20000 20000" width="20000" height="20000">
  <defs>
    <style>
      .bg { fill: #000000; }
      .river { stroke: #2F4F4F; stroke-width: 120; fill: none; stroke-linecap: round; }
      .road-saddle { stroke: #8B4513; stroke-width: 140; fill: none; stroke-linecap: round; }
      .route-casing { stroke: #000000; stroke-width: 160; fill: none; stroke-linecap: round; }
      .route-main { stroke: #FFD700; stroke-width: 100; stroke-dasharray: 180 90; fill: none; stroke-linecap: round; stroke-linejoin: round; }
      .route-sec { stroke: #8B4513; stroke-width: 70; stroke-dasharray: 120 70; fill: none; stroke-linecap: round; }
      
      .sector-poly { fill: #4B5320; fill-opacity: 0.35; stroke: #FFD700; stroke-width: 100; stroke-dasharray: 240 160; stroke-linejoin: round; }
      
      .panel-bg { fill: #000000; stroke: #4B5320; stroke-width: 16; }
      .panel-ref { fill: #000000; stroke: #8B4513; stroke-width: 16; }
      .panel-accent { stroke: #FFD700; stroke-width: 10; fill: none; }
      
      .title-large { fill: #FFD700; font-family: 'Black Ops One', 'JetBrains Mono', monospace; font-size: 480px; font-weight: 900; letter-spacing: 16px; }
      .title-sub { fill: #B0C4DE; font-family: 'JetBrains Mono', monospace; font-size: 320px; font-weight: 800; letter-spacing: 10px; }
      .text-body { fill: #A9A9A9; font-family: 'JetBrains Mono', monospace; font-size: 240px; font-weight: 600; }
      .text-steel { fill: #B0C4DE; font-family: 'JetBrains Mono', monospace; font-size: 300px; font-weight: 800; }
      .text-gold { fill: #FFD700; font-family: 'JetBrains Mono', monospace; font-size: 250px; font-weight: 800; }
    </style>
    <pattern id="military-grid" width="1000" height="1000" patternUnits="userSpaceOnUse">
      <path d="M 1000 0 L 0 0 0 1000" fill="none" stroke="#3C3C3D" stroke-width="8" opacity="0.3"/>
    </pattern>
  </defs>

  <!-- #000000 Base Pure Black Background -->
  <rect class="bg" width="20000" height="20000" />
  <rect width="20000" height="20000" fill="url(#military-grid)" />

  <!-- Mountain Massifs & Topographic Relief (#4B5320 / #6B8E23 / #2F4F4F) -->
  <g id="mountain-massifs">
    ${northKailashPeak}
    ${northEastRidge}
    ${northWestRidge}
    ${centralWestPeak}
    ${centralEastPeak}
    ${southWestHills}
    ${southEastHills}
    ${southCentralRidge}
    ${sectorWestHill}
    ${sectorEastHill}
  </g>

  <!-- Watercourses / Mountain Streams (#2F4F4F) -->
  <g id="streams">
    <path class="river" d="M 1000,8500 C 3500,9000 6000,10200 8000,11200 C 10500,12500 14000,13800 19000,14500" />
  </g>

  <!-- Tactical Grid Lines (#3C3C3D) & Edge Coordinates (#A9A9A9) -->
  <g id="grid">
    ${gridLines}
    ${gridLabels}
  </g>

  <!-- Tactical Mountain Roads (#8B4513) & Routes (#FFD700) -->
  <g id="tactical-routes">
    <path class="route-casing" d="${mainRoutePath}" />
    <path class="route-main" d="${mainRoutePath}" />
    
    <path class="route-sec" d="${secRoute1}" />
    <path class="route-sec" d="${secRoute2}" />
  </g>

  <!-- KAILASH RIDGE TRAINING SECTOR BOUNDARY (#FFD700) -->
  <g id="training-sector">
    <polygon class="sector-poly" points="${sectorPolyPoints}" />
    
    <!-- Corner L-Brackets (#FFD700) -->
    <g stroke="#FFD700" stroke-width="30" fill="none">
      <path d="M 5300,6800 L 5500,6800 L 5500,7000" />
      <path d="M 12700,6800 L 12500,6800 L 12500,7000" />
      <path d="M 12700,14800 L 12500,14800 L 12500,14600" />
      <path d="M 5300,14800 L 5500,14800 L 5500,14600" />
    </g>
  </g>

  <!-- MILITARY COMPASS ROSE (Top Right: #FFD700 / #A9A9A9 / #000000 / #4B5320) -->
  <g id="compass" transform="translate(16500, 3500)">
    <circle cx="0" cy="0" r="950" class="panel-bg" />
    <circle cx="0" cy="0" r="880" fill="none" stroke="#FFD700" stroke-width="12" stroke-dasharray="24 12" />
    
    <!-- North Arrow Pointer -->
    <polygon points="0,-800 140,0 0,-160" fill="#FFD700" />
    <polygon points="0,-800 -140,0 0,-160" fill="#8B4513" />
    <polygon points="0,800 100,0 0,100" fill="#4B5320" />
    <polygon points="0,800 -100,0 0,100" fill="#3C3C3D" />
    
    <text x="0" y="-840" fill="#FFD700" font-family="'Black Ops One', monospace" font-size="320" text-anchor="middle" font-weight="900">N</text>
    <text x="920" y="90" fill="#A9A9A9" font-family="'JetBrains Mono', monospace" font-size="240" text-anchor="start" font-weight="bold">E</text>
    <text x="-920" y="90" fill="#A9A9A9" font-family="'JetBrains Mono', monospace" font-size="240" text-anchor="end" font-weight="bold">W</text>
    <text x="0" y="980" fill="#A9A9A9" font-family="'JetBrains Mono', monospace" font-size="240" text-anchor="middle" font-weight="bold">S</text>
  </g>

  <!-- REAL-WORLD REFERENCE BOX (Bottom Left: bg #000000, border #8B4513, heading #FFD700, text #B0C4DE) -->
  <g id="reference-box" transform="translate(1200, 16400)">
    <rect width="6000" height="2400" rx="24" class="panel-ref" />
    <rect x="25" y="25" width="5950" height="2350" rx="16" fill="none" stroke="#4B5320" stroke-width="10" />
    
    <text x="250" y="320" fill="#FFD700" font-family="'JetBrains Mono', monospace" font-size="250" font-weight="bold" letter-spacing="6">REAL-WORLD REFERENCE</text>
    <text x="250" y="640" class="text-steel">WELLINGTON / NILGIRIS</text>
    <text x="250" y="900" class="text-body">Tamil Nadu, India [11.3695° N, 76.7906° E]</text>
    
    <line x1="250" y1="1050" x2="5750" y2="1050" stroke="#4B5320" stroke-width="8" />
    
    <text x="250" y="1300" fill="#FFD700" font-family="'JetBrains Mono', monospace" font-size="250" font-weight="bold" letter-spacing="6">FICTIONAL SCENARIO</text>
    <text x="250" y="1620" fill="#B0C4DE" font-family="'JetBrains Mono', monospace" font-size="300" font-weight="bold">KAILASH RIDGE TRAINING SECTOR</text>
    <text x="250" y="1920" class="text-gold">★ FOR TRAINING / SIMULATION ONLY ★</text>
    <text x="250" y="2180" class="text-body">Fictional scenario area. Not an actual DSSC military facility.</text>
  </g>

  <!-- MAP LEGEND BOX (Bottom Right: bg #000000, border #4B5320, title #FFD700, text #B0C4DE) -->
  <g id="legend-box" transform="translate(12800, 16400)">
    <rect width="6000" height="2400" rx="24" class="panel-bg" />
    <rect x="25" y="25" width="5950" height="2350" rx="16" fill="none" stroke="#FFD700" stroke-width="10" stroke-dasharray="24 12" />
    
    <text x="250" y="320" fill="#FFD700" font-family="'Black Ops One', 'JetBrains Mono', monospace" font-size="320" font-weight="900" letter-spacing="8">MAP LEGEND</text>
    <line x1="250" y1="420" x2="5750" y2="420" stroke="#4B5320" stroke-width="8" />
    
    <!-- Legend Items -->
    <!-- Checkpoint: Gold #FFD700 -->
    <polygon points="450,620 540,530 630,620 540,710" fill="#3C3C3D" stroke="#FFD700" stroke-width="20" />
    <text x="800" y="650" fill="#B0C4DE" font-family="'JetBrains Mono', monospace" font-size="240" font-weight="bold">CHECKPOINT (CONTROL POINT)</text>

    <!-- HQ / Building: #4B5320 / #FFD700 -->
    <rect x="460" y="850" width="150" height="150" fill="#4B5320" stroke="#FFD700" stroke-width="20" />
    <text x="800" y="960" fill="#B0C4DE" font-family="'JetBrains Mono', monospace" font-size="240" font-weight="bold">HQ / TACTICAL BUILDING</text>

    <!-- Observation Point: #B0C4DE + #FFD700 -->
    <circle cx="535" cy="1260" r="70" fill="#000000" stroke="#B0C4DE" stroke-width="20" />
    <text x="800" y="1290" fill="#B0C4DE" font-family="'JetBrains Mono', monospace" font-size="240" font-weight="bold">OBSERVATION POINT</text>

    <!-- Commander: #6B8E23 -->
    <circle cx="535" cy="1580" r="65" fill="#6B8E23" stroke="#B0C4DE" stroke-width="20" />
    <text x="800" y="1610" fill="#B0C4DE" font-family="'JetBrains Mono', monospace" font-size="240" font-weight="bold">COMMANDER / OFFICER ASSET</text>

    <!-- Tactical Route: #FFD700 -->
    <line x1="420" y1="1900" x2="650" y2="1900" stroke="#FFD700" stroke-width="40" stroke-dasharray="50 25" />
    <text x="800" y="1930" fill="#B0C4DE" font-family="'JetBrains Mono', monospace" font-size="240" font-weight="bold">TACTICAL MOUNTAIN ROUTE</text>

    <!-- Sector Boundary: #FFD700 -->
    <line x1="420" y1="2200" x2="650" y2="2200" stroke="#FFD700" stroke-width="30" stroke-dasharray="40 20" />
    <text x="800" y="2230" fill="#B0C4DE" font-family="'JetBrains Mono', monospace" font-size="240" font-weight="bold">SECTOR BOUNDARY</text>
  </g>

</svg>
`;

  return svgContent;
}

const svg = generate9ColorTerrainSVG();
const targetPath = path.join(__dirname, '../apps/web/public/terrain.svg');
fs.writeFileSync(targetPath, svg, 'utf8');
console.log('Successfully generated COURAGEOUS ARMY VALOR 9-color terrain SVG at:', targetPath);
