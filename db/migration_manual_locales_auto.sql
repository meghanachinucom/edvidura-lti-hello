-- Flag auto-translated locales (vs teacher-authored).

ALTER TABLE manual_locales
    ADD COLUMN IF NOT EXISTS is_auto BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN manual_locales.is_auto IS
    'TRUE when body was produced by LLM auto-translate from source language';
