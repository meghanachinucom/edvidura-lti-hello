"""Generate RSA key + JWKS material for LTI 1.3 tool registration."""
from __future__ import annotations

import json
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

ROOT = Path(__file__).resolve().parents[1]
KEYS = ROOT / "keys"


def main() -> None:
    KEYS.mkdir(parents=True, exist_ok=True)
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.TraditionalOpenSSL,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )

    (KEYS / "private.key").write_bytes(private_pem)
    (KEYS / "public.key").write_bytes(public_pem)

    # PyLTI1p3 can serve JWKS from the private key; we also keep a note file.
    meta = {
        "note": "Private key generated. Point Moodle Public keyset URL to "
        "{APP_BASE_URL}/.well-known/jwks.json",
        "private_key": "keys/private.key",
        "public_key": "keys/public.key",
    }
    (KEYS / "README.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print("Generated keys/private.key and keys/public.key")


if __name__ == "__main__":
    main()
