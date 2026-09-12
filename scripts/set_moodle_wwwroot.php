<?php
/**
 * Point Moodle wwwroot at a public HTTPS tunnel URL.
 * Usage: php /tmp/set_moodle_wwwroot.php https://xxx.trycloudflare.com
 */
define('CLI_SCRIPT', true);

$www = rtrim($argv[1] ?? '', '/');
if ($www === '' || !preg_match('#^https://#', $www)) {
    fwrite(STDERR, "usage: set_moodle_wwwroot.php https://xxx.trycloudflare.com\n");
    exit(1);
}

$cfgPath = '/var/www/html/config.php';
$text = file_get_contents($cfgPath);
if ($text === false) {
    fwrite(STDERR, "cannot read config.php\n");
    exit(1);
}

$n = 0;
$text2 = preg_replace(
    "/\\\$CFG->wwwroot\\s*=\\s*'[^']*';/",
    "\$CFG->wwwroot   = '{$www}';",
    $text,
    1,
    $n
);
if ($n !== 1) {
    fwrite(STDERR, "wwwroot replace failed\n");
    exit(1);
}

if (preg_match('/\\$CFG->sslproxy\\s*=/', $text2)) {
    $text2 = preg_replace(
        '/\\$CFG->sslproxy\\s*=\\s*[^;]*;/',
        '\$CFG->sslproxy = true;',
        $text2,
        1
    );
} else {
    $text2 = preg_replace(
        '/(\\$CFG->wwwroot\\s*=\\s*\'[^\']*\';)/',
        "\$CFG->sslproxy = true;\n\$1",
        $text2,
        1
    );
}

file_put_contents($cfgPath, $text2);

require $cfgPath;
require_once $CFG->libdir . '/adminlib.php';
purge_all_caches();

echo "wwwroot={$CFG->wwwroot}\n";
echo 'sslproxy=' . (!empty($CFG->sslproxy) ? 'true' : 'false') . "\n";
