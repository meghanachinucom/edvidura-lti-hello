<?php
defined('MOODLE_INTERNAL') || die();

/**
 * Main SCSS for EdVidura Boost child theme.
 */
function theme_edvidura_get_main_scss_content($theme) {
    global $CFG;

    $scss = '';
    $filename = !empty($theme->settings->preset) ? $theme->settings->preset : null;
    $fs = get_file_storage();

    $context = context_system::instance();
    if ($filename == 'default.scss') {
        $scss .= file_get_contents($CFG->dirroot . '/theme/boost/scss/preset/default.scss');
    } else if ($filename == 'plain.scss') {
        $scss .= file_get_contents($CFG->dirroot . '/theme/boost/scss/preset/plain.scss');
    } else if ($filename && ($presetfile = $fs->get_file($context->id, 'theme_edvidura', 'preset', 0, '/', $filename))) {
        $scss .= $presetfile->get_content();
    } else {
        $scss .= file_get_contents($CFG->dirroot . '/theme/boost/scss/preset/default.scss');
    }

    $post = file_get_contents($CFG->dirroot . '/theme/edvidura/scss/post.scss');
    return $scss . "\n" . $post;
}

/**
 * Pre SCSS — brand tokens aligned with EdVidura shell.css
 */
function theme_edvidura_get_pre_scss($theme) {
    $scss = file_get_contents(__DIR__ . '/scss/pre.scss');

    $brandcolour = !empty($theme->settings->brandcolor) ? $theme->settings->brandcolor : '#fca311';
    $scss .= '$primary: ' . $brandcolour . ";\n";

    if (!empty($theme->settings->scsspre)) {
        $scss .= $theme->settings->scsspre;
    }
    return $scss;
}

/**
 * Extra SCSS from theme settings.
 */
function theme_edvidura_get_extra_scss($theme) {
    $content = '';
    if (!empty($theme->settings->scss)) {
        $content .= $theme->settings->scss;
    }
    return $content;
}

/**
 * Precompiled CSS fallback (Boost requirement).
 */
function theme_edvidura_get_precompiled_css() {
    global $CFG;
    $path = $CFG->dirroot . '/theme/boost/style/moodle.css';
    if (is_readable($path)) {
        return file_get_contents($path);
    }
    return '';
}
