<?php
/** Print shell export lines from DATABASE_URL. */
$u = getenv('DATABASE_URL') ?: '';
if ($u === '') {
    exit(0);
}
if (str_starts_with($u, 'postgres://')) {
    $u = 'postgresql://' . substr($u, strlen('postgres://'));
}
$p = parse_url($u);
if (!$p || empty($p['host'])) {
    exit(0);
}

$vars = [
    'DB_TYPE' => 'pgsql',
    'DB_HOST' => $p['host'],
    'DB_PORT' => (string) ($p['port'] ?? 5432),
    'DB_NAME' => ltrim($p['path'] ?? '/railway', '/') ?: 'railway',
    'DB_USER' => urldecode($p['user'] ?? 'moodle'),
    'DB_PASS' => urldecode($p['pass'] ?? ''),
];

foreach ($vars as $k => $v) {
    $v = str_replace(["\\", "'"], ["\\\\", "'\\''"], $v);
    echo "export {$k}='{$v}'\n";
}
