<?php
/**
 * Create two site-level LTI 1.3 tools: Riverside + Lakeside.
 * Mirrors existing EdVidura Hello config.
 */
define('CLI_SCRIPT', true);
require '/var/www/html/config.php';
require_once $CFG->dirroot . '/mod/lti/locallib.php';

$base = 'http://localhost:8000';
$jwks = 'http://host.docker.internal:8000';
$now = time();

$tools = [
    [
        'name' => 'EdVidura Riverside',
        'description' => 'Riverside High — Algebra (Tenant A)',
    ],
    [
        'name' => 'EdVidura Lakeside',
        'description' => 'Lakeside Academy — Civics (Tenant B)',
    ],
];

$created = [];

foreach ($tools as $spec) {
    $existing = $DB->get_record('lti_types', ['name' => $spec['name']]);
    if ($existing) {
        echo "EXISTS name={$spec['name']} clientid={$existing->clientid} id={$existing->id}\n";
        $created[] = [
            'name' => $spec['name'],
            'clientid' => $existing->clientid,
            'id' => (int)$existing->id,
        ];
        continue;
    }

    $type = new stdClass();
    $type->name = $spec['name'];
    $type->baseurl = $base . '/lti/launch';
    $type->tooldomain = 'localhost:8000';
    $type->state = LTI_TOOL_STATE_CONFIGURED;
    $type->course = SITEID; // site-wide tool
    $type->coursevisible = 2; // show in activity chooser
    $type->ltiversion = '1.3.0';
    $type->clientid = null; // Moodle generates
    $type->description = $spec['description'];
    $type->createdby = 2; // admin
    $type->timecreated = $now;
    $type->timemodified = $now;

    $config = new stdClass();
    $config->lti_acceptgrades = LTI_SETTING_ALWAYS;
    $config->lti_contentitem = 0;
    $config->lti_coursevisible = 2;
    $config->lti_forcessl = 0;
    $config->lti_initiatelogin = $base . '/lti/login';
    $config->lti_keytype = 'JWK_KEYSET';
    $config->lti_launchcontainer = LTI_LAUNCH_CONTAINER_WINDOW;
    $config->ltiservice_gradesynchronization = 2;
    $config->ltiservice_memberships = 0;
    $config->ltiservice_toolsettings = 0;
    $config->lti_organizationid_default = 'SITEID';
    // Moodle (in Docker) fetches JWKS server-side — use host.docker.internal
    $config->lti_publickeyset = $jwks . '/.well-known/jwks.json';
    $config->lti_redirectionuris = $base . '/lti/launch';
    $config->lti_sendemailaddr = LTI_SETTING_ALWAYS;
    $config->lti_sendname = LTI_SETTING_ALWAYS;

    $typeid = lti_add_type($type, $config);
    $row = $DB->get_record('lti_types', ['id' => $typeid], '*', MUST_EXIST);
    echo "CREATED name={$row->name} clientid={$row->clientid} id={$row->id}\n";
    $created[] = [
        'name' => $row->name,
        'clientid' => $row->clientid,
        'id' => (int)$row->id,
    ];
}

// Print machine-readable JSON for the Python onboard step
echo 'JSON:' . json_encode($created) . "\n";
