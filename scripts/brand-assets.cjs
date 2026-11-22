// Régénère les icônes et l'image sociale à partir de src/app/icon.svg et de APP_NAME.
// Usage : npm run brand:assets  (à relancer après un changement de nom ou de logo)
const { chromium } = require('playwright');
const NAME = require('fs').readFileSync('src/lib/brand.ts', 'utf8').match(/APP_NAME = "(.*)"/)[1];
const fs = require('fs');
const svg = fs.readFileSync('src/app/icon.svg', 'utf8').replace(/<!--.*?-->/s, '');
const ink = '#121722', amber = '#F2A516';
const page = (w, h, body) => `<html><body style="margin:0;width:${w}px;height:${h}px;overflow:hidden">${body}</body></html>`;
const full = (size, pad) => page(size, size, `<div style="width:${size}px;height:${size}px;background:${amber};display:flex;align-items:center;justify-content:center"><svg viewBox="0 0 64 64" width="${size*(1-pad)}" height="${size*(1-pad)}"><path d="M18 33.5l9 9 19-20" fill="none" stroke="${ink}" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`);
const round = (size) => page(size, size, svg.replace('<svg ', `<svg width="${size}" height="${size}" `));
(async () => {
  const b = await chromium.launch();
  const jobs = [
    ['src/app/apple-icon.png', 180, 180, full(180, 0.25)],          // iOS : carré plein, sans transparence
    ['public/icons/icon-192.png', 192, 192, round(192)],
    ['public/icons/icon-512.png', 512, 512, round(512)],
    ['public/icons/maskable-512.png', 512, 512, full(512, 0.45)],   // zone sûre : le crochet reste dans le cercle central
    ['src/app/opengraph-image.png', 1200, 630, page(1200, 630, `
      <div style="width:1200px;height:630px;background:${ink};color:#F7F5F0;display:flex;align-items:center;gap:64px;padding:0 96px;box-sizing:border-box;font-family:'Barlow Condensed','Inter',sans-serif">
        ${svg.replace('<svg ', '<svg width="260" height="260" style="flex:none" ')}
        <div><div style="font-size:92px;font-weight:700;line-height:1">${NAME}</div>
        <div style="font-size:46px;margin-top:24px;color:${amber};font-weight:600;line-height:1.15">Ton équipe au complet,<br>à tout coup.</div>
        <div style="font-size:30px;margin-top:28px;font-family:Inter,sans-serif;color:#C9C4BA">Présences et spares pour le hockey de garage</div></div>
      </div>`)],
  ];
  for (const [out, w, h, html] of jobs) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.setContent(html); await p.screenshot({ path: out, omitBackground: out.includes('icon-') });
    await p.close(); console.log(out);
  }
  await b.close();
})();
