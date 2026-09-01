<?php
defined('MOODLE_INTERNAL') || die();

$THEME->name = 'edvidura';
$THEME->parents = ['boost'];
$THEME->sheets = ['fonts'];
$THEME->editor_sheets = [];
$THEME->editor_scss = [];
$THEME->usefallback = true;
$THEME->scss = function ($theme) {
    return theme_edvidura_get_main_scss_content($theme);
};
$THEME->prescsscallback = 'theme_edvidura_get_pre_scss';
$THEME->extrascsscallback = 'theme_edvidura_get_extra_scss';
$THEME->precompiledcsscallback = 'theme_edvidura_get_precompiled_css';
$THEME->enable_dock = false;
$THEME->yuicssmodules = [];
$THEME->rendererfactory = 'theme_overridden_renderer_factory';
$THEME->requiredblocks = '';
$THEME->addblockposition = BLOCK_ADDBLOCK_POSITION_FLATNAV;
$THEME->iconsystem = \core\output\icon_system::FONTAWESOME;
$THEME->haseditswitch = true;
$THEME->usescourseindex = true;
