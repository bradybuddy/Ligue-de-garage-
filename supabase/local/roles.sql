-- Mots de passe des rôles internes (développement local seulement)
alter user supabase_auth_admin with password 'postgres-local';
alter user authenticator with password 'postgres-local';
