# Shared Postgres backup note (local / pilot)

EdVidura cloud path uses **one shared database** with RLS (DEC-006). Treat backups as whole-database, not per-tenant dumps, unless you later run dedicated instances.

## Automated script (Phase 6)

```powershell
# Windows
.\scripts\backup_postgres.ps1
```

```bash
# Linux / macOS / Railway shell with pg_dump
chmod +x scripts/backup_postgres.sh
./scripts/backup_postgres.sh
```

Writes `backups/edvidura-YYYYMMDD-HHMMSS.dump` and keeps the last **14** files.

Schedule examples:

- Windows Task Scheduler: daily `powershell -File ...\scripts\backup_postgres.ps1`
- cron: `15 2 * * * cd /app && ./scripts/backup_postgres.sh`
- Railway: cron job service with `DATABASE_URL` + `pg_dump`, or enable provider **PITR**

## Local Docker (manual)

Database service: `db/docker-compose.yml` → host port **5433**, DB `edvidura`.

```bash
docker exec db-db-1 pg_dump -U edvidura -d edvidura --format=custom -f /tmp/edvidura.dump
docker cp db-db-1:/tmp/edvidura.dump ./backups/edvidura-$(date +%Y%m%d).dump
```

Restore:

```bash
docker cp ./backups/edvidura-YYYYMMDD.dump db-db-1:/tmp/edvidura.dump
docker exec db-db-1 pg_restore -U edvidura -d edvidura --clean --if-exists /tmp/edvidura.dump
```

### What must be backed up together

- Postgres data (tenants, platforms, attempts, lessons, outbox, manuals, shared_cache)
- LTI private keys under `keys/` (not in git) or `LTI_PRIVATE_KEY_PEM`
- `.env` secrets (`SESSION_SECRET`, `ADMIN_API_KEY`, DB URL) — secret manager, not the dump alone

### RLS reminder

Restoring as a superuser bypasses RLS for admin recovery; application runtime must continue using `edvidura_app` (**NOBYPASSRLS**).

### Production checklist

- [ ] Nightly dump or managed Postgres PITR
- [ ] Encrypted offsite copy
- [ ] Document RPO/RTO with the pilot school
- [ ] Shared launch cache is Postgres `shared_cache` (multi-instance) — see Phase 5
