// Vérifie replica/launch/listing.json : limites des magasins, mots interdits, gaspillage de mots-clés.
// Usage : node scripts/check-listing.mjs
import { readFileSync } from "node:fs";

const L = JSON.parse(readFileSync("replica/launch/listing.json", "utf8"));
const brand = JSON.parse(readFileSync("replica/brand.json", "utf8"));
if (L.play.full_description === "SAME_AS_APP_STORE_DESCRIPTION") L.play.full_description = L.app_store.description;

// Compter comme une personne : graphèmes, pas unités UTF-16.
const seg = new Intl.Segmenter("fr", { granularity: "grapheme" });
const len = (s) => [...seg.segment(s)].length;

const limits = {
  "app_store.name": 30, "app_store.subtitle": 30, "app_store.promotional_text": 170,
  "app_store.keywords": 100, "app_store.description": 4000,
  "play.title": 30, "play.short_description": 80, "play.full_description": 4000,
  "alt_names.app_store_name": 30, "alt_names.play_title": 30,
};
const get = (p) => p.split(".").reduce((o, k) => o[k], L);
const short = ["app_store.name", "app_store.subtitle", "app_store.promotional_text", "app_store.keywords", "play.title", "play.short_description", "alt_names.app_store_name", "alt_names.play_title"];

let fail = 0;
const bad = (m) => { fail++; console.log("ÉCHEC  " + m); };
const ok = (m) => console.log("ok     " + m);

for (const [p, max] of Object.entries(limits)) {
  const n = len(get(p));
  n <= max ? ok(`${p} : ${n}/${max}`) : bad(`${p} : ${n}/${max}`);
}

const emoji = /\p{Extended_Pictographic}/u;
const claims = /(#\s?1|n°\s?1|numéro un|meilleur|best|gratuit|free|top\b|le plus)/i;
for (const p of short) {
  const v = get(p);
  if (emoji.test(v)) bad(`${p} : emoji`);
  if (claims.test(v)) bad(`${p} : prétention de rang ou de prix (« ${v.match(claims)[0]} »)`);
}

const all = JSON.stringify({ app_store: L.app_store, play: L.play, alt: L.alt_names }).toLowerCase();
for (const w of [...brand.avoid.names, ...brand.avoid.terms, ...brand.avoid.domains]) {
  if (all.includes(w.toLowerCase())) bad(`nom ou terme à éviter : « ${w} »`);
}

const kw = L.app_store.keywords;
if (/,\s/.test(kw)) bad("mots-clés : espace après une virgule");
const nameWords = (L.app_store.name + " " + L.app_store.subtitle).toLowerCase().split(/[^\p{L}]+/u).filter((w) => w.length > 2);
const kws = kw.toLowerCase().split(",");
for (const k of kws) if (nameWords.includes(k)) bad(`mots-clés : « ${k} » répète le nom ou le sous-titre (Apple les indexe déjà)`);
const dup = kws.filter((k, i) => kws.indexOf(k) !== i);
if (dup.length) bad(`mots-clés en double : ${dup.join(", ")}`);

console.log(fail ? `\n${fail} échec(s)` : "\nFiche conforme.");
process.exit(fail ? 1 : 0);
