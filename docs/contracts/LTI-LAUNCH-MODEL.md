# Contract — LTI launch model

| Field | Value |
| ----- | ----- |
| Status | **Accepted** (proven by spike) |
| Date | 2026-07-30 |
| Owner | Integrations lead |
| Related | CQA0078, CQA0080, CQA0103, Architecture Review risk #9 (custom LTI forbidden) |

## Decision

| Item | Choice |
| ---- | ------ |
| Protocol | LTI 1.3 (OIDC third-party login + signed JWT, JWKS verification) |
| Library | **PyLTI1p3** — maintained library; hand-rolled JWT/LTI crypto is forbidden |
| Launch presentation | New window (not iframe) |
| Sales model | SaaS EdVidura + **BYO Moodle**: the customer registers EdVidura as an external tool in their own LMS |
| Not building | A Moodle plugin product; a Moodle instance per customer inside our repo |

## Tool endpoints (stable shape)

- Initiate login: `{base}/lti/login`
- Launch / redirect URI: `{base}/lti/launch`
- Public keyset: `{base}/.well-known/jwks.json`

Registration data (issuer, client_id, deployment_ids, auth/token/keyset URLs) lives in `lti_platforms`, keyed to a tenant (DEC-006).

## Planned on the same trust fabric (Slice A+)

- **AGS** (Assignment & Grade Services) for grade passback — required by DEC-013.
- **Deep Linking** — one resource link per quiz so launches carry the quiz identity.
- Replay protection and JWKS rotation handling reviewed before production; 1EdTech certification budgeted per DEC-012 scope.

## Change log

- 2026-07-30 — v1 accepted.
