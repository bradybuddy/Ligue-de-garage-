// Données de démo (personnes fictives). Crée les comptes par l'API admin de Supabase Auth, puis l'équipe.
// Usage : node --env-file=.env.local scripts/seed.mjs      (refuse de tourner si l'équipe existe déjà)
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, DATABASE_URL: db } = process.env;
if (!url || !key || !db) { console.error("Il faut NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et DATABASE_URL"); process.exit(1); }
if (/supabase\.co/.test(url) && process.env.SEED_PROD !== "oui") { console.error("Base en ligne détectée : SEED_PROD=oui pour confirmer."); process.exit(1); }
const auth = createClient(url, key, { auth: { persistSession: false } }).auth.admin;
const sql = postgres(db, { max: 1, onnotice: () => {} });
const PASSWORD = "buddy123";

async function user(display_name, email, phone) {
  const { data, error } = await auth.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { display_name, phone } });
  if (error) throw new Error(`${email} : ${error.message}`);
  return data.user.id;
}

try {
  if ((await sql`select 1 from teams where invite_code = 'BUDDY4'`).length) { console.log("Déjà peuplée."); process.exit(0); }
  const marc = await user("Marc Lapointe", "marc@exemple.ca", "+15145550100");
  const sophie = await user("Sophie Gagnon", "sophie@exemple.ca", "+15145550101");
  const karim = await user("Karim Haddad", "karim@exemple.ca", "+15145550102");

  await sql.begin(async (tx) => {
    const [team] = await tx`insert into teams (created_by, name, sport, invite_code, max_players) values (${marc}, 'Les Buddies du jeudi', 'hockey', 'BUDDY4', 16) returning id`;
    const [season] = await tx`insert into seasons (team_id, name, starts_on) values (${team.id}, '2026-27', current_date) returning id`;
    await tx`insert into threads (team_id, kind) values (${team.id}, 'team')`;
    const m = (display_name, o = {}) => ({ team_id: team.id, display_name, user_id: null, email: null, phone: null, class: "regular", role: "member",
      position: "skater", jersey_number: null, sms_opt_in: true, joined_at: new Date(), ...o });
    const people = [
      m("Marc Lapointe", { user_id: marc, email: "marc@exemple.ca", phone: "+15145550100", role: "manager", jersey_number: 9 }),
      m("Sophie Gagnon", { user_id: sophie, email: "sophie@exemple.ca", phone: "+15145550101", position: "goalie", jersey_number: 31 }),
      m("Karim Haddad", { user_id: karim, email: "karim@exemple.ca", phone: "+15145550102", role: "assistant", jersey_number: 22 }),
      m("Max Tremblay", { phone: "+15145550103", jersey_number: 4 }),
      m("Jean-François Bélanger-Archambault", { phone: "+15145550104", email: "jf@exemple.ca", jersey_number: 17 }),
      m("Patrick Roy-Côté", { phone: "+15145550105", jersey_number: 33, position: "goalie" }),
      m("Étienne Bouchard", { phone: "+15145550106", jersey_number: 11 }),
      m("Simon Lavoie", { phone: "+15145550107", jersey_number: 7 }),
      m("Mathieu Pelletier", { phone: "+15145550108", jersey_number: 19 }),
      m("Alexandre Morin", { phone: "+15145550109", jersey_number: 27 }),
      m("Nicolas Fortin", { email: "nico@exemple.ca", jersey_number: 44, sms_opt_in: false }),
      m("David Ouellet", { phone: "+15145550111", jersey_number: 8 }),
      m("Léa Roy", { phone: "+15145550120", class: "spare" }),
      m("Olivier Dubé", { phone: "+15145550121", class: "spare" }),
      m("Félix Girard", { phone: "+15145550122", class: "spare", position: "goalie" }),
      m("Charles Poirier", { phone: "+15145550130", class: "injured", jersey_number: 15 }),
    ];
    await tx`insert into members ${tx(people)}`;
    // Les jeudis 21 h 15, heure de Montréal (conversion faite par Postgres, heure avancée comprise)
    await tx`
      insert into events (team_id, season_id, type, starts_at, venue, opponent, status, score_us, score_them, reminder_sent_at)
      select ${team.id}, ${season.id}, 'game',
             ((date_trunc('week', now() at time zone 'America/Toronto') + interval '3 days' + (w || ' weeks')::interval)::date + time '21:15') at time zone 'America/Toronto',
             v, o, case when w < 0 then 'final' else 'scheduled' end, case when w < 0 then 6 end, case when w < 0 then 4 end, case when w < 0 then now() end
        from (values (-1, 'Aréna Saint-Michel', 'Les Pingouins'), (1, 'Aréna Michel-Normandin, glace 2', 'Les Castors'),
                     (2, 'Centre Étienne-Desmarteau', 'Les Zambonis'), (3, 'Aréna Maurice-Richard', 'Les Moustaches')) as x(w, v, o)`;
  });
  console.log(`Démo prête. Comptes : marc@exemple.ca (gérant), sophie@exemple.ca, karim@exemple.ca — mot de passe ${PASSWORD}`);
} catch (e) {
  console.error("Échec :", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
