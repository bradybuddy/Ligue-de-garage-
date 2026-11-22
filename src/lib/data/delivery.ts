import { APP_NAME } from "@/lib/brand";
// Livraison de la file d'envoi (outbox) : texto, courriel, push.
// - « for update skip locked » : deux tick en même temps ne prennent jamais le même message
// - réessais : 1 min, 4 min, 16 min, puis « failed » (journal des échecs = lignes failed + error)
// - préférences du joueur (notification_prefs) et heures de silence pour les textos
import "server-only";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { asService, type Tx } from "../db";
import { APP_URL, push as pushTpl, sms as smsTpl } from "../messages";
import { sendEmail } from "../send/email";
import { pushConfigured, sendPush } from "../send/push";
import { sendSms } from "../send/sms";
import { SendError } from "../send/config";
import { unsubscribeToken } from "../unsubscribe";
import { utcToZonedParts, zonedToUtc } from "../time";

const MAX_ATTEMPTS = 4;
const PUSH_FALLBACK = new Set(["manager_alert", "waitlist", "beer"]);
const QUIET_START = 22, QUIET_END = 8; // pas de texto non urgent entre 22 h et 8 h (heure de l'équipe)

interface Row {
  id: string; memberId: string | null; channel: "sms" | "email" | "push"; category: string; template: string;
  payload: Record<string, string>; toAddress: string | null; subject: string | null; body: string | null; attempts: number;
  rendered?: string;
}
interface MemberCtx {
  id: string; userId: string | null; displayName: string; email: string | null; phone: string | null; smsOptIn: boolean;
  smsOptedOutAt: string | null; teamId: string; teamName: string; timezone: string;
}

export async function deliverOutbox({ limit = 200 } = {}): Promise<{ sent: number; failed: number; skipped: number; deferred: number }> {
  const stats = { sent: 0, failed: 0, skipped: 0, deferred: 0 };
  const batch = await asService((tx) => tx<Row[]>`
    update outbox set status = 'sending', locked_at = now()
     where id in (select id from outbox where status = 'pending' and send_after <= now()
                  order by send_after limit ${limit} for update skip locked)
     returning id, member_id, channel, category, template, payload, to_address, subject, body, attempts`);
  for (const row of batch) {
    // Le pilote convertit aussi les clés JSON en camelCase (event_id → eventId) : on remet les noms d'origine
    const pl = (row.payload ?? {}) as Record<string, string>;
    row.payload = { ...pl, event_id: pl.event_id ?? pl.eventId, member_id: pl.member_id ?? pl.memberId };
    try {
      const r = await deliverOne(row);
      stats[r]++;
    } catch (e) {
      console.error("outbox", row.id, (e as Error).message);
      stats.failed++;
    }
  }
  return stats;
}

async function deliverOne(row: Row): Promise<"sent" | "skipped" | "deferred" | "failed"> {
  const ctx = row.memberId ? await memberCtx(row.memberId) : null;
  if (!ctx) return finish(row, "skipped", "membre introuvable");

  // Préférences : une ligne enabled=false coupe ce canal pour cette catégorie
  const off = async (ch: string) => (await asService((tx) => tx`
    select 1 from notification_prefs where member_id = ${ctx.id} and category = ${row.category} and channel = ${ch} and not enabled`)).length > 0;

  // Push → repli sur texto puis courriel si le joueur n'a pas d'abonnement push (ex. pas de compte)
  let channel = row.channel;
  const subs = channel === "push" && ctx.userId && pushConfigured()
    ? await asService((tx) => tx<{ id: string; endpoint: string; p256dh: string; auth: string }[]>`select id, endpoint, p256dh, auth from push_subscriptions where user_id = ${ctx.userId}`)
    : [];
  if (channel === "push" && !subs.length) {
    // Repli vers texto/courriel seulement pour les avis qui comptent. Jamais pour le chat ni une diffusion « notif » :
    // sinon chaque message du chat partirait par courriel à toute l'équipe (la plainte n° 1 contre l'original).
    if (!PUSH_FALLBACK.has(row.category)) return finish(row, "skipped", "pas d'abonnement push (pas de repli pour cette catégorie)");
    channel = ctx.phone && ctx.smsOptIn && !ctx.smsOptedOutAt ? "sms" : ctx.email ? "email" : "push";
    if (channel === "push") return finish(row, "skipped", "aucun canal joignable");
  }
  if (await off(channel)) return finish(row, "skipped", "désactivé par le joueur");

  const { subject, body, url, eventStartsAt } = await render(row, ctx, channel);
  row.rendered = body; // gardé dans la file : le journal montre ce qui est vraiment parti

  try {
    if (channel === "sms") {
      if (!ctx.phone || !ctx.smsOptIn || ctx.smsOptedOutAt) return finish(row, "skipped", "pas de consentement texto");
      const quietUntil = quietHoursEnd(ctx.timezone, eventStartsAt);
      if (quietUntil) {
        await asService((tx) => tx`update outbox set status = 'pending', locked_at = null, send_after = ${quietUntil.toISOString()} where id = ${row.id}`);
        return "deferred";
      }
      // Les avis mis en file par SQL (place libérée, promu) n'ont pas de jeton : sans lui, « Y » ne mènerait nulle part
      if (row.payload?.event_id && ["spot_open", "promoted_from_waitlist"].includes(row.template)) await ensureSmsToken(ctx, row.payload.event_id);
      const r = await sendSms(ctx.phone, body);
      return finish(row, "sent", null, r.provider, r.id, ctx.phone, "sms");
    }
    if (channel === "email") {
      if (!ctx.email) return finish(row, "skipped", "pas de courriel");
      const unsubscribeUrl = `${APP_URL}/api/desabonnement/${unsubscribeToken(ctx.id, row.category)}`;
      const r = await sendEmail({ to: ctx.email, subject: subject ?? `${ctx.teamName} — ${APP_NAME}`,
        text: `${body}\n\n—\nNe plus recevoir ce type de courriel : ${APP_URL}/desabonnement/${unsubscribeToken(ctx.id, row.category)}`, unsubscribeUrl });
      return finish(row, "sent", null, r.provider, r.id, ctx.email, "email");
    }
    // push : tous les appareils du joueur
    let ok = 0;
    for (const s of subs) {
      const r = await sendPush(s, { title: ctx.teamName, body, url: url ?? `/t/${ctx.teamId}` });
      if (r.gone) await asService((tx) => tx`delete from push_subscriptions where id = ${s.id}`);
      else ok++;
    }
    return ok ? finish(row, "sent", null, "webpush", null, ctx.displayName) : finish(row, "skipped", "abonnements push expirés");
  } catch (e) {
    const err = e as SendError;
    const attempts = row.attempts + 1;
    if (err.retry !== false && attempts < MAX_ATTEMPTS) {
      await asService((tx) => tx`update outbox set status = 'pending', locked_at = null, attempts = ${attempts},
        send_after = now() + make_interval(mins => ${4 ** (attempts - 1)}), error = ${err.message.slice(0, 500)} where id = ${row.id}`);
      return "deferred";
    }
    await asService((tx) => tx`update outbox set status = 'failed', locked_at = null, attempts = ${attempts}, error = ${err.message.slice(0, 500)} where id = ${row.id}`);
    return "failed";
  }
}

async function finish(row: Row, status: "sent" | "skipped", error: string | null, provider?: string, providerId?: string | null, to?: string, channel?: string): Promise<"sent" | "skipped"> {
  await asService((tx) => tx`
    update outbox set status = ${status}, locked_at = null, sent_at = case when ${status} = 'sent' then now() end,
           channel = coalesce(${channel ?? null}, channel), body = coalesce(body, ${row.rendered ?? null}),
           error = ${error}, provider = ${provider ?? null}, provider_message_id = ${providerId ?? null},
           to_address = coalesce(${to ?? null}, to_address)
     where id = ${row.id}`);
  return status;
}

async function ensureSmsToken(ctx: MemberCtx, eventId: string) {
  await asService(async (tx) => {
    const [tok] = await tx`select 1 from response_tokens where event_id = ${eventId} and member_id = ${ctx.id} and channel = 'sms' and expires_at > now()`;
    if (tok) return;
    const [ev] = await tx<{ startsAt: string }[]>`select starts_at from events where id = ${eventId}`;
    if (!ev) return;
    const taken = new Set((await tx<{ smsCode: string }[]>`select t.sms_code from response_tokens t join members m on m.id = t.member_id
      where t.channel = 'sms' and t.expires_at > now() and m.phone = ${ctx.phone}`).map((r) => r.smsCode));
    let code: string;
    do code = String(randomInt(100, 1000)); while (taken.has(code));
    await tx`insert into response_tokens (event_id, member_id, channel, token_hash, sms_code, expires_at)
             values (${eventId}, ${ctx.id}, 'sms', ${createHash("sha256").update(randomBytes(18)).digest("hex")}, ${code},
                     ${new Date(Date.parse(ev.startsAt) + 2 * 3600_000).toISOString()})`;
  });
}

async function memberCtx(memberId: string): Promise<MemberCtx | null> {
  const [m] = await asService((tx) => tx<MemberCtx[]>`
    select m.id, m.user_id, m.display_name, m.email, m.phone, m.sms_opt_in, m.sms_opted_out_at, m.team_id, t.name as team_name, t.timezone
      from members m join teams t on t.id = m.team_id where m.id = ${memberId} and m.left_at is null`);
  return m ?? null;
}

/** Les messages mis en file par SQL (on_spot_freed, pick_beer) n'ont que template + payload : on les rédige ici. */
async function render(row: Row, ctx: MemberCtx, channel: string): Promise<{ subject: string | null; body: string; url: string | null; eventStartsAt: string | null }> {
  const eventId = row.payload?.event_id ?? null;
  const ev = eventId ? await asService(async (tx: Tx) => (await tx<{ startsAt: string; venue: string | null; opponent: string | null }[]>`
    select starts_at, venue, opponent from events where id = ${eventId}`)[0]) : undefined;
  const e = ev ? { startsAt: ev.startsAt, venue: ev.venue, opponent: ev.opponent, tz: ctx.timezone, teamName: ctx.teamName } : null;
  const url = eventId ? `/t/${ctx.teamId}/matchs/${eventId}` : null;
  if (row.body) return { subject: row.subject, body: row.body, url: row.payload?.url ?? url, eventStartsAt: ev?.startsAt ?? null };
  let body = "Du nouveau dans ton équipe.";
  if (e) {
    if (row.template === "player_dropped") {
      const [who] = await asService((tx) => tx<{ displayName: string }[]>`select display_name from members where id = ${row.payload.member_id ?? null}`);
      body = pushTpl.playerDropped(who?.displayName ?? "Un joueur", e);
    } else if (row.template === "promoted_from_waitlist") body = channel === "sms" ? smsTpl.promoted(e) : pushTpl.promoted(e);
    else if (row.template === "spot_open") body = `Une place s'est libérée pour le match ${fmt(e)}. Premier qui répond Y l'a!`;
    else if (row.template === "promoted_from_waitlist" && channel !== "sms") body = pushTpl.promoted(e);
    else if (row.template === "beer_duty") body = `🍺 C'est ta tournée pour le match ${fmt(e)}. Merci!`;
  }
  const subject = channel === "email" ? `${ctx.teamName} — ${body.slice(0, 60)}` : null;
  return { subject, body, url, eventStartsAt: ev?.startsAt ?? null };
}
const fmt = (e: { startsAt: string; tz: string }) => {
  const p = utcToZonedParts(e.startsAt, e.tz);
  return `du ${p.date.slice(8)}/${p.date.slice(5, 7)} à ${p.time.replace(":", " h ")}`;
};

/** Pendant les heures de silence, retourne l'heure de reprise — sauf si le match commence dans moins de 12 h. */
export function quietHoursEnd(tz: string, eventStartsAt: string | null, now = new Date()): Date | null {
  if (eventStartsAt && Date.parse(eventStartsAt) - now.getTime() < 12 * 3600_000) return null;
  const { date, time } = utcToZonedParts(now, tz);
  const h = Number(time.slice(0, 2));
  if (h >= QUIET_END && h < QUIET_START) return null;
  const day = h >= QUIET_START ? new Date(Date.parse(`${date}T12:00:00Z`) + 86400_000).toISOString().slice(0, 10) : date;
  return zonedToUtc(day, `${String(QUIET_END).padStart(2, "0")}:00`, tz);
}
