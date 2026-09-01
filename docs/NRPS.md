# NRPS roster awareness

Moodle owns people. EdVidura caches **Names and Role Provisioning Service (NRPS)** memberships for class awareness only — no EdVidura logins or accounts.

## What you get

| Surface | Behavior |
|---------|----------|
| Teacher **Class results** | **Sync Moodle roster** + member list |
| Learner names | Prefer NRPS display names when attempt subject matches |
| Progress roster | Same name enrichment |

## Moodle setup

1. External tool → **Services** → Names and Role Provisioning = **Use this service**.
2. Relaunch EdVidura as teacher (so the launch JWT includes the NRPS claim).
3. Class results → **Sync Moodle roster**.

## Domain

- Module: `app.modules.nrps`
- Table: `lti_context_rosters` (`db/migration_nrps_rosters.sql`) — RLS by `tenant_id`
- Routes: `POST /teacher/roster/sync`

Cached JSON members include `user_id`, `name`, roles, email — never passwords.
