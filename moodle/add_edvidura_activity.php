<?php
define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
require_once($CFG->dirroot . '/course/lib.php');
require_once($CFG->dirroot . '/course/modlib.php');

$courseid = (int)($argv[1] ?? 5);
$typeid = (int)($argv[2] ?? 5);

$course = $DB->get_record('course', ['id' => $courseid], '*', MUST_EXIST);
$type = $DB->get_record('lti_types', ['id' => $typeid], '*', MUST_EXIST);

// Ensure tool shows as its own tile in the activity chooser (2 = activity chooser).
$DB->set_field('lti_types', 'coursevisible', 2, ['id' => $typeid]);

if (!defined('LTI_LAUNCH_CONTAINER_NEW_WINDOW')) {
    define('LTI_LAUNCH_CONTAINER_NEW_WINDOW', 4);
}

$moduleid = $DB->get_field('modules', 'id', ['name' => 'lti'], MUST_EXIST);

$fromform = (object) [
    'course' => $courseid,
    'modulename' => 'lti',
    'modulenameplural' => 'ltis',
    'module' => $moduleid,
    'name' => 'Open EdVidura',
    'intro' => '<p>Launch EdVidura</p>',
    'introformat' => FORMAT_HTML,
    'typeid' => $typeid,
    'toolurl' => $type->baseurl,
    'securetoolurl' => '',
    'instructorchoicesendname' => 1,
    'instructorchoicesendemailaddr' => 1,
    'instructorchoiceacceptgrades' => 1,
    'instructorchoiceallowroster' => 0,
    'grade' => 100,
    'launchcontainer' => LTI_LAUNCH_CONTAINER_NEW_WINDOW,
    'resourcekey' => '',
    'password' => '',
    'debuglaunch' => 0,
    'showtitlelaunch' => 0,
    'showdescriptionlaunch' => 0,
    'servicesalt' => uniqid('ev', true),
    'section' => 0,
    'sectionreturn' => null,
    'visible' => 1,
    'visibleoncoursepage' => 1,
    'cmidnumber' => '',
    'groupmode' => 0,
    'groupingid' => 0,
    'availability' => null,
    'completion' => 0,
    'completionexpected' => 0,
    'downloadcontent' => 1,
];

$moduleinfo = add_moduleinfo($fromform, $course);
$cmid = is_object($moduleinfo) ? ($moduleinfo->coursemodule ?? $moduleinfo->id ?? '') : $moduleinfo;
echo "OK course={$courseid} tool={$type->name} cmid={$cmid}\n";
echo "Open: {$CFG->wwwroot}/mod/lti/view.php?id={$cmid}\n";
