<?php
/**
 * Plugin Name: SnapPress
 * Description: Companion plugin for the SnapPress Mac app, creating a custom post type for screenshots.
 * Version: 1.0
 * Author: Your Name
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Register Custom Post Type
function snappress_register_screenshot_post_type() {
    $labels = array(
        'name'                  => _x('Screenshots', 'Post Type General Name', 'snappress'),
        'singular_name'         => _x('Screenshot', 'Post Type Singular Name', 'snappress'),
        'menu_name'             => __('Screenshots', 'snappress'),
        'name_admin_bar'        => __('Screenshot', 'snappress'),
        'all_items'             => __('All Screenshots', 'snappress'),
        'add_new_item'          => __('Add New Screenshot', 'snappress'),
        'add_new'               => __('Add New', 'snappress'),
        'new_item'              => __('New Screenshot', 'snappress'),
        'edit_item'             => __('Edit Screenshot', 'snappress'),
        'update_item'           => __('Update Screenshot', 'snappress'),
        'view_item'             => __('View Screenshot', 'snappress'),
        'view_items'            => __('View Screenshots', 'snappress'),
        'search_items'          => __('Search Screenshot', 'snappress'),
        'not_found'             => __('Not found', 'snappress'),
        'not_found_in_trash'    => __('Not found in Trash', 'snappress'),
        'featured_image'        => __('Screenshot Image', 'snappress'),
        'set_featured_image'    => __('Set screenshot image', 'snappress'),
        'remove_featured_image' => __('Remove screenshot image', 'snappress'),
        'use_featured_image'    => __('Use as screenshot image', 'snappress'),
    );
    $args = array(
        'label'                 => __('Screenshot', 'snappress'),
        'description'           => __('Screenshots taken with SnapPress', 'snappress'),
        'labels'                => $labels,
        'supports'              => array('title', 'thumbnail'),
        'hierarchical'          => false,
        'public'                => true,
        'show_ui'               => true,
        'show_in_menu'          => true,
        'menu_position'         => 5,
        'menu_icon'             => 'dashicons-camera',
        'show_in_admin_bar'     => true,
        'show_in_nav_menus'     => true,
        'can_export'            => true,
        'has_archive'           => true,
        'exclude_from_search'   => false,
        'publicly_queryable'    => true,
        'capability_type'       => 'post',
        'show_in_rest'          => true,
    );
    register_post_type('screenshot', $args);
}
add_action('init', 'snappress_register_screenshot_post_type', 0);

// Customize columns in the admin list view
function snappress_customize_screenshot_columns($columns) {
    $columns = array(
        'cb' => $columns['cb'],
        'title' => __('Title', 'snappress'),
        'featured_image' => __('Screenshot', 'snappress'),
        'date' => __('Date', 'snappress'),
    );
    return $columns;
}
add_filter('manage_screenshot_posts_columns', 'snappress_customize_screenshot_columns');

// Populate custom columns in the admin list view
function snappress_populate_screenshot_columns($column, $post_id) {
    switch ($column) {
        case 'featured_image':
            if (has_post_thumbnail($post_id)) {
                echo get_the_post_thumbnail($post_id, array(50, 50));
            } else {
                echo __('No screenshot', 'snappress');
            }
            break;
    }
}
add_action('manage_screenshot_posts_custom_column', 'snappress_populate_screenshot_columns', 10, 2);
