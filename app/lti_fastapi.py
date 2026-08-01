"""Minimal FastAPI/Starlette adapters for PyLTI1p3."""
from __future__ import annotations

from fastapi import Response
from fastapi.responses import HTMLResponse, RedirectResponse
from pylti1p3.cookie import CookieService
from pylti1p3.message_launch import MessageLaunch
from pylti1p3.oidc_login import OIDCLogin
from pylti1p3.redirect import Redirect
from pylti1p3.request import Request
from pylti1p3.session import SessionService
from starlette.requests import Request as StarletteRequest


class FastAPIRequest(Request):
    """Wraps a Starlette request for PyLTI1p3 (session must be SessionMiddleware)."""

    def __init__(self, request: StarletteRequest, form_data: dict | None = None):
        super().__init__()
        self._request = request
        self._form_data = form_data or {}

    @property
    def session(self):
        return self._request.session

    def get_param(self, key: str):
        if key in self._form_data:
            return self._form_data.get(key)
        return self._request.query_params.get(key)

    def get_cookie(self, key: str):
        return self._request.cookies.get(key)

    def is_secure(self) -> bool:
        return self._request.url.scheme == "https"


class FastAPISessionService(SessionService):
    pass


class FastAPICookieService(CookieService):
    def __init__(self, request: FastAPIRequest):
        self._request = request
        self._cookie_data_to_set: dict = {}

    def _get_key(self, key: str) -> str:
        return self._cookie_prefix + "-" + key

    def get_cookie(self, name: str):
        return self._request.get_cookie(self._get_key(name))

    def set_cookie(self, name: str, value: str, exp: int = 3600):
        self._cookie_data_to_set[self._get_key(name)] = {
            "value": value,
            "exp": exp,
        }

    def update_response(self, response: Response):
        secure = self._request.is_secure()
        for key, cookie_data in self._cookie_data_to_set.items():
            response.set_cookie(
                key=key,
                value=cookie_data["value"],
                max_age=cookie_data["exp"],
                secure=secure,
                path="/",
                httponly=True,
                samesite="none" if secure else "lax",
            )


class FastAPIRedirect(Redirect):
    def __init__(self, location: str, cookie_service: FastAPICookieService | None = None):
        super().__init__()
        self._location = location
        self._cookie_service = cookie_service

    def do_redirect(self):
        response = RedirectResponse(url=self._location, status_code=302)
        if self._cookie_service:
            self._cookie_service.update_response(response)
        return response

    def do_js_redirect(self):
        html = f"<script>window.location='{self._location}';</script>"
        response = HTMLResponse(html)
        if self._cookie_service:
            self._cookie_service.update_response(response)
        return response

    def set_redirect_url(self, location: str):
        self._location = location

    def get_redirect_url(self):
        return self._location


class FastAPIOIDCLogin(OIDCLogin):
    def __init__(self, request: FastAPIRequest, tool_config, launch_data_storage=None):
        cookie_service = FastAPICookieService(request)
        session_service = FastAPISessionService(request)
        super().__init__(
            request, tool_config, session_service, cookie_service, launch_data_storage
        )

    def get_redirect(self, url: str):
        return FastAPIRedirect(url, self._cookie_service)

    def get_response(self, html: str):
        response = HTMLResponse(html)
        self._cookie_service.update_response(response)
        return response

    def _prepare_redirect_url(self, launch_url: str) -> str:
        # Always register state in launch storage (needed when cookies are blocked)
        self.pass_params_to_launch({"registered": True})
        return super()._prepare_redirect_url(launch_url)


class FastAPIMessageLaunch(MessageLaunch):
    def __init__(self, request: FastAPIRequest, tool_config, launch_data_storage=None):
        cookie_service = FastAPICookieService(request)
        session_service = FastAPISessionService(request)
        super().__init__(
            request,
            tool_config,
            session_service,
            cookie_service,
            launch_data_storage,
        )

    def _get_request_param(self, key: str):
        return self._request.get_param(key)

    def validate_state(self):
        """Accept state from cache when cross-site cookies are blocked (local HTTP)."""
        from pylti1p3.exception import LtiException

        state_from_request = self._get_request_param("state")
        if not state_from_request:
            raise LtiException("Missing state param")

        id_token_hash = self._get_id_token_hash()
        if self._session_service.check_state_is_valid(state_from_request, id_token_hash):
            return self

        state_from_cookie = self._cookie_service.get_cookie(state_from_request)
        if state_from_request == state_from_cookie:
            return self

        # OIDC login stored this state in cache via pass_params_to_launch()
        params = self._session_service.get_state_params(state_from_request)
        if params is not None:
            return self

        raise LtiException("State not found")


def make_launch_data_storage(request: FastAPIRequest, cache):
    """Cache-backed storage so state/nonce survive cross-site POSTs on local HTTP."""
    from pylti1p3.launch_data_storage.cache import CacheDataStorage

    storage = CacheDataStorage()
    storage._cache = cache
    storage.set_request(request)
    return storage
