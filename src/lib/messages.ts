import { APP_NAME } from "@/lib/brand";
// Textes envoyés (texto, courriel, notif). Écrits pour Buddy & Beer, en français du Québec.
import { fmtShortDate, fmtTime } from "./time";

export const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

interface EvCtx { startsAt: string; venue: string | null; opponent: string | null; tz: string; teamName: string }

const when = (e: EvCtx) => `${fmtShortDate(e.startsAt, e.tz)} à ${fmtTime(e.startsAt, e.tz)}`;
const where = (e: EvCtx) => (e.venue ? ` (${e.venue})` : "");

export const sms = {
  reminder: (e: EvCtx) =>
    `${e.teamName} : match ${when(e)}${where(e)}. T'es là? Réponds Y ou N.`,
  confirmIn: (e: EvCtx) => `✅ C'est noté : t'es IN ${when(e)}.`,
  confirmWaitlist: () => `⏳ Le match est complet. T'es sur la liste d'attente; on te texte si une place se libère.`,
  confirmOut: () => `👍 Noté, t'es OUT. Merci d'avoir répondu!`,
  pickOne: (opts: { code: string; label: string }[]) =>
    `Tu as ${opts.length} matchs en attente. Réponds ${opts.map((o) => `Y ${o.code} (${o.label})`).join(" ou ")}. Même chose avec N.`,
  nothingPending: () => `Rien en attente pour ce numéro. Ouvre l'appli ${APP_NAME} pour répondre.`,
  unknownCode: () => `Code inconnu. Réponds Y ou N, suivi du code reçu.`,
  help: () => `${APP_NAME} : réponds Y (je suis là) ou N (je suis pas là). STOP pour ne plus recevoir de textos.`,
  notUnderstood: () => `Pas compris 🙂 Réponds Y (je suis là) ou N (je suis pas là).`,
  promoted: (e: EvCtx) => `🎉 Une place s'est libérée : t'es IN ${when(e)}${where(e)}. Réponds N si tu peux plus.`,
  spareInvite: (e: EvCtx, note?: string | null) =>
    `${e.teamName} cherche un spare : match ${when(e)}${where(e)}.${note ? ` « ${note.slice(0, 80)} »` : ""} Dispo? Réponds Y ou N.`,
  stopped: () => `C'est fait, tu ne recevras plus de textos de ${APP_NAME}. Réponds START pour les réactiver.`,
};

export const email = {
  reminderSubject: (e: EvCtx) => `${e.teamName} — ${when(e)} : t'es là?`,
  reminderBody: (e: EvCtx, link: string, name: string) =>
    [
      `Salut ${name.split(" ")[0]},`,
      ``,
      `Match ${when(e)}${e.opponent ? ` contre ${e.opponent}` : ""}${where(e)}.`,
      ``,
      `Je suis là → ${link}?s=in`,
      `Je suis pas là → ${link}?s=out`,
      ``,
      `Un seul courriel par match. Pour changer tes avis : ${APP_URL}/compte`,
    ].join("\n"),
};

export const spareEmail = {
  subject: (e: EvCtx) => `${e.teamName} cherche un spare — ${when(e)}`,
  body: (e: EvCtx, link: string, name: string, note?: string | null) =>
    [
      `Salut ${name.split(" ")[0]},`,
      ``,
      `${e.teamName} a besoin d'un spare pour le match ${when(e)}${e.opponent ? ` contre ${e.opponent}` : ""}${where(e)}.`,
      ...(note ? [``, `Mot du gérant : ${note}`] : []),
      ``,
      `Je peux jouer → ${link}?s=in`,
      `Pas cette fois → ${link}?s=out`,
      ``,
      `Premier arrivé, premier servi : si c'est complet, tu passes sur la liste d'attente.`,
    ].join("\n"),
};

export const push = {
  playerDropped: (player: string, e: EvCtx) => `${player} ne sera pas là ${when(e)}.`,
  promoted: (e: EvCtx) => `Une place s'est libérée : t'es IN ${when(e)}.`,
};
