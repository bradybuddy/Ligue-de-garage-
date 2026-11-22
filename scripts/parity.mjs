// Score de parité des fonctions (replica/features.csv).
// Poids : must 3, should 2, could 1 ; partial = moitié.
// Exclus : skip ; ce que l'original n'a pas (original = no) ; nos différenciateurs (area = Différenciateur).
import { readFileSync } from "node:fs";
const [head, ...lines] = readFileSync(new URL("../replica/features.csv", import.meta.url), "utf8").trim().split("\n");
const cols = head.split(",");
const parse = (l) => { const out = []; let cur = "", q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === "," && !q) { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return Object.fromEntries(cols.map((c, i) => [c, out[i] ?? ""])); };
const rows = lines.map(parse);
const W = { must: 3, should: 2, could: 1 };
const credit = (r) => (r.clone === "yes" ? 1 : r.clone === "partial" ? 0.5 : 0);
const counted = rows.filter((r) => r.priority !== "skip" && r.clone !== "skip" && r.original !== "no" && r.area !== "Différenciateur");
const score = (rs) => { const t = rs.reduce((s, r) => s + W[r.priority], 0); const d = rs.reduce((s, r) => s + W[r.priority] * credit(r), 0); return { t, d, pct: t ? (100 * d) / t : 0 }; };
const all = score(counted);
const team = score(counted.filter((r) => r.area !== "Ligue"));
const must = counted.filter((r) => r.priority === "must");
console.log(`Score de parité : ${all.pct.toFixed(1)} % (${all.d}/${all.t} points)`);
console.log(`Sans la couche ligue : ${team.pct.toFixed(1)} %`);
console.log(`Must : ${must.filter((r) => r.clone === "yes").length} faits, ${must.filter((r) => r.clone === "partial").length} partiels, ${must.filter((r) => r.clone === "no").length} manquants, sur ${must.length}`);
console.log("\nPar zone (la plus faible d'abord) :");
const areas = [...new Set(counted.map((r) => r.area))].map((a) => ({ a, ...score(counted.filter((r) => r.area === a)) })).sort((x, y) => x.pct - y.pct);
for (const z of areas) console.log(`  ${z.pct.toFixed(0).padStart(3)} %  ${z.a}`);
console.log("\nÀ faire, dans l'ordre (must, should, could) :");
for (const p of ["must", "should", "could"]) for (const r of counted.filter((x) => x.priority === p && x.clone !== "yes")) console.log(`  ${p.padEnd(6)} ${r.clone.padEnd(8)} ${r.area.padEnd(14)} ${r.feature}`);
const excluded = rows.filter((r) => !counted.includes(r));
console.log(`\nExclus du calcul : ${excluded.map((r) => `${r.feature} (${r.clone === "skip" || r.priority === "skip" ? "skip" : r.original === "no" ? "pas dans l'original" : "différenciateur"})`).join(" ; ")}`);
