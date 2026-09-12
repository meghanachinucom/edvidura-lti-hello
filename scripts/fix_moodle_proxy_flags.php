<?php
define('CLI_SCRIPT', true);
$p = '/var/www/html/config.php';
$t = file_get_contents($p);
if ($t === false) {
    fwrite(STDERR, "read failed\n");
    exit(1);
}

if (preg_match('/\$CFG->reverseproxy\s*=/', $t)) {
    $t = preg_replace('/\$CFG->reverseproxy\s*=\s*[^;]*;/', '$CFG->reverseproxy = false;', $t, 1);
} else {
    $t = preg_replace(
        '/(\$CFG->sslproxy\s*=\s*[^;]*;)/',
        "$1\n\$CFG->reverseproxy = false;",
        $t,
        1
    );
}

// Ensure sslproxy stays true for HTTPS tunnel.
if (preg_match('/\$CFG->sslproxy\s*=/', $t)) {
    $t = preg_replace('/\$CFG->sslproxy\s*=\s*[^;]*;/', '$CFG->sslproxy = true;', $t, 1);
}

file_put_contents($p, $t);
require $p;
require_once $CFG->libdir . '/adminlib.php';
purge_all_caches();

echo 'wwwroot=' . $CFG->wwwroot . "\n";
echo 'sslproxy=' . (!empty($CFG->sslproxy) ? 'true' : 'false') . "\n";
echo 'reverseproxy=' . (!empty($CFG->reverseproxy) ? 'true' : 'false') . "\n";
