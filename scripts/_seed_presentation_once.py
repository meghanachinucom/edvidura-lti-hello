import os, runpy
os.environ["MOODLE_ISSUER"] = "https://moodle-production-1516.up.railway.app"
os.environ["MOODLE_CLIENT_ID"] = "BKPKN9TJatibTdT"
os.environ["MOODLE_DEPLOYMENT_IDS"] = "1"
os.environ["MOODLE_AUTH_LOGIN_URL"] = "https://moodle-production-1516.up.railway.app/mod/lti/auth.php"
os.environ["MOODLE_AUTH_TOKEN_URL"] = "https://moodle-production-1516.up.railway.app/mod/lti/token.php"
os.environ["MOODLE_KEY_SET_URL"] = "https://moodle-production-1516.up.railway.app/mod/lti/certs.php"
os.environ["SEED_MOODLE_CLASS_CONTEXTS"] = "23:1,2:1,48:2,3:2,73:3,4:3,98:4,5:4,123:5,6:5,148:6,7:6,173:7,8:7,198:8,9:8,223:9,10:9,248:10,11:10"
os.environ["APP_BASE_URL"] = "https://edvidura-app-production.up.railway.app"
runpy.run_path(r"F:\edvidura-lti-hello\scripts\reset_seed_single_school.py", run_name="__main__")

