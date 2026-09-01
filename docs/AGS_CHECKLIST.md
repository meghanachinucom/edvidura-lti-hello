# AGS checklist (LMS grade passback)

Use this before every pilot / external demo. Quiz submit always stores the attempt in EdVidura; **LMS gradebook sync only works when AGS is configured**.

## Moodle external tool

1. Site admin → **Plugins** → **Activity modules** → **External tool** → manage tools (or per-course external tool).
2. EdVidura tool URL / Launch: `{APP_BASE_URL}/lti/launch`
3. Initiate login: `{APP_BASE_URL}/lti/login`
4. Public keyset: `{APP_BASE_URL}/.well-known/jwks.json`
5. Under **Services / Privacy**:
   - **Accept grades from the tool** = Yes (Assignment and Grade Services)
   - Share launcher name / email as needed for roster matching
6. Launch container: **New window** (recommended for local cookie behavior)

## Canvas Developer Key

1. Admin → Developer Keys → LTI Key (see [CANVAS.md](CANVAS.md)).
2. Enable **Assignment and Grade Services**.
3. Course external tool / assignment must accept a grade.
4. Register issuer + Client ID + Deployment ID on `/onboard`.

## Course activity

1. Add an **External tool** activity pointing at the EdVidura tool.
2. Grade settings: activity must accept a grade (point scale matching quiz max, or the LMS will rescale).
3. Student role can launch; teacher role can launch for Class results.

## EdVidura registration

1. Open `/onboard` and confirm platform **Client ID** + **Deployment ID** match the LMS.
2. Status column should show a `last_launch_at` after a successful launch.
3. On quiz launch, UI should indicate AGS availability when the launch claim includes score scopes.

## Verify

1. Student: launch → quiz → submit → see score in EdVidura.
2. LMS gradebook for the activity shows the score.
3. If EdVidura shows “Not synced”: re-check Accept grades + activity grade settings; check app logs for AGS errors.

## Common failures

| Symptom | Likely cause |
| ------- | ------------ |
| Quiz works, LMS empty | Accept grades off, or activity not graded |
| Launch fails “Unknown platform” | Client ID / issuer mismatch in `/onboard` |
| Blank iframe | Tool still pointing at `host.docker.internal` for browser URLs — use `localhost` |
| Canvas cookie block | Prefer new-window launch |
| Sync queued forever | App restarted mid-AGS; resubmit or check grade_error on attempt |
