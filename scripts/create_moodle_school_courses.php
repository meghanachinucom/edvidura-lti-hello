<?php
/**
 * Create Riverside + Lakeside courses and place each EdVidura tool in them.
 */
define('CLI_SCRIPT', true);
require '/var/www/html/config.php';
require_once $CFG->dirroot . '/course/lib.php';
require_once $CFG->dirroot . '/mod/lti/lib.php';
require_once $CFG->dirroot . '/mod/lti/locallib.php';
require_once $CFG->libdir . '/phpunit/classes/util.php';

$specs = [
    [
        'shortname' => 'riverside',
        'fullname' => 'Riverside High',
        'toolname' => 'EdVidura Riverside',
        'activity' => 'Launch EdVidura (Riverside)',
    ],
    [
        'shortname' => 'lakeside',
        'fullname' => 'Lakeside Academy',
        'toolname' => 'EdVidura Lakeside',
        'activity' => 'Launch EdVidura (Lakeside)',
    ],
];

foreach ($specs as $spec) {
    $type = $DB->get_record('lti_types', ['name' => $spec['toolname']], '*', MUST_EXIST);

    $course = $DB->get_record('course', ['shortname' => $spec['shortname']]);
    if (!$course) {
        $data = new stdClass();
        $data->fullname = $spec['fullname'];
        $data->shortname = $spec['shortname'];
        $data->category = 1;
        $data->visible = 1;
        $data->format = 'topics';
        $data->numsections = 1;
        $course = create_course($data);
        echo "COURSE created {$course->shortname} id={$course->id}\n";
    } else {
        echo "COURSE exists {$course->shortname} id={$course->id}\n";
    }

    // Enrol admin as teacher for convenience
    if ($enrol = enrol_get_plugin('manual')) {
        $instances = enrol_get_instances($course->id, true);
        $manual = null;
        foreach ($instances as $instance) {
            if ($instance->enrol === 'manual') {
                $manual = $instance;
                break;
            }
        }
        if ($manual) {
            $teacherrole = $DB->get_record('role', ['shortname' => 'editingteacher'], '*', MUST_EXIST);
            $studentrole = $DB->get_record('role', ['shortname' => 'student'], '*', MUST_EXIST);
            $users = $DB->get_records_select(
                'user',
                "deleted = 0 AND username LIKE ?",
                [$spec['shortname'] . '_%']
            );
            foreach ($users as $u) {
                $roleid = (str_contains($u->username, '_admin') || str_contains($u->department ?? '', 'School Admin') || str_contains($u->department ?? '', 'Teacher'))
                    ? $teacherrole->id
                    : $studentrole->id;
                if (str_contains($u->username, '_priya') || str_contains($u->username, '_james')
                    || str_contains($u->username, '_helen') || str_contains($u->username, '_omar')
                    || str_contains($u->username, '_admin')) {
                    $roleid = $teacherrole->id;
                }
                if (str_contains($u->username, '_alice') || str_contains($u->username, '_bob')
                    || str_contains($u->username, '_carol') || str_contains($u->username, '_dana')
                    || str_contains($u->username, '_evan') || str_contains($u->username, '_fay')) {
                    $roleid = $studentrole->id;
                }
                $enrol->enrol_user($manual, $u->id, $roleid);
            }
            echo "Enrolled {$spec['shortname']}_* users into course\n";
        }
    }

    // Add LTI activity if missing
    $module = $DB->get_record('modules', ['name' => 'lti'], '*', MUST_EXIST);
    $existingcm = $DB->get_record_sql(
        "SELECT cm.id
           FROM {course_modules} cm
           JOIN {lti} l ON l.id = cm.instance
          WHERE cm.course = ? AND cm.module = ? AND l.typeid = ?",
        [$course->id, $module->id, $type->id]
    );
    if ($existingcm) {
        echo "ACTIVITY exists cm={$existingcm->id} for {$spec['toolname']}\n";
        continue;
    }

    $lti = new stdClass();
    $lti->course = $course->id;
    $lti->name = $spec['activity'];
    $lti->intro = $spec['activity'];
    $lti->introformat = FORMAT_HTML;
    $lti->typeid = $type->id;
    $lti->toolurl = $type->baseurl;
    $lti->securetoolurl = '';
    $lti->instructorchoicesendname = 1;
    $lti->instructorchoicesendemailaddr = 1;
    $lti->instructorchoiceacceptgrades = 1;
    $lti->grade = 100;
    $lti->launchcontainer = LTI_LAUNCH_CONTAINER_WINDOW;
    $lti->resourcekey = '';
    $lti->password = '';
    $lti->debuglaunch = 0;
    $lti->showtitlelaunch = 1;
    $lti->showdescriptionlaunch = 0;
    $lti->servicesalt = uniqid('', true);
    $lti->timecreated = time();
    $lti->timemodified = time();

    $ltiid = lti_add_instance($lti, null);

    $cm = new stdClass();
    $cm->course = $course->id;
    $cm->module = $module->id;
    $cm->instance = $ltiid;
    $cm->section = 0;
    $cm->idnumber = '';
    $cm->added = time();
    $cm->visible = 1;
    $cm->visibleoncoursepage = 1;
    $cm->groupmode = 0;
    $cm->groupingid = 0;
    $cm->completion = 0;
    $cmid = add_course_module($cm);
    course_add_cm_to_section($course, $cmid, 0);
    rebuild_course_cache($course->id, true);
    echo "ACTIVITY created cm={$cmid} lti={$ltiid} tool={$spec['toolname']}\n";
}

echo "Done.\n";
