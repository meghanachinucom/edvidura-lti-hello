"""Explicit test fixture providing mock PostgreSQL data-access boundary for Phase 2 tests.

NOTE: This mock isolates unit tests from live PostgreSQL when the database is unavailable.
It does NOT verify real PostgreSQL persistence or live PostgreSQL RLS policies.
"""
from __future__ import annotations

import contextlib
from datetime import datetime, timezone
from typing import Any
import uuid


class MockResult:
    def __init__(self, rows: list[dict[str, Any]], rowcount: int = 1):
        self._rows = rows
        self.rowcount = rowcount

    def fetchone(self) -> dict[str, Any] | None:
        return self._rows[0] if self._rows else None

    def fetchall(self) -> list[dict[str, Any]]:
        return list(self._rows)


class Phase2DataStore:
    def __init__(self):
        self.progress: list[dict[str, Any]] = []
        self.bookmarks: list[dict[str, Any]] = []
        self.annotations: list[dict[str, Any]] = []

    def clear(self):
        self.progress.clear()
        self.bookmarks.clear()
        self.annotations.clear()


class MockPhase2Connection:
    def __init__(self, tenant_id: str, store: Phase2DataStore):
        self.tenant_id = str(tenant_id)
        self.store = store
    def execute(self, sql: str, params: tuple | list = ()) -> MockResult:
        clean_sql = " ".join(sql.strip().split())
        now = datetime.now(timezone.utc)
        # Quiz session tokens fallback handling
        if clean_sql.startswith("INSERT INTO quiz_session_tokens"):
            return MockResult([], rowcount=1)

        # 1. Reading Progress
        if clean_sql.startswith("INSERT INTO ebook_reading_progress"):
            tid, mid, v, sub, chap, cfi, pct = params
            assert str(tid) == self.tenant_id, "Tenant mismatch with connection"
            existing = None
            for p in self.store.progress:
                if (
                    p["tenant_id"] == str(tid)
                    and p["manual_id"] == str(mid)
                    and p["version"] == int(v)
                    and p["subject"] == str(sub)
                ):
                    existing = p
                    break
            if existing:
                existing["chapter_index"] = int(chap)
                if cfi is not None:
                    existing["cfi"] = str(cfi)
                existing["progress_percent"] = int(pct)
                existing["updated_at"] = now
                return MockResult([existing], rowcount=1)
            else:
                row = {
                    "id": str(uuid.uuid4()),
                    "tenant_id": str(tid),
                    "manual_id": str(mid),
                    "version": int(v),
                    "subject": str(sub),
                    "chapter_index": int(chap),
                    "cfi": str(cfi) if cfi is not None else None,
                    "progress_percent": int(pct),
                    "updated_at": now,
                }
                self.store.progress.append(row)
                return MockResult([row], rowcount=1)

        elif clean_sql.startswith("SELECT") and "FROM ebook_reading_progress" in clean_sql:
            mid, v, sub = params
            matched = [
                p
                for p in self.store.progress
                if p["tenant_id"] == self.tenant_id
                and p["manual_id"] == str(mid)
                and p["version"] == int(v)
                and p["subject"] == str(sub)
            ]
            return MockResult(matched)

        # 2. Bookmarks
        elif clean_sql.startswith("INSERT INTO ebook_bookmarks"):
            tid, mid, v, sub, chap, cfi, title = params
            assert str(tid) == self.tenant_id, "Tenant mismatch with connection"
            row = {
                "id": str(uuid.uuid4()),
                "tenant_id": str(tid),
                "manual_id": str(mid),
                "version": int(v),
                "subject": str(sub),
                "chapter_index": int(chap),
                "cfi": str(cfi) if cfi is not None else None,
                "title": str(title),
                "created_at": now,
            }
            self.store.bookmarks.append(row)
            return MockResult([row], rowcount=1)

        elif (
            clean_sql.startswith("SELECT")
            and "FROM ebook_bookmarks" in clean_sql
            and "WHERE id = %s" in clean_sql
        ):
            bid = params[0]
            matched = [
                b
                for b in self.store.bookmarks
                if b["tenant_id"] == self.tenant_id and b["id"] == str(bid)
            ]
            return MockResult(matched)

        elif clean_sql.startswith("SELECT") and "FROM ebook_bookmarks" in clean_sql:
            mid, v, sub = params
            matched = [
                b
                for b in self.store.bookmarks
                if b["tenant_id"] == self.tenant_id
                and b["manual_id"] == str(mid)
                and b["version"] == int(v)
                and b["subject"] == str(sub)
            ]
            return MockResult(matched)

        elif clean_sql.startswith("DELETE FROM ebook_bookmarks"):
            bid, sub = params
            before = len(self.store.bookmarks)
            self.store.bookmarks = [
                b
                for b in self.store.bookmarks
                if not (
                    b["tenant_id"] == self.tenant_id
                    and b["id"] == str(bid)
                    and b["subject"] == str(sub)
                )
            ]
            deleted_count = before - len(self.store.bookmarks)
            return MockResult([], rowcount=deleted_count)

        # 3. Annotations
        elif clean_sql.startswith("INSERT INTO ebook_annotations"):
            tid, mid, v, sub, chap, cfi_range, highlight_text, annotation_text, color = params
            assert str(tid) == self.tenant_id, "Tenant mismatch with connection"
            row = {
                "id": str(uuid.uuid4()),
                "tenant_id": str(tid),
                "manual_id": str(mid),
                "version": int(v),
                "subject": str(sub),
                "chapter_index": int(chap),
                "cfi_range": str(cfi_range) if cfi_range is not None else None,
                "highlight_text": str(highlight_text),
                "annotation_text": str(annotation_text),
                "color": str(color),
                "created_at": now,
                "updated_at": now,
            }
            self.store.annotations.append(row)
            return MockResult([row], rowcount=1)

        elif (
            clean_sql.startswith("SELECT")
            and "FROM ebook_annotations" in clean_sql
            and "WHERE id = %s" in clean_sql
        ):
            aid = params[0]
            matched = [
                a
                for a in self.store.annotations
                if a["tenant_id"] == self.tenant_id and a["id"] == str(aid)
            ]
            return MockResult(matched)

        elif clean_sql.startswith("SELECT") and "FROM ebook_annotations" in clean_sql:
            mid, v, sub = params
            matched = [
                a
                for a in self.store.annotations
                if a["tenant_id"] == self.tenant_id
                and a["manual_id"] == str(mid)
                and a["version"] == int(v)
                and a["subject"] == str(sub)
            ]
            return MockResult(matched)

        elif clean_sql.startswith("UPDATE ebook_annotations"):
            ann_text, col, aid, sub = params
            count = 0
            for a in self.store.annotations:
                if (
                    a["tenant_id"] == self.tenant_id
                    and a["id"] == str(aid)
                    and a["subject"] == str(sub)
                ):
                    if ann_text is not None:
                        a["annotation_text"] = str(ann_text)
                    if col is not None:
                        a["color"] = str(col)
                    a["updated_at"] = now
                    count += 1
            return MockResult([], rowcount=count)

        elif clean_sql.startswith("DELETE FROM ebook_annotations"):
            aid, sub = params
            before = len(self.store.annotations)
            self.store.annotations = [
                a
                for a in self.store.annotations
                if not (
                    a["tenant_id"] == self.tenant_id
                    and a["id"] == str(aid)
                    and a["subject"] == str(sub)
                )
            ]
            deleted_count = before - len(self.store.annotations)
            return MockResult([], rowcount=deleted_count)

        raise NotImplementedError(f"Unhandled SQL in MockPhase2Connection: {sql}")


GLOBAL_PHASE2_STORE = Phase2DataStore()


@contextlib.contextmanager
def mock_phase2_tenant_connection(tenant_id: Any):
    yield MockPhase2Connection(str(tenant_id), GLOBAL_PHASE2_STORE)
