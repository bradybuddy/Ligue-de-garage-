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
  nothingPending: () => `Rien en attente pour ce numéro. Ouvre l'appli Buddy & Beer pour répondre.`,
  unknownCode: () => `Code inconnu. Réponds Y ou N, suivi du code reçu.`,
  help: () => `Buddy & Beer : réponds Y (je suis là) ou N (je suis pas là). STOP pour ne plus recevoir de textos.`,
  notUnderstood: () => `Pas compris 🙂 Réponds Y (je suis là) ou N (je suis pas là).`,
  promoted: (e: EvCtx) => `🎉 Une place s'est libérée : t'es IN ${when(e)}${where(e)}. Réponds N si tu peux plus.`,
  stopped: () => `C'est fait, tu ne recevras plus de textos de Buddy & Beer. Réponds START pour les réactiver.`,
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

export const push = {
  playerDropped: (player: string, e: EvCtx) => `${player} ne sera pas là ${when(e)}.`,
  promoted: (e: EvCtx) => `Une place s'est libérée : t'es IN ${when(e)}.`,
};
