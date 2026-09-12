<?php
/**
 * Point all EdVidura LTI 1.3 tools (and their activities) at Railway.
 *
 * Usage (inside Moodle container):
 *   php /tmp/wire_moodle_to_railway.php [https://edvidura-app-production.up.railway.app]
 */
define('CLI_SCRIPT', true);
require '/var/www/html/config.php';

$base = rtrim($argv[1] ?? 'https://edvidura-app-production.up.railway.app', '/');
$host = parse_url($base, PHP_URL_HOST) ?: 'edvidura-app-production.up.railway.app';
$updated = 0;

$types = $DB->get_records('lti_types');
foreach ($types as $type) {
    $name = (string)$type->name;
    $baseurl = (string)$type->baseurl;
    $is_edvidura = (stripos($name, 'edvidura') !== false);
    $is_local = (
        strpos($baseurl, 'localhost:8000') !== false
        || strpos($baseurl, '127.0.0.1:8000') !== false
        || strpos($baseurl, 'host.docker.internal:8000') !== false
        || strpos($baseurl, 'edvidura-app-production.up.railway.app') !== false
    );
    if (!$is_edvidura && !$is_local) {
        continue;
    }

    $type->baseurl = $base . '/lti/launch';
    $type->tooldomain = $host;
    $type->timemodified = time();
    $DB->update_record('lti_types', $type);

    $map = [
        'toolurl' => $base . '/lti/launch',
        'securetoolurl' => $base . '/lti/launch',
        'initiatelogin' => $base . '/lti/login',
        'initiate_login_uri' => $base . '/lti/login',
        'redirectionuris' => $base . '/lti/launch',
        // Moodle fetches JWKS server-side; public HTTPS works from Docker.
        'publickeyset' => $base . '/.well-known/jwks.json',
    ];

    foreach ($map as $key => $value) {
        $row = $DB->get_record('lti_types_config', ['typeid' => $type->id, 'name' => $key]);
        if ($row) {
            $row->value = $value;
            $DB->update_record('lti_types_config', $row);
        } else {
            $DB->insert_record('lti_types_config', (object)[
                'typeid' => $type->id,
                'name' => $key,
                'value' => $value,
            ]);
        }
    }

    $acts = $DB->get_records('lti', ['typeid' => $type->id]);
    foreach ($acts as $act) {
        $act->toolurl = $base . '/lti/launch';
        $act->securetoolurl = '';
        $DB->update_record('lti', $act);
    }

    $updated++;
    echo "UPDATED id={$type->id} name={$name} clientid={$type->clientid}\n";
}

echo "DONE base={$base} updated={$updated}\n";

// Machine-readable list for platform seeding.
$out = [];
foreach ($DB->get_records('lti_types') as $type) {
    if (stripos((string)$type->name, 'edvidura') === false) {
        continue;
    }
    $out[] = [
        'id' => (int)$type->id,
        'name' => (string)$type->name,
        'clientid' => (string)$type->clientid,
        'baseurl' => (string)$type->baseurl,
    ];
}
echo 'JSON:' . json_encode($out) . "\n";
