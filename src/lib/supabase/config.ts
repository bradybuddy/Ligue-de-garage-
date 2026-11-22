export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
/** Vrai si l'auth passe par Supabase (sinon : session de démo, dev seulement). */
export const supabaseAuthEnabled = !!(supabaseUrl && supabaseAnonKey);
/** Où renvoyer après le clic dans le courriel de confirmation (ex. /j/CODE). */
export const AFTER_CONFIRM_COOKIE = "bb_after_confirm";
