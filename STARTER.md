# Starter package

This zip is a clean copy of EdVidura LTI Hello (multi-tenant spike).

## Setup
1. Unzip
2. Copy `config.example.env` to `.env`
3. Create venv, `pip install -r requirements.txt`
4. `python scripts\generate_keys.py`
5. Follow `README.md` (Postgres on 5433, app on 8000, Moodle on 8085)

## Do not commit
- `.env`
- private keys under `keys/`

## Extend
Do only the task your lead assigned (e.g. tenant onboarding API).
Do not change tenant resolution rules in `docs/TENANT_RESOLUTION.md` unless asked.
