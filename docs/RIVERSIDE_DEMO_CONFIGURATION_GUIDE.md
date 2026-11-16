# Riverside Demo Configuration & Safe Password Reset Guide

## 1. Single-School Architecture & Tenant Isolation

EdVidura is configured to operate in a single-school demo mode for local acceptance testing, using the Riverside High tenant.

- **Demo Tenant Name**: Riverside High
- **Tenant ID**: `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`
- **Institution ID**: `11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa`
- **Algebra Course ID**: `cccccccc-cccc-cccc-cccc-cccccccccccc`
- **Class 8 ID**: `3d2c16bb-ed24-4b79-9326-b9a3ad3efdc5` (Code: `RHS-C08`)

### Tenant Isolation Protection
1. **RLS Database Policies**: Every database table enforces PostgreSQL Row Level Security (RLS) keyed to `app.current_tenant_id`.
2. **Gated Peer Tenant**: `_seed_isolation_peer()` in `scripts/reset_seed_single_school.py` is strictly gated behind the `SEED_ISOLATION_PEER` environment variable:
   ```python
   if not os.getenv("SEED_ISOLATION_PEER"):
       return
   ```
   During standard demo seed runs, no secondary or peer tenants (e.g., Lakeside) are seeded into the active database.
3. **Moodle Account Hygiene**: Lakeside demonstration accounts (`lakeside_lucas`, etc.) have been removed and deactivated in Moodle (`suspended = 1`).

---

## 2. Hardened Disposable Database Safety Guard

To prevent accidental data loss in staging or production environments, `scripts/reset_seed_single_school.py` enforces a strict 7-condition fail-closed safety check before executing table truncations:

1. **Structured DSN Parsing**: Parses connection string into `host`, `port`, `database` (never relies on loose substring matching).
2. **Host Allowlist**: Host must match an approved local host (`localhost`, `127.0.0.1`, `::1`, `docker`, `db`, `postgres`).
3. **Port Restriction**: Port must match local test ports (`5432`, `5433`).
4. **Database Name Allowlist**: Database name must exactly match disposable names (`edvidura`, `edvidura_dev`, `edvidura_test`).
5. **Production Marker Rejection**: Any database name or host containing `prod`, `production`, `live`, `stage`, or `staging` is rejected immediately.
6. **Explicit Environment Flag**: Requires `DISPOSABLE_DATABASE=1` in the execution environment.
7. **Connected Database Identity Check**: Executes a read-only preflight query (`SELECT current_database()`) and verifies that `actual_connected_db == parsed_db_name`.
8. **Credential Protection**: Exception messages sanitize connection strings and report only host/database without passwords or full DSNs.

```python
# To execute seed reset locally:
$env:DISPOSABLE_DATABASE="1"
python scripts/reset_seed_single_school.py
Remove-Item Env:\DISPOSABLE_DATABASE
```

---

## 3. Seed Execution & Re-Seeding Instructions

To completely re-initialize the Riverside High demo dataset:

```powershell
# 1. Activate Python virtual environment
.venv\Scripts\Activate.ps1

# 2. Execute single-school seed
python scripts/reset_seed_single_school.py
```

This recreates:
- Riverside High tenant and institution.
- 10 classes (`RHS-C01` through `RHS-C10`) with corresponding courses and lessons.
- 10 teachers and 220 students.
- All 32 Moodle LTI context bindings, including Context 10 $\rightarrow$ Class 8 Algebra I (`RHS-C08`).
- Published quizzes with specific answer keys.
- Versioned PEBL technical handbooks.

### School Admin Least-Privilege Identity Mapping
- **Moodle Account**: `riverside_admin` (userid 5) enrolled in Course 10 with least-privilege non-editing teacher role (`teacher`, role ID 4). Manager (`roleid = 1`) and Course editing permissions are completely removed.
- **EdVidura Entity**: `ADM-01` (`Alex Morgan`, `admin@riverside.test`, `subject = '5'`).
- **Server-Side Elevation**: On LTI launch, EdVidura verifies platform issuer and maps `(tenant_id, subject = '5')` in `school_admins` to establish `is_school_admin = True`, landing the user directly on `/school-admin` without granting unnecessary LMS-wide or course editing authority in Moodle.

---

## 4. Safe Password Reset Guide

For local Moodle accounts, passwords should never be committed into source code or passed via shell history flags.

Use the Moodle CLI `reset_password.php` via standard input or interactive prompt within the Moodle container:

```powershell
# Run interactive CLI password reset within Docker container
docker exec -i moodle-moodle-1 php admin/cli/reset_password.php --username=riverside_alice

# When prompted, enter the new secure password securely via stdin.
```

Repeat for other test personas (`riverside_priya`, `riverside_admin`).
