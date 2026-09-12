<?php
/**
 * Create Moodle courses Class 1 … Class 10, enrol Riverside users, add EdVidura LTI.
 *
 * Run inside Moodle container:
 *   php /tmp/create_moodle_classes_1_10.php
 */
define('CLI_SCRIPT', true);
require '/var/www/html/config.php';
require_once $CFG->dirroot . '/course/lib.php';
require_once $CFG->dirroot . '/mod/lti/lib.php';
require_once $CFG->dirroot . '/mod/lti/locallib.php';
require_once $CFG->libdir . '/enrollib.php';

$tool = $DB->get_record_sql(
    "SELECT * FROM {lti_types} WHERE ltiversion = ? ORDER BY id ASC LIMIT 1",
    ['1.3.0']
);
if (!$tool) {
    // Fall back to any EdVidura-named tool
    $tool = $DB->get_record_select('lti_types', "name LIKE ?", ['%EdVidura%'], '*', IGNORE_MISSING);
}
if (!$tool) {
    fwrite(STDERR, "No LTI 1.3 tool found. Register EdVidura in Moodle first.\n");
    exit(1);
}

$teacherrole = $DB->get_record('role', ['shortname' => 'editingteacher'], '*', MUST_EXIST);
$studentrole = $DB->get_record('role', ['shortname' => 'student'], '*', MUST_EXIST);
$enrolplugin = enrol_get_plugin('manual');

$subjects = [
    1 => 'English & Numbers',
    2 => 'Reading & Maths',
    3 => 'Language & Maths',
    4 => 'Science & Maths',
    5 => 'General Studies',
    6 => 'Middle School Core',
    7 => 'Pre-Algebra Path',
    8 => 'Algebra I',
    9 => 'Geometry Path',
    10 => 'Advanced Maths',
];

for ($grade = 1; $grade <= 10; $grade++) {
    $shortname = sprintf('class%02d', $grade);
    $fullname = "Class {$grade} · " . $subjects[$grade];
    $course = $DB->get_record('course', ['shortname' => $shortname]);
    if (!$course) {
        $data = new stdClass();
        $data->fullname = $fullname;
        $data->shortname = $shortname;
        $data->category = 1;
        $data->visible = 1;
        $data->format = 'topics';
        $data->numsections = 1;
        $course = create_course($data);
        echo "COURSE created {$shortname} id={$course->id}\n";
    } else {
        $course->fullname = $fullname;
        update_course($course);
        echo "COURSE exists {$shortname} id={$course->id} (title refreshed)\n";
    }

    // Enrol teacher + students for this grade
    if ($enrolplugin) {
        $instances = enrol_get_instances($course->id, true);
        $manual = null;
        foreach ($instances as $instance) {
            if ($instance->enrol === 'manual') {
                $manual = $instance;
                break;
            }
        }
        if ($manual) {
            $teacheruser = ($grade === 8)
                ? $DB->get_record('user', ['username' => 'riverside_priya', 'deleted' => 0])
                : $DB->get_record('user', [
                    'username' => sprintf('riverside_c%02d_t', $grade),
                    'deleted' => 0,
                ]);
            if ($teacheruser) {
                $enrolplugin->enrol_user($manual, $teacheruser->id, $teacherrole->id);
            }
            // Classic Class 8 students
            if ($grade === 8) {
                foreach (['riverside_alice', 'riverside_bob', 'riverside_carol'] as $uname) {
                    $u = $DB->get_record('user', ['username' => $uname, 'deleted' => 0]);
                    if ($u) {
                        $enrolplugin->enrol_user($manual, $u->id, $studentrole->id);
                    }
                }
            }
            for ($n = 1; $n <= 5; $n++) {
                if ($grade === 8 && $n <= 3) {
                    continue;
                }
                $uname = sprintf('riverside_c%02d_s%02d', $grade, $n);
                $u = $DB->get_record('user', ['username' => $uname, 'deleted' => 0]);
                if ($u) {
                    $enrolplugin->enrol_user($manual, $u->id, $studentrole->id);
                }
            }
            // School admin as teacher on all
            $admin = $DB->get_record('user', ['username' => 'riverside_admin', 'deleted' => 0]);
            if ($admin) {
                $enrolplugin->enrol_user($manual, $admin->id, $teacherrole->id);
            }
            echo "  Enrolled Class {$grade} people\n";
        }
    }

    // LTI activity
    $module = $DB->get_record('modules', ['name' => 'lti'], '*', MUST_EXIST);
    $existingcm = $DB->get_record_sql(
        "SELECT cm.id
           FROM {course_modules} cm
           JOIN {lti} l ON l.id = cm.instance
          WHERE cm.course = ? AND cm.module = ? AND l.typeid = ?",
        [$course->id, $module->id, $tool->id]
    );
    if ($existingcm) {
        echo "  ACTIVITY exists cm={$existingcm->id}\n";
        continue;
    }

    $lti = new stdClass();
    $lti->course = $course->id;
    $lti->name = "Open EdVidura (Class {$grade})";
    $lti->intro = "Launch EdVidura for Class {$grade}";
    $lti->introformat = FORMAT_HTML;
    $lti->typeid = $tool->id;
    $lti->toolurl = $tool->baseurl;
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
    echo "  ACTIVITY created cm={$cmid}\n";
}

echo "Done. Open Class 08 for Algebra LTI demo.\n";
