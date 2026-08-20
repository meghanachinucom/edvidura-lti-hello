<?php
/**
 * Enable sending name/email on all EdVidura LTI tools so launches get given_name/family_name.
 */
define('CLI_SCRIPT', true);
require '/var/www/html/config.php';
require_once $CFG->dirroot . '/mod/lti/locallib.php';

function edvidura_set_type_config(int $typeid, string $name, $value): void {
    $record = new stdClass();
    $record->typeid = $typeid;
    $record->name = $name;
    $record->value = (string)$value;
    lti_update_config($record);
}

$types = $DB->get_records_select(
    'lti_types',
    $DB->sql_like('name', ':n', false),
    ['n' => '%edvidura%']
);
if (!$types) {
    echo "No EdVidura LTI tools found.\n";
    exit(1);
}

foreach ($types as $type) {
    edvidura_set_type_config((int)$type->id, 'sendname', LTI_SETTING_ALWAYS);
    edvidura_set_type_config((int)$type->id, 'sendemailaddr', LTI_SETTING_ALWAYS);

    $DB->execute(
        "UPDATE {lti}
            SET instructorchoicesendname = ?, instructorchoicesendemailaddr = ?
          WHERE typeid = ?",
        [LTI_SETTING_ALWAYS, LTI_SETTING_ALWAYS, $type->id]
    );

    $cfg = lti_get_type_config($type->id);
    echo "Updated tool id={$type->id} name={$type->name}"
        . " sendname=" . ($cfg['sendname'] ?? '?')
        . " sendemailaddr=" . ($cfg['sendemailaddr'] ?? '?')
        . "\n";
}
echo "Done. Relaunch from Moodle to pick up given_name / family_name.\n";
