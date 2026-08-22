-- Ensure a non-superuser, NOBYPASSRLS app role for SaaS / Railway.
-- Run as Postgres owner (superuser), then point DATABASE_URL at edvidura_app.
--
-- Example:
--   psql "$OWNER_DATABASE_URL" -v ON_ERROR_STOP=1 -f db/ensure_app_role.sql
--   # then set DATABASE_URL=postgresql://edvidura_app:...@host/db

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'edvidura_app') THEN
        CREATE ROLE edvidura_app LOGIN PASSWORD 'CHANGE_ME_STRONG_PASSWORD'
            NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
        RAISE NOTICE 'Created role edvidura_app — change password immediately';
    ELSE
        ALTER ROLE edvidura_app NOSUPERUSER NOBYPASSRLS;
        RAISE NOTICE 'Updated edvidura_app: NOSUPERUSER NOBYPASSRLS';
    END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO edvidura_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO edvidura_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO edvidura_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO edvidura_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO edvidura_app;

DO $$
BEGIN
    EXECUTE format(
        'GRANT CONNECT ON DATABASE %I TO edvidura_app',
        current_database()
    );
END
$$;

-- Prove RLS will apply for this role
DO $$
DECLARE
    bypass boolean;
    super boolean;
BEGIN
    SELECT rolbypassrls, rolsuper INTO bypass, super
    FROM pg_roles WHERE rolname = 'edvidura_app';
    IF bypass OR super THEN
        RAISE EXCEPTION 'edvidura_app must be NOSUPERUSER NOBYPASSRLS (bypass=%, super=%)', bypass, super;
    END IF;
END
$$;
