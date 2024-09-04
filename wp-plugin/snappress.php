<?php
/*
Plugin Name: SnapPress
Description: This plugin is a companion to the SnapPress app. It primarily adds category support to media items in WordPress so that the SnapPress desktop app can better organize screenshots.
Version: 0.0.1
Author: shaunandrews
*/

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Add category support to attachments
function snappress_add_categories_to_attachments() {
    register_taxonomy_for_object_type('category', 'attachment');
}
add_action('init', 'snappress_add_categories_to_attachments');

// Check if "SnapPress" category exists, if not create it
function snappress_create_default_category() {
    $cat_name = 'SnapPress';
    if (!term_exists($cat_name, 'category')) {
        wp_insert_term(
            $cat_name,
            'category',
            array(
                'description' => 'Category for SnapPress screenshots',
                'slug' => 'snappress'
            )
        );
    }
}
add_action('init', 'snappress_create_default_category');

// Add category column to media library
function snappress_add_category_column($columns) {
    $columns['categories'] = __('Categories', 'snappress');
    return $columns;
}
add_filter('manage_media_columns', 'snappress_add_category_column');

// Display category information in the new column
function snappress_display_category_column($column_name, $post_id) {
    if ('categories' === $column_name) {
        $categories = get_the_category($post_id);
        if (!empty($categories)) {
            $output = array();
            foreach ($categories as $category) {
                $output[] = '<a href="' . esc_url(get_category_link($category->term_id)) . '">' . esc_html($category->name) . '</a>';
            }
            echo join(', ', $output);
        } else {
            echo '—';
        }
    }
}
add_action('manage_media_custom_column', 'snappress_display_category_column', 10, 2);

// Add settings page
function snappress_add_settings_page() {
    add_options_page('SnapPress Settings', 'SnapPress', 'manage_options', 'snappress-settings', 'snappress_settings_page');
}
add_action('admin_menu', 'snappress_add_settings_page');

// Settings page content
function snappress_settings_page() {
    ?>
    <div class="wrap">
        <h1>SnapPress Settings</h1>
        <form method="post" action="options.php">
            <?php
            settings_fields('snappress_options');
            do_settings_sections('snappress-settings');
            submit_button();
            ?>
        </form>
    </div>
    <?php
}

// Register settings
function snappress_register_settings() {
    register_setting('snappress_options', 'snappress_show_in_media_library');
    add_settings_section('snappress_main', 'Media Library Settings', null, 'snappress-settings');
    add_settings_field('snappress_show_in_media_library', 'Show SnapPress screenshots in the Media Library', 'snappress_show_in_media_library_callback', 'snappress-settings', 'snappress_main');
}
add_action('admin_init', 'snappress_register_settings');

// Checkbox callback
function snappress_show_in_media_library_callback() {
    $value = get_option('snappress_show_in_media_library', '1');
    echo '<input type="checkbox" name="snappress_show_in_media_library" value="1" ' . checked(1, $value, false) . '/>';
}

// Modify the media library query
function snappress_filter_media_library($query_args) {
    $show_snappress = get_option('snappress_show_in_media_library', '1');
    
    if ($show_snappress !== '1') {
        $snappress_category = get_term_by('name', 'SnapPress', 'category');
        if ($snappress_category) {
            if (!isset($query_args['tax_query'])) {
                $query_args['tax_query'] = array();
            }
            $query_args['tax_query'][] = array(
                'taxonomy' => 'category',
                'field' => 'term_id',
                'terms' => $snappress_category->term_id,
                'operator' => 'NOT IN'
            );
        }
    }
    
    return $query_args;
}
add_filter('ajax_query_attachments_args', 'snappress_filter_media_library');
