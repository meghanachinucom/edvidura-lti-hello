# Canvas LTI 1.3 playbook

Connect EdVidura to **Canvas** (cloud or self-hosted) without Moodle-specific dynreg.

## Prerequisites

- EdVidura reachable at `APP_BASE_URL` (HTTPS in staging/production)
- JWKS serving: `{APP_BASE_URL}/.well-known/jwks.json` (or your project’s public keyset path)
- Ops can create a tenant + `lti_platforms` row via `/onboard`

## 1. Create an LTI Developer Key

1. Canvas Admin → **Developer Keys** → **+ Developer Key** → **+ LTI Key**
2. Key name: `EdVidura`
3. Redirect URIs / OpenID Connect Initiation URL: EdVidura **OIDC login** URL from onboard (Advanced)
4. Target Link URI: EdVidura **launch** URL
5. Public JWK URL: EdVidura JWKS
6. LTI Advantage services:
   - **Assignment and Grade Services** — Use this service
   - **Names and Role Provisioning** — Use this service
   - Deep Linking — optional
7. Save → switch key **ON** → copy **Client ID**

## 2. Register on EdVidura

On `/onboard` → **Advanced — manual Client ID setup**:

| Field | Value |
|-------|--------|
| Issuer | Canvas base URL, e.g. `https://yourschool.instructure.com` |
| Client ID | From the Developer Key |
| Deployment ID | From the external tool / deployment (often numeric; copy from Canvas) |

## 3. Add tool to a course

1. Course → Settings → Apps → View App Configurations → **+ App**
2. Configuration type: **By Client ID** → paste Client ID
3. Add to a module / assignment as External Tool
4. Launch once as teacher, once as student

## 4. Smoke checklist

- [ ] Launch opens EdVidura shell; chip shows **← Canvas**
- [ ] Student quiz submit; AGS posts when line item configured
- [ ] Teacher **Sync Moodle roster** works (NRPS — label may still say Moodle in UI; roster is LMS-agnostic)
- [ ] `/onboard` shows last launch for the platform

## Quirks

- Prefer `launch_presentation.return_url` when Canvas sends it; otherwise EdVidura falls back to `/courses/{id}`
- Cookies / third-party iframe: prefer **new window** launch if Canvas blocks third-party cookies
- Deployment ID must match the allow-list on `lti_platforms.deployment_ids`

## Related

[MULTI_LMS.md](MULTI_LMS.md) · [AGS_CHECKLIST.md](AGS_CHECKLIST.md) · [NRPS.md](NRPS.md)
