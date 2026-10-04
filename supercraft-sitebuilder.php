<?php
/**
 * Plugin Name: Supercraft SiteBuilder
 * Description: Human-guided AI website builder child plugin for Supercraft Master Plugin ecosystem.
 * Version: 1.0.28
 * Author: Supercraft
 * Text Domain: supercraft-sitebuilder
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

define('SUPERCRAFT_SITEBUILDER_VERSION', '1.0.28');
define('SUPERCRAFT_SITEBUILDER_PATH', plugin_dir_path(__FILE__));
define('SUPERCRAFT_SITEBUILDER_URL', plugin_dir_url(__FILE__));

// Production default endpoint vs Local Dev override
if (defined('SUPERCRAFT_SUPERAPP_URL')) {
    $endpoint = SUPERCRAFT_SUPERAPP_URL;
} elseif (defined('SUPERCRAFT_LOCAL_DEV') && SUPERCRAFT_LOCAL_DEV) {
    $endpoint = (file_exists('/.dockerenv') || getenv('WORDPRESS_DB_HOST')) ? 'http://host.docker.internal:3000/api/sitebuilder' : 'http://localhost:3000/api/sitebuilder';
} else {
    $endpoint = 'https://superapp.supercraft.my/api/sitebuilder';
}

define('SUPERCRAFT_SUPERAPP_ENDPOINT', $endpoint);

/**
 * GitHub Auto-Update Checker
 */
if (file_exists(SUPERCRAFT_SITEBUILDER_PATH . 'plugin-update-checker/plugin-update-checker.php')) {
    require_once SUPERCRAFT_SITEBUILDER_PATH . 'plugin-update-checker/plugin-update-checker.php';
    $supercraft_sitebuilder_update_checker = YahnisElsts\PluginUpdateChecker\v5\PucFactory::buildUpdateChecker(
        'https://github.com/lynesslim/supercraft-sitebuilder/',
        __FILE__,
        'supercraft-sitebuilder'
    );
    $supercraft_sitebuilder_update_checker->setBranch('main');
}

/**
 * License Validation Helper Function
 */
function supercraft_sitebuilder_is_validated() {
    if (defined('SUPERCRAFT_SITEBUILDER_ALLOW_UNVALIDATED') && SUPERCRAFT_SITEBUILDER_ALLOW_UNVALIDATED) {
        return true;
    }
    $local_status = get_option('supercraft_sitebuilder_validation_status', 'not_set') === 'valid';
    return apply_filters('supercraft_is_plugin_validated', $local_status, 'supercraft-sitebuilder');
}

/**
 * Admin Menu Registration (Priority 20 to run AFTER Master Plugin)
 */
add_action('admin_menu', 'supercraft_sitebuilder_admin_menu', 20);

function supercraft_sitebuilder_admin_menu() {
    global $menu;

    $supercraft_parent_slug = '';
    if (is_array($menu)) {
        foreach ($menu as $item) {
            if (isset($item[0]) && strpos($item[0], 'Supercraft') !== false) {
                $supercraft_parent_slug = isset($item[2]) ? $item[2] : '';
                break;
            }
        }
    }

    if ($supercraft_parent_slug) {
        $page_hook = add_submenu_page(
            $supercraft_parent_slug,
            'AI SiteBuilder',
            'AI SiteBuilder',
            'manage_options',
            'supercraft-sitebuilder',
            'supercraft_sitebuilder_render_admin_page'
        );
    } else {
        $page_hook = add_menu_page(
            'Supercraft SiteBuilder',
            'Supercraft Builder',
            'manage_options',
            'supercraft-sitebuilder',
            'supercraft_sitebuilder_render_admin_page',
            'dashicons-layout',
            80
        );
    }

    add_action('admin_print_styles-' . $page_hook, function() {
        wp_enqueue_style(
            'supercraft-admin-sitebuilder-css',
            SUPERCRAFT_SITEBUILDER_URL . 'assets/css/admin-sitebuilder.css',
            [],
            SUPERCRAFT_SITEBUILDER_VERSION
        );
    });
}

/**
 * Helper to organize sitemap into Root Pages and nested Subpages
 */
function supercraft_sitebuilder_build_tree($pages) {
    $roots = [];
    $subs = [];

    foreach ($pages as $idx => $page) {
        $node = [
            'idx'      => $idx,
            'page'     => $page,
            'subpages' => []
        ];

        $p_slug = trim(trim($page['parent_slug'] ?? '', '/'));
        if (empty($p_slug)) {
            $roots[] = $node;
        } else {
            $subs[] = $node;
        }
    }

    $orphans = [];
    foreach ($subs as $subNode) {
        $target_parent = trim(trim($subNode['page']['parent_slug'] ?? '', '/'));
        $matched = false;
        foreach ($roots as &$rootNode) {
            $root_slug = trim(trim($rootNode['page']['slug'] ?? '', '/'));
            if ($root_slug === $target_parent) {
                $rootNode['subpages'][] = $subNode;
                $matched = true;
                break;
            }
        }
        unset($rootNode);

        if (!$matched) {
            $orphans[] = $subNode;
        }
    }

    return ['roots' => $roots, 'orphans' => $orphans];
}

/**
 * Helper to enable Elementor editing mode on a page
 */
function supercraft_sitebuilder_enable_elementor($page_id) {
    if (!$page_id) return;
    update_post_meta($page_id, '_elementor_edit_mode', 'builder');
    update_post_meta($page_id, '_elementor_template_type', 'wp-page');
    update_post_meta($page_id, '_wp_page_template', 'elementor_header_footer');
    if (!get_post_meta($page_id, '_elementor_data', true)) {
        update_post_meta($page_id, '_elementor_data', '[]');
    }
    if (class_exists('\Elementor\Plugin')) {
        \Elementor\Plugin::$instance->db->set_is_elementor_page($page_id);
    }
}

/**
 * Admin Dashboard Page Renderer
 */
function supercraft_sitebuilder_render_admin_page() {
    if (!current_user_can('manage_options')) {
        wp_die(esc_html__('You do not have sufficient permissions to access this page.', 'supercraft-sitebuilder'));
    }

    $is_master_active = has_filter('supercraft_is_plugin_validated');
    $is_validated = supercraft_sitebuilder_is_validated();

    if (!$is_validated) {
        ?>
        <div class="wrap supercraft-sitebuilder-wrap" style="max-width:800px; margin-top:20px;">
            <h1>Supercraft AI SiteBuilder</h1>
            <div class="notice notice-error" style="background:#fff; border-left:4px solid #ef4444; padding:20px 24px; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.05); margin-top:16px;">
                <h3 style="margin-top:0; color:#b91c1c; font-size:16px;">⚠️ Supercraft License Required</h3>
                <p style="font-size:13px; color:#334155; line-height:1.6; margin-bottom:16px;">
                    Supercraft AI SiteBuilder is a premium module and requires an active validated license managed through the <strong>Supercraft Master Plugin</strong>.
                </p>
                <a href="<?php echo esc_url(admin_url('admin.php?page=supercraft-master')); ?>" class="button button-primary button-large" style="background:#4f46e5; border-color:#4338ca;">
                    Open Supercraft Master Plugin Dashboard &rarr;
                </a>
            </div>
        </div>
        <?php
        return;
    }

    $status = get_option('supercraft_sitebuilder_validation_status', 'not_set');
    
    // Handle clearing the last generation or business context
    if (isset($_GET['action']) && $_GET['action'] === 'new_sitemap') {
        delete_option('supercraft_sitebuilder_last_generation');
        wp_safe_redirect(admin_url('admin.php?page=supercraft-sitebuilder'));
        exit;
    }
    if (isset($_GET['action']) && $_GET['action'] === 'clear_context') {
        delete_option('supercraft_business_context');
        wp_safe_redirect(admin_url('admin.php?page=supercraft-sitebuilder'));
        exit;
    }

    $message = '';
    $parsed_sitemap_review = null;
    $created_pages_summary = [];

    // Stage 1: Document Upload & AI Parsing via Superapp
    if (isset($_POST['supercraft_parse_doc']) && check_admin_referer('supercraft_sitebuilder_action')) {
        $has_file = isset($_FILES['copywriter_file']) && !empty($_FILES['copywriter_file']['tmp_name']) && is_uploaded_file($_FILES['copywriter_file']['tmp_name']);
        $raw_text = isset($_POST['copywriter_doc']) ? sanitize_textarea_field($_POST['copywriter_doc']) : '';

        $selected_model = defined('SUPERCRAFT_SITEBUILDER_MODEL') ? SUPERCRAFT_SITEBUILDER_MODEL : 'gpt-5.4-nano-2026-03-17';
        $sitebuilder_mode = isset($_POST['sitebuilder_mode']) && $_POST['sitebuilder_mode'] === 'context_only' ? 'context_only' : 'full';

        if ($has_file) {
            // Forward raw file bytes via multipart/form-data so Mammoth & pdf-parse handle extraction
            $boundary = wp_generate_password(24, false);
            $filename = basename($_FILES['copywriter_file']['name']);
            $filetype = wp_check_filetype($filename);
            $mime     = $filetype['type'] ? $filetype['type'] : 'application/octet-stream';
            $filedata = file_get_contents($_FILES['copywriter_file']['tmp_name']);

            $body  = "--{$boundary}\r\n";
            $body .= "Content-Disposition: form-data; name=\"file\"; filename=\"{$filename}\"\r\n";
            $body .= "Content-Type: {$mime}\r\n\r\n";
            $body .= $filedata . "\r\n";
            $body .= "--{$boundary}\r\n";
            $body .= "Content-Disposition: form-data; name=\"model\"\r\n\r\n";
            $body .= $selected_model . "\r\n";
            $body .= "--{$boundary}\r\n";
            $body .= "Content-Disposition: form-data; name=\"mode\"\r\n\r\n";
            $body .= $sitebuilder_mode . "\r\n";
            $body .= "--{$boundary}--\r\n";

            $response = wp_remote_post(SUPERCRAFT_SUPERAPP_ENDPOINT . '/parse-doc', [
                'headers' => ['content-type' => 'multipart/form-data; boundary=' . $boundary],
                'body'    => $body,
                'timeout' => 60,
            ]);
        } elseif (!empty($raw_text)) {
            // Forward pasted text via JSON
            $response = wp_remote_post(SUPERCRAFT_SUPERAPP_ENDPOINT . '/parse-doc', [
                'headers' => ['Content-Type' => 'application/json'],
                'body'    => wp_json_encode([
                    'document_text' => $raw_text,
                    'model'         => $selected_model,
                    'mode'          => $sitebuilder_mode,
                ]),
                'timeout' => 60,
            ]);
        } else {
            $message = "<div class='notice notice-error'><p>" . esc_html__('Please select a file or paste text to parse.', 'supercraft-sitebuilder') . "</p></div>";
        }

        if (isset($response)) {
            if (!is_wp_error($response)) {
                $body_data = json_decode(wp_remote_retrieve_body($response), true);
                
                // Store business context globally whenever returned
                if (isset($body_data['business_context']) && is_array($body_data['business_context'])) {
                    update_option('supercraft_business_context', $body_data['business_context']);
                }

                if ($sitebuilder_mode === 'context_only') {
                    if (isset($body_data['business_context'])) {
                        $biz = $body_data['business_context'];
                        $biz_name = esc_html($biz['business_name'] ?? 'Your Business');
                        $svc_count = isset($biz['services']) && is_array($biz['services']) ? count($biz['services']) : 0;
                        $message = "<div class='notice notice-success is-dismissible'><p>✨ <strong>Business Context Successfully Extracted & Stored!</strong> Profile for <strong>{$biz_name}</strong> ({$svc_count} services) is now active site-wide. You can now edit any page in Elementor, right-click on any section, and choose <strong>✨ Supercraft Adapt Copy</strong> to generate copy from instructions.</p></div>";
                    } else {
                        $err_details = isset($body_data['error']) ? esc_html($body_data['error']) : 'Failed to extract business context';
                        $message = "<div class='notice notice-error'><p>API Error: {$err_details}</p></div>";
                    }
                } else {
                    if (isset($body_data['sitemap']) && is_array($body_data['sitemap'])) {
                        $parsed_sitemap_review = $body_data['sitemap'];
                        $message = "<div class='notice notice-info'><p>" . esc_html__('AI successfully parsed the sitemap tree & subpages. Please review, edit, or select the pages below before confirming generation.', 'supercraft-sitebuilder') . "</p></div>";
                    } else {
                        $err_details = isset($body_data['error']) ? esc_html($body_data['error']) : 'Invalid JSON response from server';
                        $message = "<div class='notice notice-error'><p>API Response Error: {$err_details}</p></div>";
                    }
                }
            } else {
                $err_msg = esc_html($response->get_error_message());
                $message = "<div class='notice notice-error'><p>Failed to connect to superapp endpoint (" . esc_html(SUPERCRAFT_SUPERAPP_ENDPOINT) . "): {$err_msg}</p></div>";
            }
        }
    }

    // Stage 2 (Human in the Loop Confirmed): Create Selected WordPress Draft Pages with Parent/Child Hierarchy
    if (isset($_POST['supercraft_confirm_pages']) && check_admin_referer('supercraft_sitebuilder_action')) {
        $confirmed_pages = isset($_POST['pages']) && is_array($_POST['pages']) ? $_POST['pages'] : [];
        $created_count = 0;
        $created_page_ids_by_slug = [];

        // First pass: Create parent pages (parent_slug empty/null)
        foreach ($confirmed_pages as $idx => $page) {
            if (empty($page['create']) || $page['create'] !== '1') continue;

            $parent_slug = !empty($page['parent_slug']) ? sanitize_title($page['parent_slug']) : '';
            if (!empty($parent_slug)) continue;

            $page_title = sanitize_text_field($page['title'] ?? 'Untitled Page');
            $page_slug  = sanitize_title($page['slug'] ?? $page_title);
            $sections   = isset($page['sections_json']) ? json_decode(stripslashes($page['sections_json']), true) : [];

            $existing = get_page_by_path($page_slug);
            $page_id = $existing ? $existing->ID : 0;

            if (!$page_id) {
                $page_id = wp_insert_post([
                    'post_title'  => $page_title,
                    'post_name'   => $page_slug,
                    'post_status' => 'draft',
                    'post_type'   => 'page',
                ]);
            }

            if ($page_id && !is_wp_error($page_id)) {
                update_post_meta($page_id, '_supercraft_section_copy', wp_json_encode($sections));
                supercraft_sitebuilder_enable_elementor($page_id);
                $created_page_ids_by_slug[$page_slug] = $page_id;
                $created_count++;

                $created_pages_summary[] = [
                    'id'          => $page_id,
                    'title'       => $page_title,
                    'slug'        => $page_slug,
                    'parent_slug' => '',
                    'sec_count'   => count($sections),
                    'edit_url'    => admin_url('post.php?post=' . $page_id . '&action=elementor'),
                ];
            }
        }

        // Second pass: Create child subpages with post_parent linked
        foreach ($confirmed_pages as $idx => $page) {
            if (empty($page['create']) || $page['create'] !== '1') continue;

            $parent_slug = !empty($page['parent_slug']) ? sanitize_title($page['parent_slug']) : '';
            if (empty($parent_slug)) continue;

            $page_title = sanitize_text_field($page['title'] ?? 'Untitled Page');
            $page_slug  = sanitize_title($page['slug'] ?? $page_title);
            $sections   = isset($page['sections_json']) ? json_decode(stripslashes($page['sections_json']), true) : [];

            // Resolve parent ID
            $parent_id = isset($created_page_ids_by_slug[$parent_slug]) ? $created_page_ids_by_slug[$parent_slug] : 0;
            if (!$parent_id) {
                $existing_parent = get_page_by_path($parent_slug);
                if ($existing_parent) {
                    $parent_id = $existing_parent->ID;
                }
            }

            $existing = get_page_by_path(($parent_slug ? $parent_slug . '/' : '') . $page_slug);
            $page_id = $existing ? $existing->ID : 0;

            if (!$page_id) {
                $page_id = wp_insert_post([
                    'post_title'   => $page_title,
                    'post_name'    => $page_slug,
                    'post_parent'  => $parent_id,
                    'post_status'  => 'draft',
                    'post_type'    => 'page',
                ]);
            }

            if ($page_id && !is_wp_error($page_id)) {
                update_post_meta($page_id, '_supercraft_section_copy', wp_json_encode($sections));
                supercraft_sitebuilder_enable_elementor($page_id);
                $created_count++;

                $created_pages_summary[] = [
                    'id'          => $page_id,
                    'title'       => $page_title,
                    'slug'        => ($parent_slug ? $parent_slug . '/' : '') . $page_slug,
                    'parent_slug' => $parent_slug,
                    'sec_count'   => count($sections),
                    'edit_url'    => admin_url('post.php?post=' . $page_id . '&action=elementor'),
                ];
            }
        }

        if (!empty($created_pages_summary)) {
            update_option('supercraft_sitebuilder_last_generation', $created_pages_summary);
        }

        $message = "<div class='notice notice-success'><p>" . sprintf(esc_html__('Human Review Complete! Successfully created %d confirmed WordPress pages and subpages.', 'supercraft-sitebuilder'), $created_count) . "</p></div>";
    }

    // Load persisted generation so the table stays visible even after page refresh
    if (empty($created_pages_summary) && empty($parsed_sitemap_review)) {
        $saved_gen = get_option('supercraft_sitebuilder_last_generation', []);
        if (!empty($saved_gen) && is_array($saved_gen)) {
            $active_gen = [];
            foreach ($saved_gen as $saved_page) {
                if (!empty($saved_page['id']) && get_post_status($saved_page['id'])) {
                    $active_gen[] = $saved_page;
                }
            }
            $created_pages_summary = $active_gen;
        }
    }

    ?>
    <div class="wrap supercraft-builder-wrap">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
            <div style="display:flex; align-items:center; gap:10px;">
                <h1 style="margin:0; font-weight:800; font-size:24px; color:#111827;">
                    ✨ Supercraft AI SiteBuilder
                </h1>
                <span style="font-size:11px; font-weight:600; background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0; padding:2px 8px; border-radius:12px;">
                    Engine: <?php echo esc_html(defined('SUPERCRAFT_SITEBUILDER_MODEL') ? SUPERCRAFT_SITEBUILDER_MODEL : 'gpt-5.4-nano-2026-03-17'); ?>
                </span>
            </div>
            <span style="font-size:12px; color:#6b7280;">v<?php echo esc_html(SUPERCRAFT_SITEBUILDER_VERSION); ?></span>
        </div>
        
        <?php if ($is_master_active): ?>
            <div class="notice notice-info">
                <p>License validation is managed globally by the <strong>Supercraft Master Plugin</strong>.</p>
            </div>
        <?php else: ?>
            <div class="notice notice-warning">
                <p>Running in <strong>Standalone Mode</strong>. Validation status: <strong><?php echo esc_html($status); ?></strong></p>
            </div>
        <?php endif; ?>

        <?php echo $message; ?>

        <?php 
        $active_context = get_option('supercraft_business_context', null);
        if ($active_context && is_array($active_context)): 
            $b_name = esc_html($active_context['business_name'] ?? 'Your Business');
            $b_summary = esc_html($active_context['summary'] ?? '');
            $b_services = isset($active_context['services']) && is_array($active_context['services']) ? $active_context['services'] : [];
        ?>
            <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px; padding:16px 20px; margin-bottom:20px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:18px;">🏢</span>
                        <h3 style="margin:0; font-size:15px; font-weight:700; color:#166534;">Active Business Context: <?php echo $b_name; ?></h3>
                        <span style="font-size:11px; font-weight:600; background:#dcfce7; color:#15803d; padding:2px 8px; border-radius:9999px;">Ready for Elementor In-Place Adapt</span>
                    </div>
                    <a href="<?php echo esc_url(admin_url('admin.php?page=supercraft-sitebuilder&action=clear_context')); ?>" class="button button-small" style="color:#b91c1c; border-color:#fca5a5;" onclick="return confirm('Clear active business context?');">Clear Context</a>
                </div>
                <p style="margin:0 0 10px 0; font-size:13px; color:#1e293b; line-height:1.5;"><?php echo $b_summary; ?></p>
                <?php if (!empty($b_services)): ?>
                    <div style="display:flex; gap:6px; flex-wrap:wrap;">
                        <?php foreach ($b_services as $svc): 
                            $stitle = esc_html(is_array($svc) ? ($svc['title'] ?? '') : $svc);
                            if (!$stitle) continue;
                        ?>
                            <span style="font-size:11px; font-weight:600; background:#ffffff; color:#166534; border:1px solid #86efac; padding:2px 10px; border-radius:6px;">✓ <?php echo $stitle; ?></span>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            </div>
        <?php endif; ?>

        <!-- Stage 1: Upload Form -->
        <?php if (!$parsed_sitemap_review && empty($created_pages_summary)): ?>
            <div class="supercraft-card-box" style="background:#fff; color:#1f2937; border-color:#e5e7eb;">
                <h2 style="font-size:18px; font-weight:700; margin-top:0;">Step 1: Upload Copywriting Document or Sitemap</h2>
                <p style="color:#6b7280; font-size:13px; margin-bottom:20px;">
                    Upload your copywriting file (<strong>.docx</strong>, <strong>.pdf</strong>, <strong>.md</strong>, <strong>.txt</strong>) or paste text directly. Choose whether to generate full pages or extract context to adapt manually built pages.
                </p>
                
                <form method="post" enctype="multipart/form-data">
                    <?php wp_nonce_field('supercraft_sitebuilder_action'); ?>
                    
                    <div style="margin-bottom:18px; padding:14px 18px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px;">
                        <label style="font-weight:700; display:block; margin-bottom:8px; color:#1e293b; font-size:13px;">Choose SiteBuilder Mode:</label>
                        <div style="display:flex; gap:24px; flex-wrap:wrap;">
                            <label style="display:flex; align-items:flex-start; gap:8px; cursor:pointer;">
                                <input type="radio" name="sitebuilder_mode" value="full" checked style="margin-top:2px;">
                                <div>
                                    <strong style="color:#0f172a; font-size:13px;">Full Site Generation</strong>
                                    <div style="font-size:12px; color:#64748b; margin-top:2px;">Extracts business context, sitemap hierarchy, and creates WordPress draft pages with Elementor structure.</div>
                                </div>
                            </label>
                            <label style="display:flex; align-items:flex-start; gap:8px; cursor:pointer;">
                                <input type="radio" name="sitebuilder_mode" value="context_only" style="margin-top:2px;">
                                <div>
                                    <strong style="color:#0f172a; font-size:13px;">Context Only (Manual Building)</strong>
                                    <div style="font-size:12px; color:#64748b; margin-top:2px;">Extracts business overview & services to power in-place Elementor adaptation. Skips page creation.</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div style="background:#f9fafb; border:2px dashed #d1d5db; border-radius:12px; padding:24px; text-align:center; margin-bottom:16px;">
                        <p style="margin:0 0 10px 0; font-weight:600; font-size:14px; color:#374151;">Upload Document File (.docx, .pdf, .txt, .md):</p>
                        <input type="file" name="copywriter_file" accept=".docx,.pdf,.txt,.md,.json" style="padding:6px;">
                    </div>

                    <p>
                        <label style="font-weight:600; display:block; margin-bottom:6px; color:#374151;">Or Paste Copywriting Text Directly:</label>
                        <textarea name="copywriter_doc" rows="10" style="width:100%; font-family:monospace; padding:12px; border-radius:8px; border:1px solid #cbd5e1; font-size:12px;" placeholder="# BrandCraft Studio&#10;&#10;## Page: Home (/home)&#10;### Section: Hero&#10;Heading: Designing High-Impact Digital Experiences&#10;CTA: View Case Studies..."></textarea>
                    </p>
                    <p style="margin-top:20px;">
                        <input type="submit" name="supercraft_parse_doc" class="button button-primary supercraft-btn-primary" value="<?php echo esc_attr__('Process Document with AI', 'supercraft-sitebuilder'); ?>">
                    </p>
                </form>
            </div>
        <?php endif; ?>

        <!-- Stage 2: 3-Tier Progressive Collapsible Review Screen -->
        <?php if ($parsed_sitemap_review): 
            $tree_data = supercraft_sitebuilder_build_tree($parsed_sitemap_review);
            $total_p = count($parsed_sitemap_review);
            $total_sec = 0;
            foreach ($parsed_sitemap_review as $p) {
                $total_sec += count($p['sections'] ?? []);
            }
        ?>
            <div class="supercraft-card-box">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
                    <div>
                        <h2 style="font-size:18px; font-weight:700; margin:0 0 4px 0; color:#fff;">
                            Visual Hierarchy Tree Review
                        </h2>
                        <p style="margin:0; font-size:12px; color:rgba(255,255,255,0.6);">
                            Review AI-extracted pages, child subpages, and section tags. Adjust titles or slugs before generating.
                        </p>
                    </div>

                    <div style="font-size:12px; color:rgba(255,255,255,0.7);">
                        <strong><?php echo $total_p; ?></strong> pages &bull; <strong><?php echo $total_sec; ?></strong> sections
                    </div>
                </div>

                <!-- Global Quick Action Toolbar -->
                <div class="supercraft-toolbar">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <label style="font-size:12px; cursor:pointer; display:flex; align-items:center; gap:6px; color:#fff;">
                            <input type="checkbox" checked onclick="jQuery('.supercraft-page-chk').prop('checked', this.checked);">
                            <span>Select / Deselect All</span>
                        </label>
                    </div>

                    <div style="display:flex; align-items:center; gap:6px;">
                        <button type="button" class="supercraft-btn-tool" onclick="supercraftCollapseAll();">
                            Collapse All (Pages Only)
                        </button>
                        <button type="button" class="supercraft-btn-tool" onclick="supercraftShowSectionHeaders();">
                            Show Section Headers
                        </button>
                        <button type="button" class="supercraft-btn-tool" onclick="supercraftExpandEverything();" style="border-color:rgba(163,184,64,0.4); color:#a3b840;">
                            ✨ Expand Everything
                        </button>
                    </div>
                </div>

                <form method="post">
                    <?php wp_nonce_field('supercraft_sitebuilder_action'); ?>

                    <div id="supercraft-tree-container">
                        <?php 
                        // Helper to render a page card inside Stage 2
                        function supercraft_render_page_row($node, $is_subpage = false) {
                            $idx = $node['idx'];
                            $page = $node['page'];
                            $title = $page['page_title'] ?? 'Untitled Page';
                            $slug = $page['slug'] ?? sanitize_title($title);
                            $parent_slug = $page['parent_slug'] ?? '';
                            $sections = $page['sections'] ?? [];
                            $sec_count = count($sections);
                            $subpages_count = count($node['subpages'] ?? []);
                            ?>
                            <div class="<?php echo $is_subpage ? 'supercraft-subpage-card' : 'supercraft-page-card'; ?>" id="sc-page-<?php echo $idx; ?>">
                                <div class="supercraft-page-header" onclick="supercraftTogglePage(<?php echo $idx; ?>, event);">
                                    <div style="display:flex; align-items:center; gap:10px; min-width:0;">
                                        <input type="checkbox" class="supercraft-page-chk" name="pages[<?php echo $idx; ?>][create]" value="1" checked onclick="event.stopPropagation();">
                                        <input type="hidden" name="pages[<?php echo $idx; ?>][sections_json]" value="<?php echo esc_attr(json_encode($sections)); ?>">
                                        
                                        <span class="dashicons dashicons-arrow-right-alt2 sc-page-arrow-<?php echo $idx; ?>" style="color:rgba(255,255,255,0.4); font-size:16px; width:16px; height:16px;"></span>

                                        <?php if ($is_subpage): ?>
                                            <span class="supercraft-badge supercraft-badge-sub">↳ Subpage</span>
                                        <?php else: ?>
                                            <span class="supercraft-badge supercraft-badge-root">Root</span>
                                        <?php endif; ?>

                                        <input type="text" name="pages[<?php echo $idx; ?>][title]" value="<?php echo esc_attr($title); ?>" class="supercraft-input-text" style="width:200px; font-weight:700;" onclick="event.stopPropagation();">

                                        <code style="font-size:11px; background:rgba(255,255,255,0.06); padding:3px 6px; border-radius:4px; color:rgba(255,255,255,0.7);">
                                            /<?php echo $is_subpage ? esc_html($parent_slug) . '/' : ''; ?><input type="text" name="pages[<?php echo $idx; ?>][slug]" value="<?php echo esc_attr($slug); ?>" class="supercraft-input-text" style="width:120px; font-family:monospace;" onclick="event.stopPropagation();">
                                        </code>

                                        <input type="hidden" name="pages[<?php echo $idx; ?>][parent_slug]" value="<?php echo esc_attr($parent_slug); ?>">
                                    </div>

                                    <div style="display:flex; align-items:center; gap:8px; shrink:0;">
                                        <span style="font-size:11px; background:rgba(255,255,255,0.06); padding:2px 8px; border-radius:4px; color:rgba(255,255,255,0.7);">
                                            <?php echo $sec_count; ?> <?php echo $sec_count === 1 ? 'sec' : 'secs'; ?>
                                        </span>

                                        <?php if (!$is_subpage && $subpages_count > 0): ?>
                                            <span class="supercraft-badge supercraft-badge-sub">
                                                <?php echo $subpages_count; ?> <?php echo $subpages_count === 1 ? 'subpage' : 'subpages'; ?>
                                            </span>
                                        <?php endif; ?>
                                    </div>
                                </div>

                                <!-- Tier 2: Section Breakdown (Hidden by default) -->
                                <div class="supercraft-sections-container sc-page-sections-<?php echo $idx; ?>" style="display:none;">
                                    <?php if (!empty($sections)): ?>
                                        <?php foreach ($sections as $sIdx => $sec): 
                                            $sec_type = esc_html($sec['section_type'] ?? 'section');
                                            $sec_tag = esc_html($sec['design_tag'] ?? '');
                                            $sec_heading = esc_html($sec['heading'] ?? 'Untitled Section');
                                            $sec_sub = esc_html($sec['subheading'] ?? '');
                                            $sec_body = esc_html($sec['body_text'] ?? '');
                                            $sec_cta = esc_html($sec['cta_label'] ?? '');
                                            $items = $sec['items'] ?? [];
                                        ?>
                                            <div class="supercraft-section-item" id="sc-sec-<?php echo $idx; ?>-<?php echo $sIdx; ?>">
                                                <div class="supercraft-section-header" onclick="supercraftToggleSection(<?php echo $idx; ?>, <?php echo $sIdx; ?>, event);">
                                                    <div style="display:flex; align-items:center; gap:8px; min-width:0;">
                                                        <span class="dashicons dashicons-arrow-right-alt2 sc-sec-arrow-<?php echo $idx; ?>-<?php echo $sIdx; ?>" style="color:rgba(255,255,255,0.4); font-size:14px; width:14px; height:14px;"></span>
                                                        <span class="supercraft-badge supercraft-badge-category"><?php echo $sec_type; ?></span>
                                                        <?php if ($sec_tag): ?>
                                                            <span class="supercraft-badge supercraft-badge-tag"><?php echo $sec_tag; ?></span>
                                                        <?php endif; ?>
                                                        <strong style="color:#fff; font-size:12px;"><?php echo $sec_heading; ?></strong>
                                                    </div>

                                                    <div style="display:flex; align-items:center; gap:6px;">
                                                        <?php if ($sec_cta): ?>
                                                            <span style="background:rgba(16,185,129,0.15); color:#6ee7b7; border:1px solid rgba(16,185,129,0.3); font-size:10px; padding:1px 6px; border-radius:4px;">
                                                                CTA: "<?php echo $sec_cta; ?>"
                                                            </span>
                                                        <?php endif; ?>

                                                        <?php if (!empty($items)): ?>
                                                            <span style="font-size:10px; color:rgba(255,255,255,0.5);">
                                                                <?php echo count($items); ?> items
                                                            </span>
                                                        <?php endif; ?>

                                                        <span style="font-size:10px; color:rgba(255,255,255,0.4);">details &darr;</span>
                                                    </div>
                                                </div>

                                                <!-- Tier 3: Section Detailed Content -->
                                                <div class="supercraft-section-content sc-sec-content-<?php echo $idx; ?>-<?php echo $sIdx; ?>" style="display:none;">
                                                    <?php if ($sec_sub): ?>
                                                        <div style="margin-bottom:8px;">
                                                            <span style="font-size:10px; font-weight:700; color:rgba(255,255,255,0.4); text-transform:uppercase;">Subheading:</span>
                                                            <p style="margin:2px 0 0 0; color:rgba(255,255,255,0.7); font-style:italic;">&ldquo;<?php echo $sec_sub; ?>&rdquo;</p>
                                                        </div>
                                                    <?php endif; ?>

                                                    <?php if ($sec_body): ?>
                                                        <div style="margin-bottom:8px;">
                                                            <span style="font-size:10px; font-weight:700; color:rgba(255,255,255,0.4); text-transform:uppercase;">Body:</span>
                                                            <p style="margin:2px 0 0 0; color:rgba(255,255,255,0.6); line-height:1.4;"><?php echo $sec_body; ?></p>
                                                        </div>
                                                    <?php endif; ?>

                                                    <?php if ($sec_cta): ?>
                                                        <div style="margin-bottom:8px;">
                                                            <span style="font-size:10px; font-weight:700; color:rgba(255,255,255,0.4); text-transform:uppercase;">Button:</span>
                                                            <span style="background:#a3b840; color:#111310; font-weight:700; font-size:11px; padding:2px 8px; border-radius:4px; margin-left:6px;"><?php echo $sec_cta; ?></span>
                                                        </div>
                                                    <?php endif; ?>

                                                    <?php if (!empty($items)): ?>
                                                        <div style="margin-top:10px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.06);">
                                                            <span style="font-size:10px; font-weight:700; color:rgba(255,255,255,0.4); text-transform:uppercase;">Repeater Items (<?php echo count($items); ?> points):</span>
                                                            <div class="supercraft-repeater-grid">
                                                                <?php foreach ($items as $iIdx => $item): 
                                                                    $i_title = is_array($item) ? ($item['title'] ?? "Point " . ($iIdx + 1)) : $item;
                                                                    $i_desc = is_array($item) ? ($item['description'] ?? "") : "";
                                                                ?>
                                                                    <div class="supercraft-repeater-card">
                                                                        <strong style="color:rgba(255,255,255,0.9); font-size:11px; display:block;"><?php echo esc_html($i_title); ?></strong>
                                                                        <?php if ($i_desc): ?>
                                                                            <span style="color:rgba(255,255,255,0.5); font-size:10px; display:block; margin-top:2px;"><?php echo esc_html($i_desc); ?></span>
                                                                        <?php endif; ?>
                                                                    </div>
                                                                <?php endforeach; ?>
                                                            </div>
                                                        </div>
                                                    <?php endif; ?>
                                                </div>
                                            </div>
                                        <?php endforeach; ?>
                                    <?php else: ?>
                                        <div style="font-size:11px; color:rgba(255,255,255,0.4); font-style:italic;">No sections outlined for this page.</div>
                                    <?php endif; ?>
                                </div>
                            </div>
                            <?php
                        }

                        // Render Root Pages + Nested Subpages
                        foreach ($tree_data['roots'] as $rootNode) {
                            echo '<div class="supercraft-tree-group">';
                            supercraft_render_page_row($rootNode, false);

                            if (!empty($rootNode['subpages'])) {
                                echo '<div class="supercraft-nested-subpages">';
                                foreach ($rootNode['subpages'] as $subNode) {
                                    supercraft_render_page_row($subNode, true);
                                }
                                echo '</div>';
                            }
                            echo '</div>';
                        }

                        // Render any orphan subpages
                        if (!empty($tree_data['orphans'])) {
                            echo '<div class="supercraft-nested-subpages" style="border-color:rgba(239,68,68,0.4); margin-top:16px;">';
                            echo '<div style="font-size:11px; font-weight:700; color:#f87171; margin-bottom:8px;">Additional Subpages:</div>';
                            foreach ($tree_data['orphans'] as $orphanNode) {
                                supercraft_render_page_row($orphanNode, true);
                            }
                            echo '</div>';
                        }
                        ?>
                    </div>

                    <div style="margin-top:24px; display:flex; align-items:center; gap:12px;">
                        <input type="submit" name="supercraft_confirm_pages" class="button button-primary supercraft-btn-primary" value="Confirm & Create Selected Pages">
                        <a href="<?php echo admin_url('admin.php?page=supercraft-sitebuilder'); ?>" class="button button-secondary" style="background:transparent; color:#fff; border-color:rgba(255,255,255,0.2);">
                            Start Over
                        </a>
                    </div>
                </form>
            </div>

            <!-- Client-side Progressive Disclosure Interactions -->
            <script>
            function supercraftTogglePage(idx, event) {
                var $container = jQuery('.sc-page-sections-' + idx);
                var $arrow = jQuery('.sc-page-arrow-' + idx);
                if ($container.is(':visible')) {
                    $container.slideUp(150);
                    $arrow.removeClass('dashicons-arrow-down-alt2').addClass('dashicons-arrow-right-alt2');
                } else {
                    $container.slideDown(150);
                    $arrow.removeClass('dashicons-arrow-right-alt2').addClass('dashicons-arrow-down-alt2');
                }
            }

            function supercraftToggleSection(pIdx, sIdx, event) {
                var $content = jQuery('.sc-sec-content-' + pIdx + '-' + sIdx);
                var $arrow = jQuery('.sc-sec-arrow-' + pIdx + '-' + sIdx);
                if ($content.is(':visible')) {
                    $content.slideUp(150);
                    $arrow.removeClass('dashicons-arrow-down-alt2').addClass('dashicons-arrow-right-alt2');
                } else {
                    $content.slideDown(150);
                    $arrow.removeClass('dashicons-arrow-right-alt2').addClass('dashicons-arrow-down-alt2');
                }
            }

            function supercraftCollapseAll() {
                jQuery('.supercraft-sections-container').slideUp(150);
                jQuery('.supercraft-section-content').slideUp(150);
                jQuery('[class*="sc-page-arrow-"]').removeClass('dashicons-arrow-down-alt2').addClass('dashicons-arrow-right-alt2');
                jQuery('[class*="sc-sec-arrow-"]').removeClass('dashicons-arrow-down-alt2').addClass('dashicons-arrow-right-alt2');
            }

            function supercraftShowSectionHeaders() {
                jQuery('.supercraft-sections-container').slideDown(150);
                jQuery('.supercraft-section-content').slideUp(150);
                jQuery('[class*="sc-page-arrow-"]').removeClass('dashicons-arrow-right-alt2').addClass('dashicons-arrow-down-alt2');
                jQuery('[class*="sc-sec-arrow-"]').removeClass('dashicons-arrow-down-alt2').addClass('dashicons-arrow-right-alt2');
            }

            function supercraftExpandEverything() {
                jQuery('.supercraft-sections-container').slideDown(150);
                jQuery('.supercraft-section-content').slideDown(150);
                jQuery('[class*="sc-page-arrow-"]').removeClass('dashicons-arrow-right-alt2').addClass('dashicons-arrow-down-alt2');
                jQuery('[class*="sc-sec-arrow-"]').removeClass('dashicons-arrow-right-alt2').addClass('dashicons-arrow-down-alt2');
            }
            </script>
        <?php endif; ?>

        <!-- Stage 3: Summary Table with Direct Elementor Links -->
        <?php if (!empty($created_pages_summary)): ?>
            <div class="supercraft-card-box">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="dashicons dashicons-yes-alt" style="color:#a3b840; font-size:24px; width:24px; height:24px;"></span>
                        <h2 style="font-size:18px; font-weight:700; margin:0; color:#fff;">Generated WordPress Pages & Subpages</h2>
                    </div>

                    <div style="display:flex; align-items:center; gap:8px;">
                        <a href="<?php echo esc_url(admin_url('admin.php?page=supercraft-sitebuilder&action=new_sitemap')); ?>" class="supercraft-btn-tool" style="text-decoration:none; display:inline-flex; align-items:center; gap:4px; border-color:rgba(163,184,64,0.4); color:#a3b840;">
                            <span class="dashicons dashicons-plus" style="font-size:14px; width:14px; height:14px; line-height:14px;"></span> Start New Sitemap
                        </a>
                    </div>
                </div>
                
                <table class="supercraft-summary-table">
                    <thead>
                        <tr>
                            <th style="color:rgba(255,255,255,0.7);">Page Title</th>
                            <th style="color:rgba(255,255,255,0.7);">URL Path</th>
                            <th style="color:rgba(255,255,255,0.7);">Hierarchy</th>
                            <th style="color:rgba(255,255,255,0.7);">Sections Outlined</th>
                            <th style="color:rgba(255,255,255,0.7);">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($created_pages_summary as $page): 
                            $is_subpage = !empty($page['parent_slug']);
                        ?>
                            <tr style="border-color:rgba(255,255,255,0.06);">
                                <td>
                                    <strong style="<?php echo $is_subpage ? 'padding-left:16px; color:#fbbf24;' : 'color:#fff;'; ?>">
                                        <?php echo $is_subpage ? '↳ ' : ''; ?><?php echo esc_html($page['title']); ?>
                                    </strong>
                                </td>
                                <td><code style="background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.7);">/<?php echo esc_html($page['slug']); ?></code></td>
                                <td>
                                    <?php if ($is_subpage): ?>
                                        <span class="supercraft-badge supercraft-badge-sub">Subpage of /<?php echo esc_html($page['parent_slug']); ?></span>
                                    <?php else: ?>
                                        <span class="supercraft-badge supercraft-badge-root">Top-Level Page</span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <span style="background:rgba(163,184,64,0.15); color:#a3b840; padding:3px 8px; border-radius:4px; font-weight:600; font-size:11px;">
                                        <?php echo esc_html($page['sec_count']); ?> sections
                                    </span>
                                </td>
                                <td>
                                    <a href="<?php echo esc_url($page['edit_url']); ?>" class="button button-primary supercraft-btn-primary" target="_blank" style="font-size:12px; padding:4px 12px !important;">
                                        ✨ Build in Elementor
                                    </a>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </div>
    <?php
}

/**
 * Enqueue Elementor Editor Wizard Modal Scripts for AI-Generated Pages or Context-Guided Adaptation
 */
add_action('elementor/editor/after_enqueue_scripts', function() {
    if (!supercraft_sitebuilder_is_validated()) {
        return;
    }

    $post_id = get_the_ID();
    if (!$post_id && isset($_GET['post'])) {
        $post_id = intval($_GET['post']);
    }
    if (!$post_id) return;

    $section_copy_meta = get_post_meta($post_id, '_supercraft_section_copy', true);
    $sections_array = (!empty($section_copy_meta)) ? json_decode($section_copy_meta, true) : [];
    $business_context = get_option('supercraft_business_context', null);

    // Enqueue across all Elementor pages so the right-click Adapt Copy is always available

    wp_enqueue_script(
        'supercraft-elementor-wizard',
        SUPERCRAFT_SITEBUILDER_URL . 'assets/js/elementor-builder-modal.js',
        ['jquery'],
        SUPERCRAFT_SITEBUILDER_VERSION,
        true
    );

    wp_localize_script('supercraft-elementor-wizard', 'supercraftBuilderVars', [
        'apiEndpoint'     => SUPERCRAFT_SUPERAPP_ENDPOINT,
        'postId'          => $post_id,
        'sectionCopy'     => is_array($sections_array) ? $sections_array : [],
        'businessContext' => $business_context,
    ]);

    wp_enqueue_style(
        'supercraft-elementor-wizard-style',
        SUPERCRAFT_SITEBUILDER_URL . 'assets/css/elementor-builder-modal.css',
        [],
        SUPERCRAFT_SITEBUILDER_VERSION
    );
});
