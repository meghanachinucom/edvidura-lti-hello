-- Refresh BI views to include xAPI tiers (after migration_xapi_tiers.sql).
-- Idempotent CREATE OR REPLACE.

CREATE OR REPLACE VIEW bi_xapi_statements AS
SELECT
    xs.id,
    xs.tenant_id,
    t.slug AS tenant_slug,
    xs.statement_id,
    xs.verb_id,
    xs.actor_sub,
    xs.object_id,
    xs.attempt_id,
    xs.sent_to_lrs,
    xs.lrs_error,
    COALESCE(xs.tier, 'noisy') AS tier,
    COALESCE(xs.lrs_attempts, 0) AS lrs_attempts,
    xs.promoted_at,
    xs.created_at
FROM xapi_statements xs
JOIN tenants t ON t.id = xs.tenant_id;

CREATE OR REPLACE VIEW bi_xapi_daily AS
SELECT
    tenant_id,
    date_trunc('day', created_at)::date AS day,
    verb_id,
    COALESCE(tier, 'noisy') AS tier,
    COUNT(*)::bigint AS statement_count
FROM xapi_statements
GROUP BY 1, 2, 3, 4;

CREATE OR REPLACE VIEW bi_tenant_kpis AS
SELECT
    t.id AS tenant_id,
    t.slug AS tenant_slug,
    t.name AS tenant_name,
    (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.tenant_id = t.id) AS attempt_count,
    (SELECT COUNT(DISTINCT subject) FROM quiz_attempts qa WHERE qa.tenant_id = t.id)
        AS quiz_learner_count,
    (SELECT COUNT(*) FROM xapi_statements xs WHERE xs.tenant_id = t.id) AS xapi_count,
    (SELECT COUNT(*) FROM xapi_statements xs
      WHERE xs.tenant_id = t.id AND COALESCE(xs.tier, '') = 'authoritative')
        AS xapi_authoritative_count,
    (SELECT COUNT(*) FROM lesson_progress lp WHERE lp.tenant_id = t.id)
        AS lesson_completion_count
FROM tenants t
WHERE t.status = 'active';

GRANT SELECT ON bi_xapi_statements, bi_xapi_daily, bi_tenant_kpis TO edvidura;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'edvidura_bi') THEN
    EXECUTE 'GRANT SELECT ON bi_xapi_statements, bi_xapi_daily, bi_tenant_kpis TO edvidura_bi';
  END IF;
END $$;
