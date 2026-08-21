-- BI-friendly views for Metabase (connect as Postgres user `edvidura`, which
-- bypasses RLS). Always filter dashboards by tenant_id in Metabase.
-- Apply: Get-Content db/migration_bi_views.sql | docker exec -i db-db-1 psql -U edvidura -d edvidura -v ON_ERROR_STOP=1

CREATE OR REPLACE VIEW bi_quiz_attempts AS
SELECT
    qa.id,
    qa.tenant_id,
    t.slug AS tenant_slug,
    t.name AS tenant_name,
    qa.subject,
    qa.learner_name,
    qa.course_label,
    qa.score,
    qa.max_score,
    CASE
        WHEN qa.max_score > 0 THEN ROUND(100.0 * qa.score / qa.max_score)::int
        ELSE 0
    END AS percent,
    (qa.max_score > 0 AND qa.score::float / qa.max_score >= 0.6) AS passed,
    qa.grade_sent,
    qa.created_at
FROM quiz_attempts qa
JOIN tenants t ON t.id = qa.tenant_id;

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
    xs.created_at
FROM xapi_statements xs
JOIN tenants t ON t.id = xs.tenant_id;

CREATE OR REPLACE VIEW bi_xapi_daily AS
SELECT
    tenant_id,
    date_trunc('day', created_at)::date AS day,
    verb_id,
    COUNT(*)::bigint AS statement_count
FROM xapi_statements
GROUP BY 1, 2, 3;

CREATE OR REPLACE VIEW bi_lesson_progress AS
SELECT
    lp.id,
    lp.tenant_id,
    t.slug AS tenant_slug,
    lp.course_id,
    lp.lesson_id,
    lp.subject,
    lp.completed_at
FROM lesson_progress lp
JOIN tenants t ON t.id = lp.tenant_id;

CREATE OR REPLACE VIEW bi_tenant_kpis AS
SELECT
    t.id AS tenant_id,
    t.slug AS tenant_slug,
    t.name AS tenant_name,
    (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.tenant_id = t.id) AS attempt_count,
    (SELECT COUNT(DISTINCT subject) FROM quiz_attempts qa WHERE qa.tenant_id = t.id)
        AS quiz_learner_count,
    (SELECT COUNT(*) FROM xapi_statements xs WHERE xs.tenant_id = t.id) AS xapi_count,
    (SELECT COUNT(*) FROM lesson_progress lp WHERE lp.tenant_id = t.id)
        AS lesson_completion_count
FROM tenants t
WHERE t.status = 'active';

GRANT SELECT ON bi_quiz_attempts, bi_xapi_statements, bi_xapi_daily,
    bi_lesson_progress, bi_tenant_kpis TO edvidura;
