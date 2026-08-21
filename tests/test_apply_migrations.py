"""Migration SQL splitter / apply helpers."""
from __future__ import annotations

from scripts.apply_migrations import _statements


def test_splitter_ignores_semicolon_in_line_comment():
    sql = """
-- one school = one tenant; each school has its own admin
CREATE TABLE IF NOT EXISTS school_admins (id UUID PRIMARY KEY);
GRANT SELECT ON school_admins TO edvidura_app;
"""
    stmts = _statements(sql)
    assert len(stmts) == 2
    assert "CREATE TABLE" in stmts[0]
    assert "GRANT SELECT" in stmts[1]


def test_splitter_keeps_do_dollar_blocks():
    sql = """
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1) THEN
    RAISE NOTICE 'x';
  END IF;
END
$$;
CREATE TABLE t (id int);
"""
    stmts = _statements(sql)
    assert len(stmts) == 2
    assert stmts[0].strip().startswith("DO $$")
    assert "END IF" in stmts[0]
    assert "CREATE TABLE t" in stmts[1]
