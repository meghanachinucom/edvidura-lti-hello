"""Automatic database migration and seeding for cloud environments."""
from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

logger = logging.getLogger("edvidura.bootstrap")

ROOT = Path(__file__).resolve().parents[1]
_BOOTSTRAP_DONE = False


def ensure_cloud_database_bootstrapped() -> bool:
    """Run migrations and seed Riverside High School data if database is fresh."""
    global _BOOTSTRAP_DONE
    if _BOOTSTRAP_DONE:
        return True

    from app.settings import get_settings

    settings = get_settings()
    db_url = settings.database_url
    if not db_url:
        logger.info("No DATABASE_URL configured; skipping auto-bootstrap")
        return False

    try:
        import psycopg
        from psycopg.rows import dict_row

        with psycopg.connect(db_url, connect_timeout=5) as conn:
            # 1. Check if schema_migrations table exists
            row = conn.execute(
                "SELECT to_regclass('public.schema_migrations') IS NOT NULL AS exists"
            ).fetchone()
            migrations_exist = row and row[0]

            # 2. Check if Riverside tenant exists
            has_riverside = False
            has_new_engines = False
            if migrations_exist:
                t_row = conn.execute(
                    "SELECT 1 FROM tenants WHERE slug = 'riverside' LIMIT 1"
                ).fetchone()
                has_riverside = bool(t_row)
                e_row = conn.execute(
                    "SELECT to_regclass('public.learner_skill_mastery') IS NOT NULL AS exists"
                ).fetchone()
                has_new_engines = bool(e_row and e_row[0])
                ent_row = conn.execute(
                    "SELECT to_regclass('public.speedgrader_annotations') IS NOT NULL AS exists"
                ).fetchone()
                has_enterprise = bool(ent_row and ent_row[0])

        # If migrations, Riverside tenant, or enterprise suite tables missing, run migrations
        if not migrations_exist or not has_riverside or not has_new_engines or not has_enterprise:
            logger.info("Database migration check triggered. Running migrations...")
            from scripts.apply_migrations import main as apply_all_migrations

            migrate_res = apply_all_migrations()
            logger.info("Migrations completed with exit code %s", migrate_res)

            if not has_riverside:
                logger.info("Seeding Riverside High School demo data...")
                from scripts.reset_seed_single_school import seed as seed_riverside

                seed_riverside()
                logger.info("Riverside High School data seeded successfully.")

        _BOOTSTRAP_DONE = True
        return True
    except Exception as exc:
        logger.warning("Database auto-bootstrap skipped or non-fatal: %s", exc)
        return False


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    success = ensure_cloud_database_bootstrapped()
    sys.exit(0 if success else 1)
