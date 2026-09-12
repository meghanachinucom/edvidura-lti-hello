<?php
/**
 * Register EdVidura LTI 1.3 and seed a populated Riverside High demo.
 *
 * Env:
 *   EDVIDURA_BASE_URL  https://edvidura-app-production.up.railway.app
 *   DEMO_PASSWORD      default Demo@12345
 */
define('CLI_SCRIPT', true);
require '/var/www/html/config.php';
require_once $CFG->libdir . '/adminlib.php';
require_once $CFG->dirroot . '/user/lib.php';
require_once $CFG->dirroot . '/course/lib.php';
require_once $CFG->dirroot . '/mod/lti/lib.php';
require_once $CFG->dirroot . '/mod/lti/locallib.php';
require_once $CFG->libdir . '/enrollib.php';

$CFG->noemailever = true;

$edvidura = rtrim(getenv('EDVIDURA_BASE_URL') ?: 'https://edvidura-app-production.up.railway.app', '/');
$password = getenv('DEMO_PASSWORD') ?: 'Demo@12345';
$host = parse_url($edvidura, PHP_URL_HOST) ?: 'edvidura-app-production.up.railway.app';
$now = time();

set_config('fullname', 'Riverside High School');
set_config('shortname', 'Riverside');
set_config('theme', 'edvidura');
set_config('frontpage', 'availablecourse');
set_config('frontpageloggedin', 'mycourses,availablecourse');

$sitecourse = $DB->get_record('course', ['id' => SITEID], '*', MUST_EXIST);
$sitecourse->fullname = 'Riverside High School';
$sitecourse->shortname = 'Riverside';
$sitecourse->summary = '<p>Riverside High School · 2026–27. Launch <strong>EdVidura</strong> from any class.</p>';
$sitecourse->summaryformat = FORMAT_HTML;
$DB->update_record('course', $sitecourse);

function ev_ensure_user(string $username, string $firstname, string $lastname, string $email, string $dept, string $password): stdClass {
    global $DB, $CFG;
    $existing = $DB->get_record('user', ['username' => $username, 'deleted' => 0]);
    if ($existing) {
        $existing->firstname = $firstname;
        $existing->lastname = $lastname;
        $existing->email = $email;
        $existing->department = $dept;
        $existing->city = 'Riverside';
        $existing->country = 'US';
        user_update_user($existing, false, false);
        $user = $DB->get_record('user', ['id' => $existing->id], '*', MUST_EXIST);
        update_internal_user_password($user, $password);
        return $user;
    }
    $user = new stdClass();
    $user->auth = 'manual';
    $user->username = $username;
    $user->password = $password;
    $user->firstname = $firstname;
    $user->lastname = $lastname;
    $user->email = $email;
    $user->confirmed = 1;
    $user->mnethostid = $CFG->mnet_localhost_id;
    $user->department = $dept;
    $user->city = 'Riverside';
    $user->country = 'US';
    $id = user_create_user($user, false, false);
    $created = $DB->get_record('user', ['id' => $id], '*', MUST_EXIST);
    update_internal_user_password($created, $password);
    return $created;
}

function ev_ensure_category(string $idnumber, string $name, string $desc): int {
    global $DB;
    $row = $DB->get_record('course_categories', ['idnumber' => $idnumber]);
    if ($row) {
        return (int)$row->id;
    }
    $cat = core_course_category::create((object)[
        'name' => $name,
        'idnumber' => $idnumber,
        'description' => $desc,
        'descriptionformat' => FORMAT_PLAIN,
        'parent' => 0,
    ]);
    return (int)$cat->id;
}

function ev_ensure_lti_tool(string $name, string $description, string $base, string $host): stdClass {
    global $DB;
    $now = time();
    $existing = $DB->get_record('lti_types', ['name' => $name]);
    $type = new stdClass();
    $type->name = $name;
    $type->baseurl = $base . '/lti/launch';
    $type->tooldomain = $host;
    $type->state = LTI_TOOL_STATE_CONFIGURED;
    $type->course = SITEID;
    $type->coursevisible = 2;
    $type->ltiversion = '1.3.0';
    $type->description = $description;
    $type->createdby = 2;
    $type->timemodified = $now;

    $config = new stdClass();
    $config->lti_acceptgrades = LTI_SETTING_ALWAYS;
    $config->lti_contentitem = 0;
    $config->lti_coursevisible = 2;
    $config->lti_forcessl = 1;
    $config->lti_initiatelogin = $base . '/lti/login';
    $config->lti_keytype = 'JWK_KEYSET';
    $config->lti_launchcontainer = LTI_LAUNCH_CONTAINER_WINDOW;
    $config->ltiservice_gradesynchronization = 2;
    $config->ltiservice_memberships = 2;
    $config->ltiservice_toolsettings = 0;
    $config->lti_organizationid_default = 'SITEID';
    $config->lti_publickeyset = $base . '/.well-known/jwks.json';
    $config->lti_redirectionuris = $base . '/lti/launch';
    $config->lti_sendemailaddr = LTI_SETTING_ALWAYS;
    $config->lti_sendname = LTI_SETTING_ALWAYS;

    if ($existing) {
        $type->id = $existing->id;
        $type->clientid = $existing->clientid;
        lti_update_type($type, $config);
        echo "LTI updated id={$existing->id} name={$name} clientid={$existing->clientid}\n";
        return $DB->get_record('lti_types', ['id' => $existing->id], '*', MUST_EXIST);
    }
    $type->timecreated = $now;
    $type->clientid = null;
    $typeid = lti_add_type($type, $config);
    $row = $DB->get_record('lti_types', ['id' => $typeid], '*', MUST_EXIST);
    echo "LTI created id={$row->id} name={$name} clientid={$row->clientid}\n";
    return $row;
}

$tool = ev_ensure_lti_tool(
    'EdVidura',
    'Riverside High — EdVidura learning OS',
    $edvidura,
    $host
);

$lower = ev_ensure_category('rhs-lower', 'Lower School', 'Classes 1–5');
$middle = ev_ensure_category('rhs-middle', 'Middle School', 'Classes 6–8');
$upper = ev_ensure_category('rhs-upper', 'Upper School', 'Classes 9–10');
$cat_for = function (int $g) use ($lower, $middle, $upper): int {
    if ($g <= 5) {
        return $lower;
    }
    if ($g <= 8) {
        return $middle;
    }
    return $upper;
};

ev_ensure_user('riverside_admin', 'Alex', 'Morgan', 'admin@riverside.test', 'Office of the Principal', $password);
ev_ensure_user('riverside_office', 'Jordan', 'Ellis', 'office@riverside.test', 'School Office', $password);

$teachers = [
    1 => ['riverside_c01_t', 'Priya', 'Sharma', 'Maya', 'Singh'],
    2 => ['riverside_c02_t', 'James', 'Cole', 'Ruth', 'Adler'],
    3 => ['riverside_c03_t', 'Ana', 'Ruiz', 'Ken', 'Okada'],
    4 => ['riverside_c04_t', 'Omar', 'Haddad', 'Lila', 'Brooks'],
    5 => ['riverside_c05_t', 'Helen', 'Park', 'Chris', 'Ng'],
    6 => ['riverside_c06_t', 'Mei', 'Chen', 'Paul', 'Iyer'],
    7 => ['riverside_c07_t', 'Sam', 'Okonkwo', 'Nina', 'Voss'],
    8 => ['riverside_priya', 'Priya', 'Sharma', 'James', 'Cole'],
    9 => ['riverside_c09_t', 'Tom', 'Brooks', 'Helen', 'Park'],
    10 => ['riverside_c10_t', 'Nina', 'Rossi', 'Mei', 'Chen'],
];

$first = [
    'Ava', 'Noah', 'Mia', 'Liam', 'Zoe', 'Ethan', 'Aria', 'Kai', 'Luna', 'Owen',
    'Ivy', 'Leo', 'Nora', 'Hugo', 'Mira', 'Finn', 'Sana', 'Theo', 'Rita', 'Jules',
    'Elena', 'Dev', 'Gita', 'Jon', 'Kira', 'Yara', 'Omar', 'Pia',
];
$last = [
    'Singh', 'Costa', 'Nair', 'Frost', 'Walsh', 'Gupta', 'Diaz', 'Khan', 'Berg', 'Shaw',
    'Nguyen', 'Patel', 'Kim', 'Hassan', 'Rivera', 'Okeke', 'Chen', 'Ali', 'Novak', 'Reed',
];

$classic = [
    8 => [
        1 => ['riverside_alice', 'Alice', 'Nguyen'],
        2 => ['riverside_bob', 'Bob', 'Okonkwo'],
        3 => ['riverside_carol', 'Carol', 'Patel'],
    ],
];

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

$teacherrole = $DB->get_record('role', ['shortname' => 'editingteacher'], '*', MUST_EXIST);
$studentrole = $DB->get_record('role', ['shortname' => 'student'], '*', MUST_EXIST);
$enrolplugin = enrol_get_plugin('manual');
$module = $DB->get_record('modules', ['name' => 'lti'], '*', MUST_EXIST);

$si = 0;
$student_count = 0;
$per_class = 22;

foreach ($teachers as $grade => [$leaduser, $fn, $ln, $afn, $aln]) {
    ev_ensure_user($leaduser, $fn, $ln, "c{$grade}.teacher@riverside.test", 'Faculty', $password);
    $assist = sprintf('riverside_c%02d_a', $grade);
    ev_ensure_user($assist, $afn, $aln, "c{$grade}.assist@riverside.test", 'Faculty', $password);

    $shortname = sprintf('class%02d', $grade);
    $fullname = "Class {$grade} · {$subjects[$grade]}";
    $course = $DB->get_record('course', ['shortname' => $shortname]);
    if (!$course) {
        $data = new stdClass();
        $data->fullname = $fullname;
        $data->shortname = $shortname;
        $data->category = $cat_for($grade);
        $data->visible = 1;
        $data->format = 'topics';
        $data->numsections = 3;
        $data->summary = "Riverside High Class {$grade} ({$subjects[$grade]}). Term 2026–27.";
        $data->summaryformat = FORMAT_PLAIN;
        $course = create_course($data);
        echo "COURSE created {$shortname} id={$course->id}\n";
    } else {
        $course->fullname = $fullname;
        $course->category = $cat_for($grade);
        update_course($course);
        echo "COURSE exists {$shortname} id={$course->id}\n";
    }

    $manual = null;
    foreach (enrol_get_instances($course->id, true) as $instance) {
        if ($instance->enrol === 'manual') {
            $manual = $instance;
            break;
        }
    }

    if ($enrolplugin && $manual) {
        foreach ([$leaduser, $assist, 'riverside_admin'] as $uname) {
            $u = $DB->get_record('user', ['username' => $uname, 'deleted' => 0]);
            if ($u) {
                $enrolplugin->enrol_user($manual, $u->id, $teacherrole->id);
            }
        }
        for ($n = 1; $n <= $per_class; $n++) {
            if (isset($classic[$grade][$n])) {
                [$uname, $sfn, $sln] = $classic[$grade][$n];
            } else {
                $uname = sprintf('riverside_c%02d_s%02d', $grade, $n);
                $sfn = $first[$si % count($first)];
                $sln = $last[$si % count($last)];
                $si++;
            }
            $u = ev_ensure_user(
                $uname,
                $sfn,
                $sln,
                sprintf('c%02d.s%02d@riverside.test', $grade, $n),
                'Student',
                $password
            );
            $enrolplugin->enrol_user($manual, $u->id, $studentrole->id);
            $student_count++;
        }
        echo "  Enrolled Class {$grade} ({$per_class} students)\n";
    }

    $existingcm = $DB->get_record_sql(
        "SELECT cm.id
           FROM {course_modules} cm
           JOIN {lti} l ON l.id = cm.instance
          WHERE cm.course = ? AND cm.module = ? AND l.typeid = ?",
        [$course->id, $module->id, $tool->id]
    );
    if ($existingcm) {
        $acts = $DB->get_records('lti', ['typeid' => $tool->id, 'course' => $course->id]);
        foreach ($acts as $act) {
            $act->toolurl = $tool->baseurl;
            $act->securetoolurl = '';
            $DB->update_record('lti', $act);
        }
        echo "  ACTIVITY exists cm={$existingcm->id}\n";
        continue;
    }

    $lti = new stdClass();
    $lti->course = $course->id;
    $lti->name = "Open EdVidura (Class {$grade})";
    $lti->intro = "Launch the Riverside learning OS for Class {$grade}.";
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
    $lti->timecreated = $now;
    $lti->timemodified = $now;
    $ltiid = lti_add_instance($lti, null);
    $cm = new stdClass();
    $cm->course = $course->id;
    $cm->module = $module->id;
    $cm->instance = $ltiid;
    $cm->section = 0;
    $cm->idnumber = '';
    $cm->added = $now;
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

$DB->execute(
    "UPDATE {lti}
        SET instructorchoicesendname = ?, instructorchoicesendemailaddr = ?
      WHERE typeid = ?",
    [LTI_SETTING_ALWAYS, LTI_SETTING_ALWAYS, $tool->id]
);

purge_all_caches();

$out = [
    'wwwroot' => $CFG->wwwroot,
    'edvidura' => $edvidura,
    'tool' => [
        'id' => (int)$tool->id,
        'name' => $tool->name,
        'clientid' => $tool->clientid,
        'baseurl' => $tool->baseurl,
    ],
    'students_seeded' => $student_count,
    'classes' => 10,
    'demo_password' => $password,
];
echo 'JSON:' . json_encode($out) . "\n";
echo "Done. Class 8 teacher riverside_priya / {$password}; student riverside_alice / {$password}\n";
