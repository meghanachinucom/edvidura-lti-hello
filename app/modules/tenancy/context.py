"""Request-scoped tenant context (DEC-006)."""
from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar, Token
from dataclasses import dataclass
from typing import Iterator
from uuid import UUID

from app.db import with_tenant as db_with_tenant

_current: ContextVar["TenantContext | None"] = ContextVar(
    "tenant_context", default=None
)


@dataclass(frozen=True)
class TenantContext:
    tenant_id: UUID
    slug: str = ""
    name: str = ""

    @property
    def id_str(self) -> str:
        return str(self.tenant_id)


def get_tenant_context() -> TenantContext | None:
    return _current.get()


def require_tenant_context() -> TenantContext:
    ctx = _current.get()
    if ctx is None:
        raise RuntimeError("TenantContext is not set for this request")
    return ctx


def set_tenant_context(ctx: TenantContext) -> Token:
    return _current.set(ctx)


def reset_tenant_context(token: Token) -> None:
    _current.reset(token)


@contextmanager
def use_tenant_context(ctx: TenantContext) -> Iterator[TenantContext]:
    token = set_tenant_context(ctx)
    try:
        yield ctx
    finally:
        reset_tenant_context(token)


@contextmanager
def with_tenant(tenant_id: UUID | str, *, slug: str = "", name: str = ""):
    """Set ContextVar + open a DB connection with SET LOCAL app.tenant_id."""
    ctx = TenantContext(
        tenant_id=UUID(str(tenant_id)),
        slug=slug,
        name=name,
    )
    with use_tenant_context(ctx):
        with db_with_tenant(ctx.tenant_id) as conn:
            yield conn
