# Vendored ADL artifacts

Third-party files under this tree are from ADL Initiative GitHub projects.
EdVidura does **not** run the full TLA Docker/Kafka stack; we vendor the
contracts and query logic that are reusable in another app.

| Path | Upstream | License | How we use it |
|------|----------|---------|---------------|
| `xi_lite/app.js`, `mongo.js` | [adlnet/xi-lite](https://github.com/adlnet/xi-lite) | See `xi_lite/LICENSE` | Reference + Python port in `xi_query.py` |
| `cmi5/requirements.json` | [adlnet/CATAPULT](https://github.com/adlnet/CATAPULT) `requirements/` | Apache-2.0 (`cmi5/LICENSE`) | Loaded by `cmi5_requirements.py` |

Python ports live beside this folder (`xi_query.py`, `cmi5_requirements.py`) and
have **no** EdVidura DB imports so they can be copied into another product.
