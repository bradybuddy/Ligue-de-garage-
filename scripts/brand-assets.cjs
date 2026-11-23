// Régénère les icônes et l'image sociale à partir du logo (public/brand/logo.png, fond transparent, carré).
// Usage : npm run brand:assets  (à relancer après un changement de logo ou de nom)
//
// - Grandes tailles (180, 192, 512, image sociale) : le logo complet.
// - Favicon (64 px, affiché à 16-32) : la chope seule, recadrée en cercle sur le rouge du logo,
//   parce que le logo complet n'est plus qu'une tache rouge à cette taille.
const { chromium } = require("playwright");
const fs = require("fs");

const NAME = fs.readFileSync("src/lib/brand.ts", "utf8").match(/APP_NAME = "(.*)"/)[1];
const TAGLINE = fs.readFileSync("src/lib/brand.ts", "utf8").match(/APP_TAGLINE = "(.*)"/)[1];
const logo = "data:image/png;base64," + fs.readFileSync("public/brand/logo.png").toString("base64");
const CREAM = "#F7F5F0", INK = "#121722", AMBER = "#F2A516";

const page = (w, h, body, bg = "transparent") =>
  `<html><body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;background:${bg}">${body}</body></html>`;
// Logo complet centré, occupant `scale` du carré
const full = (size, scale, bg) => page(size, size,
  `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center">
     <img src="${logo}" style="width:${size * scale}px;height:${size * scale}px"></div>`, bg);
// Chope seule : zoom sur le centre du logo (cercle de 380/740 du carré), découpée en cercle
const mug = (size) => {
  const zoom = 740 / 380; // le cercle central remplit l'icône
  const img = size * zoom;
  const offX = -(370 - 190) / 740 * img, offY = -(375 - 190) / 740 * img;
  return page(size, size, `<div style="width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;position:relative">
     <img src="${logo}" style="position:absolute;left:${offX}px;top:${offY}px;width:${img}px;height:${img}px"></div>`);
};

(async () => {
  const b = await chromium.launch();
  const jobs = [
    ["src/app/icon.png", 64, 64, mug(64), true],
    ["src/app/apple-icon.png", 180, 180, full(180, 0.86, CREAM), false],        // iOS : sans transparence
    ["public/icons/icon-192.png", 192, 192, full(192, 1, "transparent"), true],
    ["public/icons/icon-512.png", 512, 512, full(512, 1, "transparent"), true],
    ["public/icons/maskable-512.png", 512, 512, full(512, 0.72, CREAM), false], // zone sûre : logo dans le cercle central
    ["src/app/opengraph-image.png", 1200, 630, page(1200, 630, `
      <div style="width:1200px;height:630px;background:${INK};color:${CREAM};display:flex;align-items:center;gap:48px;padding:0 72px;box-sizing:border-box;font-family:'Barlow Condensed','Inter',sans-serif">
        <img src="${logo}" style="width:400px;height:400px;flex:none">
        <div><div style="font-size:88px;font-weight:700;line-height:1">${NAME}</div>
        <div style="font-size:44px;margin-top:24px;color:${AMBER};font-weight:600;line-height:1.15">${TAGLINE.replace(", ", ",<br>")}</div>
        <div style="font-size:28px;margin-top:28px;font-family:Inter,sans-serif;color:#C9C4BA">Présences et spares pour le hockey de garage</div></div>
      </div>`), false],
  ];
  for (const [out, w, h, html, transparent] of jobs) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.setContent(html);
    await p.waitForFunction(() => [...document.images].every((i) => i.complete));
    await p.screenshot({ path: out, omitBackground: transparent });
    await p.close();
    console.log(out);
  }
  await b.close();
})();
