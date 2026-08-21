"""LTI Dynamic Registration HTTP endpoints (Moodle iframe)."""
from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from app.modules import lti_dynreg

router = APIRouter(tags=["LTI Dynamic Registration"])
_TEMPLATES = Jinja2Templates(
    directory=str(Path(__file__).resolve().parents[1] / "templates")
)


@router.api_route("/lti/register", methods=["GET", "POST"], response_class=HTMLResponse)
async def lti_dynamic_register(
    request: Request,
    invite: str | None = None,
    openid_configuration: str | None = None,
    registration_token: str | None = None,
):
    """Moodle opens this URL (iframe) with openid_configuration (+ token)."""
    token = (invite or "").strip()
    if not token:
        return HTMLResponse(
            _error_page(
                "Missing invite",
                "Open Connect on EdVidura first, then paste the registration URL into Moodle.",
            ),
            status_code=400,
        )

    invite_row = lti_dynreg.get_invite(token)
    if not invite_row:
        return HTMLResponse(
            _error_page(
                "Unknown connect link",
                "Create a new school connect link from EdVidura onboarding.",
            ),
            status_code=404,
        )

    # Moodle initiation: complete registration automatically.
    if openid_configuration:
        try:
            result = lti_dynreg.complete_dynamic_registration(
                invite_token=token,
                openid_configuration_url=openid_configuration,
                registration_token=registration_token,
            )
            return _TEMPLATES.TemplateResponse(
                request,
                "lti_register_done.html",
                {
                    "ok": True,
                    "tenant_name": result.get("tenant_name"),
                    "tenant_slug": result.get("tenant_slug"),
                    "issuer": result.get("issuer"),
                    "client_id": result.get("client_id"),
                    "deployment_id": result.get("deployment_id"),
                    "error": "",
                },
            )
        except Exception as exc:  # noqa: BLE001
            return _TEMPLATES.TemplateResponse(
                request,
                "lti_register_done.html",
                {
                    "ok": False,
                    "tenant_name": invite_row.get("tenant_name"),
                    "tenant_slug": invite_row.get("tenant_slug"),
                    "issuer": "",
                    "client_id": "",
                    "deployment_id": "",
                    "error": str(exc),
                },
                status_code=400,
            )

    # Human opened the URL without Moodle params — show what to do.
    return _TEMPLATES.TemplateResponse(
        request,
        "lti_register_waiting.html",
        {
            "tenant_name": invite_row.get("tenant_name"),
            "tenant_slug": invite_row.get("tenant_slug"),
            "registration_url": lti_dynreg.registration_url(token),
            "already_done": bool(invite_row.get("consumed_at")),
            "client_id": invite_row.get("client_id") or "",
            "issuer": invite_row.get("issuer") or "",
        },
    )


def _error_page(title: str, body: str) -> str:
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"/><title>{title}</title>
<style>body{{font-family:system-ui;max-width:32rem;margin:2rem auto;padding:0 1rem}}
h1{{font-size:1.35rem}}</style></head><body>
<h1>{title}</h1><p>{body}</p>
<script>(window.opener||window.parent).postMessage({{subject:'org.imsglobal.lti.close'}},'*');</script>
</body></html>"""
