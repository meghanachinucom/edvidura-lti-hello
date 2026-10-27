"""Shared App API for web and mobile clients."""

from app.api.app_client.errors import AppApiError
from app.api.app_client.routes import router

__all__ = ["router", "AppApiError"]
