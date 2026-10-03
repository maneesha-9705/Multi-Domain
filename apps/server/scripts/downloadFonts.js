const https = require('https');
const fs = require('fs');
const path = require('path');

const fonts = {
  'BlackOpsOne.woff2': 'https://fonts.gstatic.com/s/blackopsone/v20/qWcsB6-ypo7xBdr6Xshe96H3aD-Y.woff2',
  'StardosStencil.woff2': 'https://fonts.gstatic.com/s/stardosstencil/v18/XLYhIZH04h3zB56Y8-x-06gB_VszOXY.woff2',
  'Inter.woff2': 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.woff2',
  'JetBrainsMono.woff2': 'https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwJNWEwZ-5h.woff2'
};

const dir = path.join(__dirname, '../../../apps/web/public/fonts');
fs.mkdirSync(dir, { recursive: true });

Object.entries(fonts).forEach(([name, url]) => {
  const filePath = path.join(dir, name);
  https.get(url, (res) => {
    const file = fs.createWriteStream(filePath);
    res.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log('Downloaded', name);
    });
  });
});
