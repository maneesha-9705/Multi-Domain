const fs = require('fs');
const https = require('https');
const path = require('path');

const fonts = [
  { name: 'Inter', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap' },
  { name: 'JetBrainsMono', url: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap' },
  { name: 'BlackOpsOne', url: 'https://fonts.googleapis.com/css2?family=Black+Ops+One&display=swap' },
  { name: 'StardosStencil', url: 'https://fonts.googleapis.com/css2?family=Stardos+Stencil:wght@400;700&display=swap' }
];

const destDir = path.join(__dirname, '../apps/web/public/fonts');
if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

async function downloadFonts() {
  for (const font of fonts) {
    console.log(`Fetching CSS for ${font.name}...`);
    const css = await new Promise((resolve, reject) => {
      https.get(font.url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36' } }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });

    // Match the first woff2 url
    const match = css.match(/url\((https:\/\/[^)]+\.woff2)\)/);
    if (match && match[1]) {
      const woff2Url = match[1];
      console.log(`Downloading ${font.name} from ${woff2Url}...`);
      await new Promise((resolve, reject) => {
        https.get(woff2Url, (res) => {
          const file = fs.createWriteStream(path.join(destDir, `${font.name}.woff2`));
          res.pipe(file);
          file.on('finish', () => { file.close(); resolve(); });
        }).on('error', reject);
      });
      console.log(`Saved ${font.name}.woff2`);
    } else {
      console.error(`Could not find woff2 URL for ${font.name}`);
    }
  }
}

downloadFonts().catch(console.error);
