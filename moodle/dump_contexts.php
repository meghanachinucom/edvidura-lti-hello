<?php
/**
 * Dump Moodle course shortname / id / context id for EdVidura binding.
 */
define('CLI_SCRIPT', true);
require '/var/www/html/config.php';

$rows = $DB->get_records_sql(
    "SELECT c.id AS course_id, c.shortname, c.fullname, ctx.id AS context_id
       FROM {course} c
       JOIN {context} ctx ON ctx.instanceid = c.id AND ctx.contextlevel = 50
      WHERE c.id > 1
      ORDER BY c.id ASC"
);

$out = [];
$map = [];
foreach ($rows as $r) {
    $out[] = [
        'course_id' => (int)$r->course_id,
        'shortname' => (string)$r->shortname,
        'fullname' => (string)$r->fullname,
        'context_id' => (int)$r->context_id,
    ];
    if (preg_match('/^class(\d{2})$/', (string)$r->shortname, $m)) {
        $grade = (int)$m[1];
        $map[(string)$r->context_id] = $grade;
        $map[(string)$r->course_id] = $grade;
        $map[(string)$r->shortname] = $grade;
    }
}
$pairs = [];
foreach ($map as $k => $g) {
    if (ctype_digit((string)$k)) {
        $pairs[] = "{$k}:{$g}";
    }
}
echo 'CONTEXTS_JSON:' . json_encode(['courses' => $out, 'seed_map' => $map]) . "\n";
echo 'SEED_MOODLE_CLASS_CONTEXTS=' . implode(',', $pairs) . "\n";
