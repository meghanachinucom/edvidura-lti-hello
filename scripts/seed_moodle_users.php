<?php
/**
 * Moodle logins for Riverside Classes 1–10 (+ Lakeside peer sample).
 *
 * Password for all demo users: Demo@12345
 * Site admin remains: admin / Admin@12345
 *
 * Run: php /tmp/seed_moodle_users.php
 */
define('CLI_SCRIPT', true);
require '/var/www/html/config.php';
require_once $CFG->libdir . '/clilib.php';
require_once $CFG->dirroot . '/user/lib.php';

$password = 'Demo@12345';

$teachers = [
    1 => ['riverside_c01_t', 'Priya', 'Sharma'],
    2 => ['riverside_c02_t', 'James', 'Cole'],
    3 => ['riverside_c03_t', 'Ana', 'Ruiz'],
    4 => ['riverside_c04_t', 'Omar', 'Haddad'],
    5 => ['riverside_c05_t', 'Helen', 'Park'],
    6 => ['riverside_c06_t', 'Mei', 'Chen'],
    7 => ['riverside_c07_t', 'Sam', 'Okonkwo'],
    8 => ['riverside_priya', 'Priya', 'Sharma'], // Class 8 lead (classic demo)
    9 => ['riverside_c09_t', 'Tom', 'Brooks'],
    10 => ['riverside_c10_t', 'Nina', 'Rossi'],
];

$users = [
    ['riverside_admin', 'Riverside', 'Admin', 'admin@riverside.test', 'schooladmin'],
    // Keep classic Class 8 students
    ['riverside_alice', 'Alice', 'Nguyen', 'alice.nguyen@riverside.test', 'student'],
    ['riverside_bob', 'Bob', 'Okonkwo', 'bob.okonkwo@riverside.test', 'student'],
    ['riverside_carol', 'Carol', 'Patel', 'carol.patel@riverside.test', 'student'],
    // Lakeside peer
    ['lakeside_admin', 'Lakeside', 'Admin', 'admin@lakeside.test', 'schooladmin'],
    ['lakeside_helen', 'Helen', 'Park', 'helen.park@lakeside.test', 'editingteacher'],
    ['lakeside_omar', 'Omar', 'Haddad', 'omar.haddad@lakeside.test', 'editingteacher'],
    ['lakeside_dana', 'Dana', 'Rivera', 'dana.rivera@lakeside.test', 'student'],
    ['lakeside_evan', 'Evan', 'Kim', 'evan.kim@lakeside.test', 'student'],
    ['lakeside_fay', 'Fay', 'Hassan', 'fay.hassan@lakeside.test', 'student'],
];

foreach ($teachers as $grade => [$username, $firstname, $lastname]) {
    $users[] = [
        $username,
        $firstname,
        $lastname,
        "c{$grade}.teacher@riverside.test",
        'editingteacher',
    ];
}

$first = ['Dev', 'Elena', 'Finn', 'Gita', 'Hugo', 'Ivy', 'Jon', 'Kira', 'Leo', 'Mira'];
$last = ['Singh', 'Costa', 'Nair', 'Frost', 'Walsh', 'Gupta', 'Diaz', 'Khan', 'Berg', 'Shaw'];
$si = 0;
for ($grade = 1; $grade <= 10; $grade++) {
    for ($n = 1; $n <= 5; $n++) {
        // Class 8 seats 1–3 already covered by alice/bob/carol
        if ($grade === 8 && $n <= 3) {
            continue;
        }
        $username = sprintf('riverside_c%02d_s%02d', $grade, $n);
        $fn = $first[$si % count($first)];
        $ln = $last[$si % count($last)];
        $si++;
        $users[] = [
            $username,
            $fn,
            $ln,
            sprintf('c%02d.s%02d@riverside.test', $grade, $n),
            'student',
        ];
    }
}

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
echo "SITE_ADMIN=admin / Admin@12345\n";
echo "CLASS_8_TEACHER=riverside_priya / {$password}\n";
echo "CLASS_8_STUDENT=riverside_alice / {$password}\n";
echo "Done.\n";
