# EdVidura Moodle theme

Boost child theme for **local demo Moodle only** (schools keep their own LMS theme).

- Amber primary `#fca311`
- Navy navbar `#14213d`
- Fonts: Syne + Outfit
- Polished login, course cards, LTI activity highlight, footer strip

Mounted at `public/theme/edvidura` (Moodle 5.x).

## Apply / polish

```powershell
cd moodle
docker compose up -d
docker cp .\polish_demo.php moodle-moodle-1:/tmp/polish_demo.php
docker exec moodle-moodle-1 php /var/www/html/admin/cli/upgrade.php --non-interactive
docker exec moodle-moodle-1 php /tmp/polish_demo.php
```

Or in Moodle: **Site administration → Appearance → Theme selector → EdVidura**.

Login: `admin` / `Admin@12345` → http://localhost:8085
