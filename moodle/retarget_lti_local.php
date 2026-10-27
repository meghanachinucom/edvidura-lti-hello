<?php
/**
 * Point all EdVidura LTI tool + activity URLs at local app (not Cloudflare / Railway).
 *
 *   docker cp moodle/retarget_lti_local.php moodle-moodle-1:/tmp/retarget_lti_local.php
 *   docker exec moodle-moodle-1 php /tmp/retarget_lti_local.php
 *
 * Optional: APP_BASE=http://localhost:8000
 */
define('CLI_SCRIPT', true);
require __DIR__ === '/tmp' ? '/var/www/html/config.php' : dirname(__DIR__) . '/config.php';

// When copied to /tmp inside container:
if (!isset($CFG)) {
    require '/var/www/html/config.php';
}

global $DB;

$base = rtrim(getenv('APP_BASE') ?: 'http://localhost:8000', '/');
$launch = $base . '/lti/launch';
$login = $base . '/lti/login';
$jwks = $base . '/.well-known/jwks.json';

echo "Retarget → {$base}\n";

$types = $DB->get_records_select('lti_types', "name ILIKE '%edvidura%' OR baseurl ILIKE '%railway%' OR baseurl ILIKE '%cloudflare%' OR baseurl ILIKE '%localhost:8000%'");
if (!$types) {
    $types = $DB->get_records('lti_types');
}

foreach ($types as $type) {
    $type->baseurl = $launch;
    $DB->update_record('lti_types', $type);
    echo "type {$type->id} {$type->name}\n";

    $map = [
        'toolurl' => $launch,
        'securetoolurl' => $launch,
        'initiate_login_uri' => $login,
        'initiatelogin' => $login,
        'redirectionuris' => $launch,
        'publickeyset' => $jwks,
        'toolurl_ContentItemSelectionRequest' => $launch,
        'tooldomain' => parse_url($base, PHP_URL_HOST) . (parse_url($base, PHP_URL_PORT) ? ':' . parse_url($base, PHP_URL_PORT) : ''),
    ];
    foreach ($map as $name => $value) {
        $row = $DB->get_record('lti_types_config', ['typeid' => $type->id, 'name' => $name]);
        if ($row) {
            $row->value = $value;
            $DB->update_record('lti_types_config', $row);
        } else {
            $DB->insert_record('lti_types_config', (object) [
                'typeid' => $type->id,
                'name' => $name,
                'value' => $value,
            ]);
        }
        echo "  {$name}={$value}\n";
    }
}

// Per-activity overrides (Class 8 etc. often store their own toolurl)
$acts = $DB->get_records_select(
    'lti',
    "name ILIKE '%edvidura%' OR toolurl ILIKE '%cloudflare%' OR toolurl ILIKE '%railway%' OR toolurl ILIKE '%localhost%' OR toolurl = '' OR toolurl IS NULL"
);
foreach ($acts as $act) {
    $changed = false;
    if (!empty($act->toolurl) && $act->toolurl !== $launch) {
        echo "act {$act->id} toolurl {$act->toolurl} → {$launch}\n";
        $act->toolurl = $launch;
        $changed = true;
    }
    if (property_exists($act, 'securetoolurl') && !empty($act->securetoolurl) && $act->securetoolurl !== $launch) {
        echo "act {$act->id} securetoolurl {$act->securetoolurl} → {$launch}\n";
        $act->securetoolurl = $launch;
        $changed = true;
    }
    // Also force blank toolurl activities that inherit type — still update if cloudflare in name context
    if ($changed) {
        $DB->update_record('lti', $act);
    }
}

// Force every EdVidura-named activity
foreach ($DB->get_records_select('lti', "name ILIKE '%edvidura%'") as $act) {
    $act->toolurl = $launch;
    if (property_exists($act, 'securetoolurl')) {
        $act->securetoolurl = $launch;
    }
    $DB->update_record('lti', $act);
    echo "forced act {$act->id} course={$act->course} {$act->name}\n";
}

echo "DONE\n";
echo "Class 8 launch: http://localhost:8085/mod/lti/view.php?id=24\n";
