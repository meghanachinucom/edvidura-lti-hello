"""Shared LLM JSON chat helper (OpenAI, Anthropic, local OpenAI-compatible)."""
from __future__ import annotations

import json
import logging
import re
from typing import Any

import httpx

from app.settings import get_settings

logger = logging.getLogger("edvidura.ai")


def _resolve_remote() -> dict[str, str] | None:
    """Pick Anthropic, OpenAI, or local OpenAI-compatible endpoint (E04)."""
    s = get_settings()
    if not s.ai_enabled:
        return None
    provider = (s.ai_provider or "auto").strip().lower()
    if provider not in {"auto", "openai", "anthropic", "local_http"}:
        provider = "auto"
    force_local = bool(s.ai_force_local)
    local_ok = bool(s.local_ai_base_url)
    openai_ok = bool(s.openai_api_key)
    anthropic_ok = bool(getattr(s, "anthropic_api_key", "") or "")

    use_local = force_local or provider == "local_http"
    if use_local:
        if not local_ok:
            return None
        return {
            "provider": "local_http",
            "base_url": s.local_ai_base_url.rstrip("/"),
            "api_key": s.local_ai_api_key or "local",
            "model": s.local_ai_model,
        }
    if provider == "anthropic":
        if not anthropic_ok:
            return None
        return {
            "provider": "anthropic",
            "base_url": "https://api.anthropic.com",
            "api_key": s.anthropic_api_key,
            "model": s.anthropic_model or "claude-3-5-haiku-latest",
        }
    if provider == "openai":
        if not openai_ok:
            return None
        return {
            "provider": "openai",
            "base_url": "https://api.openai.com/v1",
            "api_key": s.openai_api_key,
            "model": s.openai_model,
        }
    # auto: Anthropic → OpenAI → local HTTP
    if anthropic_ok:
        return {
            "provider": "anthropic",
            "base_url": "https://api.anthropic.com",
            "api_key": s.anthropic_api_key,
            "model": s.anthropic_model or "claude-3-5-haiku-latest",
        }
    if openai_ok:
        return {
            "provider": "openai",
            "base_url": "https://api.openai.com/v1",
            "api_key": s.openai_api_key,
            "model": s.openai_model,
        }
    if local_ok:
        return {
            "provider": "local_http",
            "base_url": s.local_ai_base_url.rstrip("/"),
            "api_key": s.local_ai_api_key or "local",
            "model": s.local_ai_model,
        }
    return None


def ai_status() -> dict[str, Any]:
    s = get_settings()
    remote = _resolve_remote()
    remote_ready = remote is not None
    provider = remote["provider"] if remote else "local"
    model = remote["model"] if remote else "heuristic-v1"
    how = "Remote LLM is active."
    if not remote_ready:
        if s.ai_force_local or (s.ai_provider or "").lower() == "local_http":
            how = (
                "Set AI_ENABLED=1 and LOCAL_AI_BASE_URL (OpenAI-compatible "
                "/v1) in .env, then restart. Optional: LOCAL_AI_API_KEY, "
                "LOCAL_AI_MODEL, AI_FORCE_LOCAL=1."
            )
        elif (s.ai_provider or "").lower() == "anthropic":
            how = (
                "Set AI_ENABLED=1 and ANTHROPIC_API_KEY in .env, then restart. "
                "Optional: ANTHROPIC_MODEL (default claude-3-5-haiku-latest)."
            )
        else:
            how = (
                "Set AI_ENABLED=1 and ANTHROPIC_API_KEY or OPENAI_API_KEY "
                "(or LOCAL_AI_BASE_URL) in .env, then restart the app."
            )
    return {
        "enabled": bool(s.ai_enabled),
        "has_api_key": bool(s.openai_api_key or getattr(s, "anthropic_api_key", "")),
        "has_openai_key": bool(s.openai_api_key),
        "has_anthropic_key": bool(getattr(s, "anthropic_api_key", "")),
        "has_local_endpoint": bool(s.local_ai_base_url),
        "ai_provider": (s.ai_provider or "auto").lower(),
        "force_local": bool(s.ai_force_local),
        "openai_ready": remote_ready,  # template/compat: any remote LLM
        "remote_ready": remote_ready,
        "provider": provider,
        "model": model,
        "how_to_enable": how,
    }


def _parse_json_object(content: str) -> dict[str, Any]:
    text = (content or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.I)
        text = re.sub(r"\s*```$", "", text)
    data = json.loads(text)
    if not isinstance(data, dict):
        raise ValueError("Expected JSON object from model")
    return data


def _openai_compatible_chat_json(
    *,
    remote: dict[str, str],
    system: str,
    user: str,
    temperature: float,
    timeout: float,
) -> dict[str, Any]:
    url = f"{remote['base_url'].rstrip('/')}/chat/completions"
    resp = httpx.post(
        url,
        headers={
            "Authorization": f"Bearer {remote['api_key']}",
            "Content-Type": "application/json",
        },
        json={
            "model": remote["model"],
            "temperature": temperature,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        },
        timeout=timeout,
    )
    resp.raise_for_status()
    content = resp.json()["choices"][0]["message"]["content"]
    return _parse_json_object(content)


def _anthropic_chat_json(
    *,
    remote: dict[str, str],
    system: str,
    user: str,
    temperature: float,
    timeout: float,
) -> dict[str, Any]:
    url = f"{remote['base_url'].rstrip('/')}/v1/messages"
    system_json = (
        f"{system}\n\n"
        "Respond with a single JSON object only. No markdown fences or prose."
    )
    resp = httpx.post(
        url,
        headers={
            "x-api-key": remote["api_key"],
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": remote["model"],
            "max_tokens": 2048,
            "temperature": temperature,
            "system": system_json,
            "messages": [{"role": "user", "content": user}],
        },
        timeout=timeout,
    )
    resp.raise_for_status()
    payload = resp.json()
    parts = payload.get("content") or []
    text_bits: list[str] = []
    for part in parts:
        if isinstance(part, dict) and part.get("type") == "text":
            text_bits.append(str(part.get("text") or ""))
    return _parse_json_object("\n".join(text_bits))


def openai_chat_json(
    *,
    system: str,
    user: str,
    temperature: float = 0.3,
    timeout: float = 60.0,
) -> dict[str, Any]:
    """Call configured remote LLM (Anthropic / OpenAI / local) with JSON output."""
    remote = _resolve_remote()
    if not remote:
        raise RuntimeError("Remote LLM not configured")
    if remote["provider"] == "anthropic":
        return _anthropic_chat_json(
            remote=remote,
            system=system,
            user=user,
            temperature=temperature,
            timeout=timeout,
        )
    return _openai_compatible_chat_json(
        remote=remote,
        system=system,
        user=user,
        temperature=temperature,
        timeout=timeout,
    )


def local_http_chat_json(
    *,
    system: str,
    user: str,
    temperature: float = 0.3,
    timeout: float = 60.0,
) -> dict[str, Any]:
    """Force local OpenAI-compatible endpoint (ignores cloud AI_PROVIDER)."""
    s = get_settings()
    if not s.ai_enabled or not s.local_ai_base_url:
        raise RuntimeError("Local AI endpoint not configured")
    remote = {
        "provider": "local_http",
        "base_url": s.local_ai_base_url.rstrip("/"),
        "api_key": s.local_ai_api_key or "local",
        "model": s.local_ai_model,
    }
    return _openai_compatible_chat_json(
        remote=remote,
        system=system,
        user=user,
        temperature=temperature,
        timeout=timeout,
    )


def run_ai(
    *,
    openai_fn,
    local_fn,
    feature: str,
) -> dict[str, Any]:
    """Prefer remote LLM when ready; always fall back to local heuristics."""
    status = ai_status()
    if status["remote_ready"]:
        try:
            result = openai_fn()
            if isinstance(result, dict):
                result.setdefault("provider", status["provider"])
                result.setdefault("model", status["model"])
                return result
        except Exception as exc:  # noqa: BLE001
            logger.warning("%s remote LLM failed, local fallback: %s", feature, exc)
    result = local_fn()
    if isinstance(result, dict):
        result.setdefault("provider", "local")
        result.setdefault("model", "heuristic-v1")
        result.setdefault(
            "note",
            status["how_to_enable"]
            if not status["remote_ready"]
            else "Used local fallback after remote LLM error",
        )
    return result
