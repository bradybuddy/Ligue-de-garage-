// Génère tokens.css et contrast-report.md à partir de tokens.json.
// Usage : node replica/design/build-tokens.mjs   (sort en erreur s'il y a un échec AA)
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const t = JSON.parse(readFileSync(join(dir, "tokens.json"), "utf8"));

// ── contraste WCAG 2.x ──
const hex = (h) => h.replace("#", "").match(/../g).map((x) => parseInt(x, 16) / 255);
const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (h) => { const [r, g, b] = hex(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

let fails = 0;
let report = "# Rapport de contraste (WCAG 2.2 AA)\n\nGénéré par `build-tokens.mjs` à partir de `tokens.json`. Ne pas modifier à la main.\n\n";
for (const mode of ["light", "dark"]) {
  const c = t.color[mode];
  report += `## Thème ${mode === "light" ? "clair" : "sombre"}\n\n| Texte | Fond | Ratio | Minimum | Résultat |\n|---|---|---|---|---|\n`;
  for (const [fg, bg, min] of t.pairs) {
    const r = ratio(c[fg], c[bg]);
    const ok = r >= min;
    if (!ok) fails++;
    report += `| \`${fg}\` ${c[fg]} | \`${bg}\` ${c[bg]} | ${r.toFixed(2)}:1 | ${min}:1 | ${ok ? "OK" : "**ÉCHEC**"} |\n`;
  }
  report += "\n";
}
report += `**Échecs : ${fails}.**\n\nMinimums : 4,5:1 texte normal ; 3:1 grand texte, bordures de champs, anneau de focus et éléments graphiques (pastilles pleines de statut utilisées avec une étiquette texte).\n`;

// ── CSS ──
const vars = (obj) => Object.entries(obj).map(([k, v]) => `  --${k}: ${v};`).join("\n");
const colorVars = (m) => vars(t.color[m]);
const common = {
  "font-sans": t.font.sans, "font-display": t.font.display, "font-mono": t.font.mono,
  ...Object.fromEntries(Object.entries(t.text).flatMap(([k, v]) => [[`text-${k}`, v.size], [`text-${k}-line`, v.line]])),
  ...Object.fromEntries(Object.entries(t.radius).map(([k, v]) => [`radius-${k}`, v])),
  ...Object.fromEntries(Object.entries(t.shadow).map(([k, v]) => [`shadow-${k}`, v])),
  "motion-fast": t.motion.fast, "motion-base": t.motion.base, "ease-standard": t.motion.ease,
  ...Object.fromEntries(Object.entries(t.layout).filter(([, v]) => typeof v === "string").map(([k, v]) => [k, v])),
};
const css = `/* Généré par build-tokens.mjs — ne pas modifier à la main. Source : tokens.json */
:root {
  color-scheme: light;
${vars(common)}
${colorVars("light")}
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
${colorVars("dark").replace(/^/gm, "  ")}
  }
}
:root[data-theme="dark"] {
  color-scheme: dark;
${colorVars("dark")}
}
@media (prefers-reduced-motion: reduce) {
  :root { --motion-fast: 0ms; --motion-base: 0ms; }
}
`;
writeFileSync(join(dir, "tokens.css"), css);
writeFileSync(join(dir, "contrast-report.md"), report);
console.log(`tokens.css écrit. Échecs de contraste : ${fails}`);
if (fails) process.exit(1);
