<?php
defined('MOODLE_INTERNAL') || die();

if ($ADMIN->fulltree) {
    $settings = new theme_boost_admin_settingspage_tabs(
        'themesettingedvidura',
        get_string('configtitle', 'theme_edvidura')
    );

    $page = new admin_settingpage('theme_edvidura_general', get_string('generalsettings', 'theme_edvidura'));

    $name = 'theme_edvidura/preset';
    $title = get_string('preset', 'theme_edvidura');
    $description = get_string('preset_desc', 'theme_edvidura');
    $default = 'default.scss';
    $choices = ['default.scss' => 'default.scss', 'plain.scss' => 'plain.scss'];
    $setting = new admin_setting_configselect($name, $title, $description, $default, $choices);
    $setting->set_updatedcallback('theme_reset_all_caches');
    $page->add($setting);

    $name = 'theme_edvidura/brandcolor';
    $title = get_string('brandcolor', 'theme_edvidura');
    $description = get_string('brandcolor_desc', 'theme_edvidura');
    $setting = new admin_setting_configcolourpicker($name, $title, $description, '#fca311');
    $setting->set_updatedcallback('theme_reset_all_caches');
    $page->add($setting);

    $name = 'theme_edvidura/scsspre';
    $title = get_string('rawscsspre', 'theme_edvidura');
    $description = get_string('rawscsspre_desc', 'theme_edvidura');
    $setting = new admin_setting_scsscode($name, $title, $description, '', PARAM_RAW);
    $setting->set_updatedcallback('theme_reset_all_caches');
    $page->add($setting);

    $name = 'theme_edvidura/scss';
    $title = get_string('rawscss', 'theme_edvidura');
    $description = get_string('rawscss_desc', 'theme_edvidura');
    $setting = new admin_setting_scsscode($name, $title, $description, '', PARAM_RAW);
    $setting->set_updatedcallback('theme_reset_all_caches');
    $page->add($setting);

    $settings->add($page);
}
