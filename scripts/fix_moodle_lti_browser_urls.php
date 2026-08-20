<?php
/**
 * Fix LTI tool URLs so the BROWSER uses localhost:8000
 * while Moodle (Docker) can still fetch JWKS via host.docker.internal.
 */
define('CLI_SCRIPT', true);
require '/var/www/html/config.php';

$browser = 'http://localhost:8000';
$docker = 'http://host.docker.internal:8000';
$updated = 0;

$types = $DB->get_records('lti_types');
foreach ($types as $type) {
    $name = (string)$type->name;
    if (stripos($name, 'edvidura') === false && stripos($name, 'edvidura') === false) {
        // still fix any tool pointing at host.docker.internal:8000
    }
    $baseurl = (string)$type->baseurl;
    if (
        strpos($baseurl, 'host.docker.internal:8000') === false
        && strpos($baseurl, 'localhost:8000') === false
        && strpos($baseurl, '127.0.0.1:8000') === false
    ) {
        continue;
    }

    $type->baseurl = $browser . '/lti/launch';
    $type->tooldomain = 'localhost:8000';
    $type->timemodified = time();
    $DB->update_record('lti_types', $type);

    $map = [
        'toolurl' => $browser . '/lti/launch',
        'securetoolurl' => $browser . '/lti/launch',
        'initiatelogin' => $browser . '/lti/login',
        'initiate_login_uri' => $browser . '/lti/login',
        'redirectionuris' => $browser . '/lti/launch',
        'publickeyset' => $docker . '/.well-known/jwks.json',
    ];

    foreach ($map as $key => $value) {
        $row = $DB->get_record('lti_types_config', ['typeid' => $type->id, 'name' => $key]);
        if ($row) {
            $row->value = $value;
            $DB->update_record('lti_types_config', $row);
        } else {
            $ins = (object)[
                'typeid' => $type->id,
                'name' => $key,
                'value' => $value,
            ];
            $DB->insert_record('lti_types_config', $ins);
        }
    }

    // Activity instances often copy toolurl — rewrite those too.
    $acts = $DB->get_records('lti', ['typeid' => $type->id]);
    foreach ($acts as $act) {
        $act->toolurl = $browser . '/lti/launch';
        $act->securetoolurl = '';
        $DB->update_record('lti', $act);
    }

    $updated++;
    echo "UPDATED tool id={$type->id} name={$name}\n";
}

echo "DONE updated={$updated}\n";
