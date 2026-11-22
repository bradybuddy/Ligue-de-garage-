import { test } from "node:test";
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

