<?php
/**
 * Polish local demo Moodle for EdVidura LTI testing.
 *
 * - Site name / shortname (config + front page course)
 * - Force EdVidura theme
 * - LTI 1.3 tools: show in activity chooser (coursevisible=2)
 * - Purge caches
 *
 * Usage (inside container):
 *   php /tmp/polish_demo.php
 */
define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
require_once($CFG->libdir . '/adminlib.php');

$fullname = getenv('EDVIDURA_MOODLE_FULLNAME') ?: 'EdVidura Dev Moodle';
$shortname = getenv('EDVIDURA_MOODLE_SHORTNAME') ?: 'EdVidura';

set_config('fullname', $fullname);
set_config('shortname', $shortname);
set_config('theme', 'edvidura');

// Front page: show available courses (helpful for demos).
set_config('frontpage', 'availablecourse');
set_config('frontpageloggedin', 'mycourses,availablecourse');

// Site home course row (what the navbar often displays).
$sitecourse = $DB->get_record('course', ['id' => SITEID], '*', MUST_EXIST);
$sitecourse->fullname = $fullname;
$sitecourse->shortname = $shortname;
$sitecourse->summary = '<p>Local Moodle for EdVidura LTI launches. Teachers add <strong>EdVidura</strong> from the activity chooser.</p>';
$sitecourse->summaryformat = FORMAT_HTML;
$DB->update_record('course', $sitecourse);

// Moodle: 0=hidden, 1=preconfigured only, 2=own tile in activity chooser.
$DB->set_field_select('lti_types', 'coursevisible', 2, "ltiversion = ?", ['1.3.0']);

purge_all_caches();

$theme = get_config('core', 'theme');
$tools = $DB->get_records('lti_types', null, 'id ASC', 'id,name,coursevisible,state');

echo "OK polished Moodle demo\n";
echo "  site: {$fullname} ({$shortname})\n";
echo "  theme: {$theme}\n";
echo "  wwwroot: {$CFG->wwwroot}\n";
foreach ($tools as $t) {
    echo "  LTI tool #{$t->id} {$t->name} visible={$t->coursevisible} state={$t->state}\n";
}
echo "Open: {$CFG->wwwroot}/\n";
