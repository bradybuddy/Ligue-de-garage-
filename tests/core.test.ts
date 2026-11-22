import { test } from "node:test";
import { buildCalendar } from "../src/lib/ics";
import assert from "node:assert/strict";
import { zonedToUtc, utcToZonedParts, fmtTime } from "../src/lib/time";
import { disambiguationLabels, parseSmsReply, normalizePhone } from "../src/lib/sms";

test("heure avancée : 21 h 15 reste 21 h 15 des deux côtés du changement", () => {
  // Avant (heure avancée, UTC-4) et après (heure normale, UTC-5) le 1er novembre 2026
  assert.equal(zonedToUtc("2026-10-29", "21:15").toISOString(), "2026-10-30T01:15:00.000Z");
  assert.equal(zonedToUtc("2026-11-05", "21:15").toISOString(), "2026-11-06T02:15:00.000Z");
  assert.equal(zonedToUtc("2027-03-18", "21:15").toISOString(), "2027-03-19T01:15:00.000Z");
  // Heure ambiguë (01:30 le jour du recul) : on prend une des deux, sans planter
  assert.ok(!Number.isNaN(zonedToUtc("2026-11-01", "01:30").getTime()));
  // Aller-retour
  assert.deepEqual(utcToZonedParts("2026-11-06T02:15:00.000Z"), { date: "2026-11-05", time: "21:15" });
  assert.equal(fmtTime("2026-11-06T02:15:00.000Z"), "21 h 15");
});

test("lecture des textos", () => {
  assert.deepEqual(parseSmsReply("y"), { kind: "answer", status: "in", code: null });
  assert.deepEqual(parseSmsReply(" Oui! "), { kind: "answer", status: "in", code: null });
  assert.deepEqual(parseSmsReply("N 482"), { kind: "answer", status: "out", code: "482" });
  assert.deepEqual(parseSmsReply("non."), { kind: "answer", status: "out", code: null });
  assert.equal(parseSmsReply("STOP").kind, "stop");
  assert.equal(parseSmsReply("peut-être").kind, "unknown");
  assert.equal(normalizePhone("(514) 555-1234"), "+15145551234");
  assert.equal(normalizePhone("1 514 555 1234"), "+15145551234");
  assert.equal(normalizePhone("555-1234"), null);
  assert.deepEqual(disambiguationLabels([{ teamName: "A", day: "mer 25 nov", time: "21 h" }, { teamName: "B", day: "mer 25 nov", time: "22 h" }]), ["A, mer 25 nov", "B, mer 25 nov"]);
  assert.deepEqual(disambiguationLabels([{ teamName: "A", day: "mer 25 nov", time: "21 h" }, { teamName: "A", day: "mer 25 nov", time: "23 h" }]), ["mer 25 nov, 21 h", "mer 25 nov, 23 h"]);
  assert.deepEqual(disambiguationLabels([{ teamName: "A", day: "jeu 26 nov", time: "21 h" }, { teamName: "A", day: "jeu 3 déc", time: "21 h" }]), ["jeu 26 nov", "jeu 3 déc"]);
});


test("calendrier ICS : UTC avec Z, échappement, lignes de 75 octets max, annulé", () => {
  const ics = buildCalendar("Les Écureuils, de Saint-Jean; vraiment", [
    { uid: "a", start: zonedToUtc("2026-10-29", "21:15").toISOString(), end: null, summary: "Les Écureuils contre Les Castors, glace 2", location: "Aréna Michel-Normandin; glace 2",
      description: "Ta réponse : IN\nRépondre : https://exemple.ca/t/x/matchs/y-tres-long-pour-forcer-le-repli-de-ligne-a-75-octets-avec-des-accents-éééééééé", url: "https://exemple.ca", cancelled: false, updatedAt: "2026-11-01T00:00:00Z" },
    { uid: "b", start: zonedToUtc("2026-11-05", "21:15").toISOString(), end: null, summary: "Match", location: null, description: "", url: "https://exemple.ca", cancelled: true, updatedAt: "2026-11-01T00:00:00Z" },
  ], new Date("2026-11-22T00:00:00Z"));
  assert.match(ics, /DTSTART:20261030T011500Z\r\n/); // avant le changement d'heure : UTC-4
  assert.match(ics, /DTSTART:20261106T021500Z\r\n/); // après : UTC-5 — même 21 h 15 local
  assert.match(ics, /DTEND:20261030T024500Z/);          // 90 min par défaut
  assert.match(ics, /X-WR-CALNAME:Les Écureuils\\, de Saint-Jean\\; vraiment/);
  assert.match(ics, /SUMMARY:ANNULÉ — Match/);
  assert.match(ics, /STATUS:CANCELLED/);
  for (const line of ics.split("\r\n")) assert.ok(Buffer.byteLength(line) <= 75, `ligne trop longue : ${line}`);
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
});
