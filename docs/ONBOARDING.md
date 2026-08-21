# Connect a school (simplified)

## Happy path (Dynamic Registration)

1. Open http://127.0.0.1:8000/onboard  
2. Sign in (Keycloak `ops` / `OpsPass123!`) or paste `ADMIN_API_KEY`  
3. Enter **school name** → **Create connect link**  
4. Copy the registration URL  
5. In Moodle: **Site administration → Plugins → External tool → Manage tools → Add LTI Advantage** → paste URL  
6. Activate the pending **EdVidura** tool  
7. Course → External tool → launch (new window)

EdVidura stores issuer, Client ID, and deployment ID automatically.

Registration endpoint: `/lti/register?invite=…`  
Moodle appends `openid_configuration` + `registration_token`.

## Fallback

Expand **Advanced — manual Client ID setup** on `/onboard` (old four-URL flow).

## Local demo

If a platform already points at `http://localhost:8085`, onboard shows **Open demo Moodle**.

## Migration

```powershell
Get-Content db\migration_lti_dynreg.sql | docker exec -i db-db-1 psql -U edvidura -d edvidura -v ON_ERROR_STOP=1
```
