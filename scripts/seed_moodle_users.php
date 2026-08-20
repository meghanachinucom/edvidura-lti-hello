<?php
/**
 * Moodle logins for the school hierarchy demo.
 *
 * Moodle site admin (admin) creates schools/tools.
 * Each school has its own admin + teachers + students.
 *
 * Run: php /tmp/seed_moodle_users.php
 */
define('CLI_SCRIPT', true);
require '/var/www/html/config.php';
require_once $CFG->libdir . '/clilib.php';
require_once $CFG->dirroot . '/user/lib.php';

$password = 'Demo@12345';

$users = [
    // Riverside High — school admin, teachers, students
    ['riverside_admin', 'Riverside', 'Admin', 'admin@riverside.test', 'schooladmin'],
    ['riverside_priya', 'Priya', 'Sharma', 'priya.sharma@riverside.test', 'editingteacher'],
    ['riverside_james', 'James', 'Cole', 'james.cole@riverside.test', 'editingteacher'],
    ['riverside_alice', 'Alice', 'Nguyen', 'alice.nguyen@riverside.test', 'student'],
    ['riverside_bob', 'Bob', 'Okonkwo', 'bob.okonkwo@riverside.test', 'student'],
    ['riverside_carol', 'Carol', 'Patel', 'carol.patel@riverside.test', 'student'],

    // Lakeside Academy — school admin, teachers, students
    ['lakeside_admin', 'Lakeside', 'Admin', 'admin@lakeside.test', 'schooladmin'],
    ['lakeside_helen', 'Helen', 'Park', 'helen.park@lakeside.test', 'editingteacher'],
    ['lakeside_omar', 'Omar', 'Haddad', 'omar.haddad@lakeside.test', 'editingteacher'],
    ['lakeside_dana', 'Dana', 'Rivera', 'dana.rivera@lakeside.test', 'student'],
    ['lakeside_evan', 'Evan', 'Kim', 'evan.kim@lakeside.test', 'student'],
    ['lakeside_fay', 'Fay', 'Hassan', 'fay.hassan@lakeside.test', 'student'],
];

foreach ($users as [$username, $firstname, $lastname, $email, $rolehint]) {
    $existing = $DB->get_record('user', ['username' => $username, 'deleted' => 0]);
    if ($existing) {
        $existing->firstname = $firstname;
        $existing->lastname = $lastname;
        $existing->email = $email;
        $existing->department = ($rolehint === 'schooladmin') ? 'School Admin' : (
            ($rolehint === 'editingteacher') ? 'Teacher' : 'Student'
        );
        user_update_user($existing, false, false);
        $user = $DB->get_record('user', ['id' => $existing->id], '*', MUST_EXIST);
        update_internal_user_password($user, $password);
        echo "Updated {$username} ({$rolehint})\n";
        continue;
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
    $user->department = ($rolehint === 'schooladmin') ? 'School Admin' : (
        ($rolehint === 'editingteacher') ? 'Teacher' : 'Student'
    );
    $user->city = 'Demo';
    $user->country = 'US';

    $id = user_create_user($user, true, false);
    echo "Created {$username} id={$id} ({$rolehint})\n";
}

echo "PASSWORD_FOR_ALL={$password}\n";
echo "SITE_ADMIN=admin / Admin@12345 (creates schools)\n";
echo "Done.\n";
