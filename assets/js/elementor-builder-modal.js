(function($) {
    'use strict';

    function initSupercraftBuilder() {
        if (window.__supercraftBuilderInitialized) return;
        window.__supercraftBuilderInitialized = true;

        console.log('[Supercraft Builder] Initializing Elementor Editor Wizard with Smart Copy Injection & In-Place Copy Adaptor...');

        const sections = (window.supercraftBuilderVars && window.supercraftBuilderVars.sectionCopy) || [];
        const hasSections = Array.isArray(sections) && sections.length > 0;

        let currentSectionIndex = 0;
        let isAdaptCopyEnabled = true;
        let $modal = null;
        let $triggerBtn = null;

        // Render Builder Modal Floating Button & Step-by-Step Wizard ONLY when structured sections exist
        if (hasSections) {
            $triggerBtn = $('<button id="supercraft-wizard-trigger" class="supercraft-editor-btn">✨ Supercraft AI Builder</button>');
            $('body').append($triggerBtn);

            // Render Modal Overlay
            $modal = $(`
            <div id="supercraft-wizard-modal" class="supercraft-modal-overlay" style="display:none;">
                <div class="supercraft-modal-content">
                    <div class="supercraft-modal-header">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <h2>✨ Supercraft AI SiteBuilder Panel</h2>
                            <button type="button" class="supercraft-reset-btn" id="supercraft-reset-btn" title="Reset wizard to Section 1">↺ Reset to Section 1</button>
                        </div>
                        <button class="supercraft-modal-close" aria-label="Close Modal">&times;</button>
                    </div>
                    <div class="supercraft-modal-body">
                        <!-- Navigation Bar (Jump between sections) -->
                        <div class="supercraft-step-nav-bar">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <button type="button" class="supercraft-nav-btn" id="supercraft-prev-step-btn" title="Go to previous section">◀ Prev</button>
                                <select id="supercraft-section-dropdown" class="supercraft-section-dropdown" aria-label="Select Section"></select>
                                <button type="button" class="supercraft-nav-btn" id="supercraft-next-step-btn" title="Skip to next section">Next ▶</button>
                            </div>
                            <span id="supercraft-step-counter" class="supercraft-step-counter"></span>
                        </div>

                        <!-- Toggle for AI Copy Adaptation -->
                        <div class="supercraft-toggle-card">
                            <div style="display:flex; align-items:center; gap:12px;">
                                <label class="supercraft-switch">
                                    <input type="checkbox" id="supercraft-adapt-copy-toggle" checked>
                                    <span class="supercraft-slider"></span>
                                </label>
                                <div>
                                    <strong style="font-size:13px; color:#1e293b; display:block;">Adapt Copy with AI</strong>
                                    <span id="supercraft-toggle-desc" style="font-size:11px; color:#64748b; display:block;">ON: AI fits copy & balances repeaters. OFF: Imports section as-is.</span>
                                </div>
                            </div>
                        </div>

                        <div id="supercraft-copy-preview" class="supercraft-copy-box"></div>
                        <h3 id="supercraft-candidates-heading">Select Candidate Section Design (Filtered by Category & Design Tag):</h3>
                        <div id="supercraft-candidates-grid" class="supercraft-candidates-grid">
                            <div class="supercraft-loading">Loading candidate templates from Supervault...</div>
                        </div>
                    </div>
                </div>
            </div>
            `);

            $('body').append($modal);

            // Bind Events
            $triggerBtn.on('click', function() {
                $modal.show();
                loadCurrentSectionStep();
            });

        $modal.find('.supercraft-modal-close').on('click', function() {
            $modal.hide();
        });

        // Reset to Section 1 Event
        $modal.on('click', '#supercraft-reset-btn', function() {
            currentSectionIndex = 0;
            loadCurrentSectionStep();
        });

        // Previous Section Navigation
        $modal.on('click', '#supercraft-prev-step-btn', function() {
            if (currentSectionIndex > 0) {
                currentSectionIndex--;
                loadCurrentSectionStep();
            }
        });

        // Next Section Navigation
        $modal.on('click', '#supercraft-next-step-btn', function() {
            if (currentSectionIndex < sections.length - 1) {
                currentSectionIndex++;
                loadCurrentSectionStep();
            }
        });

        // Section Dropdown Jump
        $modal.on('change', '#supercraft-section-dropdown', function() {
            currentSectionIndex = parseInt($(this).val(), 10) || 0;
            loadCurrentSectionStep();
        });

        // Adapt Copy Toggle Handler
        $modal.on('change', '#supercraft-adapt-copy-toggle', function() {
            isAdaptCopyEnabled = $(this).is(':checked');
            updateToggleStateUI();
        });
        } // end if (hasSections)

        function updateToggleStateUI() {
            const $desc = $('#supercraft-toggle-desc');
            const $btns = $('.supercraft-select-btn');

            if (isAdaptCopyEnabled) {
                $desc.html('<span style="color:#16a34a; font-weight:600;">Active:</span> AI sizes copy, generates missing slots & balances repeaters.');
                $btns.each(function() {
                    const $b = $(this);
                    if (!$b.prop('disabled')) {
                        $b.removeClass('as-is-mode').text('✨ Import with AI Adapted Copy');
                    }
                });
                $('#supercraft-copy-preview').css('opacity', '1');
            } else {
                $desc.html('<span style="color:#64748b; font-weight:600;">Disabled:</span> Template will be imported with its native design and placeholder content as-is.');
                $btns.each(function() {
                    const $b = $(this);
                    if (!$b.prop('disabled')) {
                        $b.addClass('as-is-mode').text('Import Section As-Is');
                    }
                });
                $('#supercraft-copy-preview').css('opacity', '0.6');
            }
        }

        function escapeHTML(str) {
            return String(str || '').replace(/[&<>"']/g, function(m) {
                return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
            });
        }

        function generateElementorId() {
            return Math.random().toString(16).substring(2, 9);
        }

        function resolveDesignTag(sec) {
            if (sec.design_tag) return sec.design_tag;
            if (Array.isArray(sec.items) && sec.items.length > 0) {
                const count = sec.items.length;
                if (count === 2) return '2-points';
                if (count === 3) return '3-points';
                if (count === 4) return '4-points';
                return 'multi';
            }
            return 'multi';
        }

        function loadCurrentSectionStep() {
            // Update Section Dropdown Options
            const $dropdown = $('#supercraft-section-dropdown');
            $dropdown.empty();
            sections.forEach((sec, idx) => {
                const sType = (sec.section_type || 'Section').toUpperCase();
                const optText = `${idx + 1}. ${sType}`;
                $dropdown.append($('<option>', {
                    value: idx,
                    text: optText,
                    selected: idx === currentSectionIndex
                }));
            });

            // Update Prev / Next Buttons State
            $('#supercraft-prev-step-btn').prop('disabled', currentSectionIndex <= 0);
            $('#supercraft-next-step-btn').prop('disabled', currentSectionIndex >= sections.length - 1);
            $('#supercraft-step-counter').text(`Section ${Math.min(currentSectionIndex + 1, sections.length)} of ${sections.length}`);

            if (currentSectionIndex >= sections.length) {
                $('#supercraft-copy-preview').html(`
                    <div style="color:#16a34a; font-weight:600; font-size:14px; margin-bottom:4px;">
                        ✓ All ${sections.length} sections have been imported into the Elementor canvas!
                    </div>
                    <p style="margin:0; font-size:12px; color:#6b7280;">
                        You can now close this panel, customize any elements, and click "Update" or "Publish" in Elementor.
                    </p>
                `);
                $('#supercraft-candidates-heading').hide();
                $('#supercraft-candidates-grid').html(`
                    <div style="text-align:center; padding:24px 16px; width:100%; display:flex; justify-content:center; gap:12px;">
                        <button type="button" class="supercraft-select-btn" id="supercraft-close-wizard-btn" style="width:auto; padding:10px 24px;">
                            Close Panel & Review Page
                        </button>
                        <button type="button" class="supercraft-nav-btn" id="supercraft-restart-wizard-btn" style="padding:10px 20px;">
                            ↺ Restart from Section 1
                        </button>
                    </div>
                `);
                $('#supercraft-close-wizard-btn').on('click', function() {
                    if ($modal) $modal.hide();
                });
                $('#supercraft-restart-wizard-btn').on('click', function() {
                    currentSectionIndex = 0;
                    loadCurrentSectionStep();
                });
                return;
            }

            $('#supercraft-candidates-heading').show();
            const currentSec = sections[currentSectionIndex];
            const secType = escapeHTML(currentSec.section_type || 'Section');
            const designTag = resolveDesignTag(currentSec);

            // Render Parsed Copy Preview with Itemized Points if available
            let itemsHtml = '';
            if (Array.isArray(currentSec.items) && currentSec.items.length > 0) {
                itemsHtml = `<div style="margin-top:8px; padding-top:8px; border-top:1px dashed #cbd5e1;"><strong>Itemized Points (${currentSec.items.length}):</strong><ul style="margin:4px 0 0 16px; padding:0;">`;
                currentSec.items.forEach((item, idx) => {
                    const itemTitle = typeof item === 'object' ? (item.title || item.heading || `Point ${idx + 1}`) : item;
                    const itemDesc = typeof item === 'object' ? (item.description || item.body || '') : '';
                    itemsHtml += `<li><strong>${escapeHTML(itemTitle)}</strong>${itemDesc ? ': ' + escapeHTML(itemDesc) : ''}</li>`;
                });
                itemsHtml += '</ul></div>';
            }

            $('#supercraft-copy-preview').html(`
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <strong>Assigned Document Copy:</strong>
                    <span style="font-size:11px; color:#64748b;">Tag: <code>${escapeHTML(designTag)}</code></span>
                </div>
                <em>Heading:</em> ${escapeHTML(currentSec.heading || 'N/A')}<br>
                <em>Subheading:</em> ${escapeHTML(currentSec.subheading || 'N/A')}<br>
                <em>CTA Label:</em> ${escapeHTML(currentSec.cta_label || 'N/A')}
                ${itemsHtml}
            `);

            updateToggleStateUI();

            $('#supercraft-candidates-grid').html('<div class="supercraft-loading">Loading Supervault candidates matching tag "' + escapeHTML(designTag) + '"...</div>');

            // 1. Check if Master Plugin Proxy AJAX (scmp) is available in window
            if (window.scmp && window.scmp.ajax_url && window.scmp.nonce) {
                $.post(window.scmp.ajax_url, {
                    action: 'scmp_supervault_proxy',
                    action_type: 'components',
                    category: currentSec.section_type,
                    design_tag: designTag,
                    nonce: window.scmp.nonce
                }, function(res) {
                    if (res && res.success && res.data && res.data.length > 0) {
                        renderCandidateCards(res.data, currentSec);
                    } else {
                        fetchFromSuperapp(currentSec, designTag);
                    }
                }).fail(function() {
                    fetchFromSuperapp(currentSec, designTag);
                });
            } else {
                fetchFromSuperapp(currentSec, designTag);
            }
        }

        function fetchFromSuperapp(currentSec, designTag) {
            const endpoint = `${window.supercraftBuilderVars.apiEndpoint}/components?type=${encodeURIComponent(currentSec.section_type)}&tag=${encodeURIComponent(designTag || '')}`;
            $.getJSON(endpoint, function(data) {
                if (data && data.components && data.components.length > 0) {
                    renderCandidateCards(data.components, currentSec);
                } else {
                    fallbackLocalSeed(currentSec);
                }
            }).fail(function() {
                fallbackLocalSeed(currentSec);
            });
        }

        function fallbackLocalSeed(currentSec) {
            const secType = (currentSec.section_type || 'hero').toLowerCase();
            const fallbackComp = {
                id: `fallback-${secType}`,
                title: `Default ${secType.charAt(0).toUpperCase() + secType.slice(1)} Template`,
                thumbnail_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80',
                elementor_data: [
                    {
                        id: generateElementorId(),
                        elType: "container",
                        isInner: false,
                        settings: { flex_direction: "column", padding: { unit: "px", top: "60", bottom: "60", left: "20", right: "20" } },
                        elements: [
                            { id: generateElementorId(), elType: "widget", widgetType: "heading", settings: { title: "YOUR_HEADING_HERE" } },
                            { id: generateElementorId(), elType: "widget", widgetType: "text-editor", settings: { editor: "<p>YOUR_SUBHEADING_HERE</p>" } },
                            {
                                id: generateElementorId(),
                                elType: "container",
                                isInner: true,
                                settings: { flex_direction: "row", flex_wrap: "wrap", gap: { unit: "px", size: 20 } },
                                elements: [
                                    {
                                        id: generateElementorId(),
                                        elType: "container",
                                        isInner: true,
                                        elements: [
                                            { id: generateElementorId(), elType: "widget", widgetType: "heading", settings: { title: "ITEM_HEADING" } },
                                            { id: generateElementorId(), elType: "widget", widgetType: "text-editor", settings: { editor: "<p>ITEM_DESCRIPTION</p>" } }
                                        ]
                                    }
                                ]
                            },
                            { id: generateElementorId(), elType: "widget", widgetType: "button", settings: { text: "YOUR_CTA_LABEL" } }
                        ]
                    }
                ]
            };
            renderCandidateCards([fallbackComp], currentSec);
        }

        function renderCandidateCards(components, currentSec) {
            let html = '';
            components.forEach((comp, idx) => {
                const videoSrc = comp.video_url || comp.video || (comp.thumbnail_url && comp.thumbnail_url.match(/\.(mp4|webm)($|\?)/i) ? comp.thumbnail_url : null);
                const thumb = comp.thumbnail_url || comp.thumbnail || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80';
                
                let mediaHtml = '';
                if (videoSrc) {
                    mediaHtml = `<video src="${escapeHTML(videoSrc)}" poster="${escapeHTML(thumb)}" autoplay loop muted playsinline class="supercraft-card-media supercraft-card-video"></video>`;
                } else {
                    mediaHtml = `<img src="${escapeHTML(thumb)}" alt="${escapeHTML(comp.title)}" class="supercraft-card-media" />`;
                }

                const btnLabel = isAdaptCopyEnabled ? '✨ Import with AI Adapted Copy' : 'Import Section As-Is';
                const btnClass = isAdaptCopyEnabled ? 'supercraft-select-btn' : 'supercraft-select-btn as-is-mode';

                html += `
                    <div class="supercraft-card" data-comp-id="${escapeHTML(comp.id)}">
                        ${mediaHtml}
                        <h4>${escapeHTML(comp.title)}</h4>
                        <button class="${btnClass}" data-index="${idx}">${btnLabel}</button>
                    </div>
                `;
            });
            $('#supercraft-candidates-grid').html(html);

            $('.supercraft-select-btn').on('click', function() {
                const $btn = $(this);
                if ($btn.prop('disabled')) return;
                $btn.prop('disabled', true).text('Importing...');
                const compIdx = $btn.data('index');
                const selectedComp = components[compIdx];
                importSectionToElementor(selectedComp, currentSec, $btn);
            });
        }

        function importSectionToElementor(component, copyData, $btn) {
            console.log('[Supercraft Builder] Importing component into Elementor Canvas:', component);

            function handleError(msg) {
                console.error('[Supercraft Builder] Import error:', msg);
                if ($btn) $btn.prop('disabled', false).text('Select & Import Section');
                alert('Import failed: ' + msg);
            }

            // If component already has elementor_data embedded
            if (component.elementor_data) {
                applyCopyAndImport(component.elementor_data, copyData, $btn, component.title);
                return;
            }

            // Fetch full JSON via Master Plugin Proxy
            if (window.scmp && window.scmp.ajax_url && window.scmp.nonce) {
                $.post(window.scmp.ajax_url, {
                    action: 'scmp_supervault_proxy',
                    action_type: 'json',
                    id: component.id,
                    nonce: window.scmp.nonce
                }, function(res) {
                    if (res && res.success && res.data) {
                        applyCopyAndImport(res.data, copyData, $btn, component.title);
                    } else {
                        const err = (res && res.data && res.data.message) ? res.data.message : 'Invalid component response';
                        handleError(err);
                    }
                }).fail(function(xhr) {
                    handleError(xhr.statusText || 'Network request failed');
                });
            } else {
                handleError('Master plugin connector (scmp) not available');
            }
        }

        // Deep clone helper
        function deepClone(obj) {
            return JSON.parse(JSON.stringify(obj));
        }

        // Recursively re-assign fresh unique IDs to all Elementor nodes
        function reassignElementorIds(elementNode) {
            if (!elementNode || typeof elementNode !== 'object') return;
            elementNode.id = generateElementorId();
            if (Array.isArray(elementNode.elements)) {
                elementNode.elements.forEach(child => reassignElementorIds(child));
            }
        }

        // Inject Item copy into a cloned item node
        function injectItemCopy(itemNode, itemData, index) {
            const itemTitle = typeof itemData === 'object' ? (itemData.title || itemData.heading || `Point ${index + 1}`) : itemData;
            const itemDesc = typeof itemData === 'object' ? (itemData.description || itemData.body || '') : '';

            let str = JSON.stringify(itemNode);
            str = str.replace(/ITEM_HEADING|ITEM_TITLE/g, itemTitle);
            str = str.replace(/ITEM_DESCRIPTION|ITEM_BODY/g, itemDesc);
            str = str.replace(/ITEM_INDEX/g, String(index + 1));

            const parsed = JSON.parse(str);

            let headingReplaced = false;
            let textReplaced = false;

            function walkWidgets(node) {
                if (!node) return;
                if (node.elType === 'widget') {
                    if (node.widgetType === 'heading' && !headingReplaced && node.settings) {
                        node.settings.title = itemTitle;
                        headingReplaced = true;
                    } else if (node.widgetType === 'text-editor' && !textReplaced && node.settings) {
                        node.settings.editor = `<p>${itemDesc}</p>`;
                        textReplaced = true;
                    }
                }
                if (Array.isArray(node.elements)) {
                    node.elements.forEach(walkWidgets);
                }
            }

            if (!JSON.stringify(itemNode).includes('ITEM_HEADING') && !JSON.stringify(itemNode).includes('ITEM_TITLE')) {
                walkWidgets(parsed);
            }

            return parsed;
        }

        // Blueprint Extractor: scans Elementor JSON for text slots and repeater structure
        function extractComponentBlueprint(rawElements, componentTitle) {
            const rootSlots = [];
            let repeaterLayout = { type: 'none', column_count: 1, initial_card_counts: [] };

            function scanSlots(node) {
                if (!node) return;
                if (node.elType === 'widget' && node.settings) {
                    if (node.widgetType === 'heading' && node.settings.title) {
                        const titleText = String(node.settings.title);
                        const words = titleText.trim().split(/\s+/).filter(Boolean).length;
                        rootSlots.push({
                            slot_id: 'heading_' + rootSlots.length,
                            slot_type: 'heading',
                            placeholder_text: titleText,
                            target_words: words,
                            target_chars: titleText.length
                        });
                    } else if (node.widgetType === 'text-editor' && node.settings.editor) {
                        const editorText = String(node.settings.editor).replace(/<[^>]+>/g, '').trim();
                        const words = editorText.split(/\s+/).filter(Boolean).length;
                        rootSlots.push({
                            slot_id: 'text_' + rootSlots.length,
                            slot_type: 'text',
                            placeholder_text: editorText,
                            target_words: words,
                            target_chars: editorText.length
                        });
                    } else if (node.widgetType === 'button' && node.settings.text) {
                        const btnText = String(node.settings.text);
                        const words = btnText.trim().split(/\s+/).filter(Boolean).length;
                        rootSlots.push({
                            slot_id: 'button_' + rootSlots.length,
                            slot_type: 'button',
                            placeholder_text: btnText,
                            target_words: words,
                            target_chars: btnText.length
                        });
                    } else if (node.widgetType === 'html' && node.settings && node.settings.html) {
                        const rawHtml = String(node.settings.html);
                        const cleanMarkup = rawHtml
                            .replace(/<style[\s\S]*?<\/style>/gi, '')
                            .replace(/<script[\s\S]*?<\/script>/gi, '');
                        const tagMatches = [...cleanMarkup.matchAll(/>([^<]+)</g)];
                        tagMatches.forEach(m => {
                            const trimmed = m[1].trim();
                            if (trimmed.length > 0 && !/^[\s\n\r]*$/.test(trimmed) && !/^[;{}()]*$/.test(trimmed) && !/^@/.test(trimmed)) {
                                const words = trimmed.split(/\s+/).filter(Boolean).length;
                                rootSlots.push({
                                    slot_id: 'html_' + rootSlots.length,
                                    slot_type: trimmed.length < 30 ? 'badge' : 'text',
                                    placeholder_text: trimmed,
                                    target_words: words,
                                    target_chars: trimmed.length
                                });
                            }
                        });
                    }
                }
                if (Array.isArray(node.elements)) {
                    node.elements.forEach(scanSlots);
                }
            }

            let detected = false;
            function scanRepeater(node) {
                if (!node || detected) return;

                if (Array.isArray(node.elements) && node.elements.length > 0) {
                    const childContainers = node.elements.filter(child => child && child.elType === 'container');
                    
                    // Multi-column parent holding card containers in each column
                    if (childContainers.length >= 2 && childContainers.every(col => Array.isArray(col.elements) && col.elements.length > 0 && col.elements[0].elType === 'container')) {
                        detected = true;
                        repeaterLayout = {
                            type: 'multi_column',
                            column_count: childContainers.length,
                            initial_card_counts: childContainers.map(col => col.elements.length)
                        };
                        return;
                    }

                    // Single grid holding 2+ cards
                    const isGrid = (node.settings && (node.settings.flex_wrap === 'wrap' || node.settings.display === 'grid')) ||
                                   (childContainers.length >= 2);
                    if (isGrid && childContainers.length >= 1) {
                        detected = true;
                        repeaterLayout = {
                            type: 'single_grid',
                            column_count: 1,
                            initial_card_counts: [childContainers.length]
                        };
                        return;
                    }

                    node.elements.forEach(scanRepeater);
                }
            }

            rawElements.forEach(scanSlots);
            rawElements.forEach(scanRepeater);

            return {
                component_title: componentTitle || 'Selected Template',
                root_slots: rootSlots.slice(0, 10),
                repeater_layout: repeaterLayout
            };
        }

        // Symmetrical Layout & Dynamic Repeater Engine
        function applySymmetricalLayout(containerElements, layoutPlan, fallbackItems) {
            let processed = false;

            function traverse(node) {
                if (!node || typeof node !== 'object' || processed) return;

                if (Array.isArray(node.elements) && node.elements.length > 0) {
                    const childContainers = node.elements.filter(child => child && child.elType === 'container');

                    // Multi-Column Container (e.g. 2 columns with symmetrical cards)
                    if (childContainers.length >= 2 && childContainers.every(col => Array.isArray(col.elements) && col.elements.length > 0 && col.elements[0].elType === 'container')) {
                        processed = true;
                        const columnsPlan = layoutPlan && Array.isArray(layoutPlan.columns) && layoutPlan.columns.length > 0 ? layoutPlan.columns : null;

                        childContainers.forEach((colNode, colIdx) => {
                            const archetype = deepClone(colNode.elements[0]);
                            const plannedColItems = columnsPlan && columnsPlan[colIdx] ? columnsPlan[colIdx].items : [];
                            
                            if (plannedColItems && plannedColItems.length > 0) {
                                const newCards = [];
                                for (let i = 0; i < plannedColItems.length; i++) {
                                    const baseNode = (i < colNode.elements.length) ? deepClone(colNode.elements[i]) : deepClone(archetype);
                                    reassignElementorIds(baseNode);
                                    const populatedCard = injectItemCopy(baseNode, plannedColItems[i], i);
                                    newCards.push(populatedCard);
                                }
                                colNode.elements = newCards;
                            }
                        });
                        return;
                    }

                    // Single Grid Container
                    const isGrid = (node.settings && (node.settings.flex_wrap === 'wrap' || node.settings.display === 'grid')) ||
                                   (childContainers.length >= 2 && childContainers[0].elType === 'container');

                    if (isGrid && childContainers.length >= 1) {
                        processed = true;
                        const archetype = deepClone(childContainers[0]);
                        let allPlannedItems = [];

                        if (layoutPlan && Array.isArray(layoutPlan.columns)) {
                            layoutPlan.columns.forEach(col => {
                                if (Array.isArray(col.items)) allPlannedItems.push(...col.items);
                            });
                        }
                        if (allPlannedItems.length === 0) {
                            allPlannedItems = fallbackItems || [];
                        }

                        if (allPlannedItems.length > 0) {
                            const newCards = [];
                            for (let i = 0; i < allPlannedItems.length; i++) {
                                const baseNode = (i < childContainers.length) ? deepClone(childContainers[i]) : deepClone(archetype);
                                reassignElementorIds(baseNode);
                                const populatedCard = injectItemCopy(baseNode, allPlannedItems[i], i);
                                newCards.push(populatedCard);
                            }
                            node.elements = newCards;
                        }
                        return;
                    }

                    node.elements.forEach(traverse);
                }
            }

            containerElements.forEach(traverse);
            return containerElements;
        }

        // Direct Smart Copy Injection for templates without explicit placeholder tokens
        function injectDirectCopy(rootElement, copyData) {
            let badgeFound = false;
            let headingFound = false;
            let textFound = false;
            let buttonFound = false;

            function walk(node) {
                if (!node) return;

                if (node.elType === 'widget' && node.settings) {
                    // Check for eyebrow badge pill if present in copyData
                    if (copyData.badge && !badgeFound && node.widgetType === 'heading' && node.settings.title && node.settings.title.length < 25) {
                        node.settings.title = copyData.badge;
                        badgeFound = true;
                    } else if (node.widgetType === 'heading' && !headingFound && copyData.heading) {
                        node.settings.title = copyData.heading;
                        headingFound = true;
                    } else if (node.widgetType === 'text-editor' && !textFound && (copyData.subheading || copyData.body_text)) {
                        node.settings.editor = `<p>${copyData.subheading || copyData.body_text}</p>`;
                        textFound = true;
                    } else if (node.widgetType === 'button' && !buttonFound && copyData.cta_label) {
                        node.settings.text = copyData.cta_label;
                        buttonFound = true;
                    } else if (node.widgetType === 'html' && node.settings && node.settings.html) {
                        let htmlStr = String(node.settings.html);
                        const cleanMarkup = htmlStr
                            .replace(/<style[\s\S]*?<\/style>/gi, '')
                            .replace(/<script[\s\S]*?<\/script>/gi, '');
                        const tagMatches = [...cleanMarkup.matchAll(/>([^<]+)</g)];
                        const textSnippets = tagMatches
                            .map(m => m[1].trim())
                            .filter(t => t.length > 0 && !/^[\s\n\r]*$/.test(t) && !/^[;{}()]*$/.test(t) && !/^@/.test(t));
                        
                        if (copyData.badge && !badgeFound && textSnippets.length === 1 && textSnippets[0].length < 25) {
                            htmlStr = htmlStr.replace(textSnippets[0], copyData.badge);
                            node.settings.html = htmlStr;
                            badgeFound = true;
                        } else if (copyData.items && Array.isArray(copyData.items) && copyData.items.length > 0 && textSnippets.length > 1) {
                            textSnippets.forEach((snippet, sIdx) => {
                                if (copyData.items[sIdx]) {
                                    const itemTitle = typeof copyData.items[sIdx] === 'object' 
                                        ? (copyData.items[sIdx].title || copyData.items[sIdx].heading || '') 
                                        : String(copyData.items[sIdx]);
                                    if (itemTitle) {
                                        htmlStr = htmlStr.replace(snippet, itemTitle);
                                    }
                                }
                            });
                            node.settings.html = htmlStr;
                        }
                    }
                }

                if (Array.isArray(node.elements)) {
                    node.elements.forEach(walk);
                }
            }

            walk(rootElement);
        }

        function applyCopyAndImport(rawElementorData, copyData, $btn, componentTitle) {
            try {
                // Normalize raw data
                let parsed = rawElementorData;
                if (typeof parsed === 'string') {
                    try { parsed = JSON.parse(parsed); } catch(e) {}
                }

                let rawElements = [];
                if (Array.isArray(parsed)) {
                    rawElements = parsed;
                } else if (parsed && Array.isArray(parsed.elements)) {
                    rawElements = parsed.elements;
                } else if (parsed && typeof parsed === 'object') {
                    rawElements = [parsed];
                }

                if (rawElements.length === 0) {
                    throw new Error('No Elementor elements found in template payload.');
                }

                // If user disabled AI copy adaptation, import template as-is immediately
                if (!isAdaptCopyEnabled) {
                    console.log('[Supercraft Builder] Copy adaptation disabled by user. Importing section as-is...');
                    if ($btn) $btn.prop('disabled', true).text('Importing As-Is...');
                    executeCanvasImport(rawElements, null, null, $btn);
                    return;
                }

                if ($btn) $btn.prop('disabled', true).text('✨ AI Sizing Copy & Balancing Layout...');

                const blueprint = extractComponentBlueprint(rawElements, componentTitle);

                // Call AI Adapt Copy API on Superapp
                const apiEndpoint = window.supercraftBuilderVars ? window.supercraftBuilderVars.apiEndpoint : 'http://localhost:3000/api/sitebuilder';

                $.ajax({
                    url: `${apiEndpoint}/adapt-copy`,
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        source_copy: copyData,
                        component_blueprint: blueprint
                    }),
                    timeout: 20000
                }).done(function(aiResponse) {
                    let adaptedSlots = copyData;
                    let layoutPlan = null;

                    if (aiResponse && aiResponse.status === 'success' && aiResponse.adapted_slots) {
                        console.log('[Supercraft Builder] AI Copy & Layout Plan received:', aiResponse);
                        adaptedSlots = {
                            heading: aiResponse.adapted_slots.heading || copyData.heading,
                            subheading: aiResponse.adapted_slots.subheading || copyData.subheading,
                            cta_label: aiResponse.adapted_slots.cta || copyData.cta_label,
                            badge: aiResponse.adapted_slots.badge || '',
                            body_text: copyData.body_text,
                            items: copyData.items
                        };
                        layoutPlan = aiResponse.layout_plan;
                    }

                    executeCanvasImport(rawElements, adaptedSlots, layoutPlan, $btn);
                }).fail(function(xhr, status, err) {
                    console.warn('[Supercraft Builder] AI adapt-copy failed or timed out, executing direct import:', err);
                    executeCanvasImport(rawElements, copyData, null, $btn);
                });
            } catch (err) {
                console.error('[Supercraft Builder] Error in applyCopyAndImport:', err);
                if ($btn) {
                    $btn.prop('disabled', false);
                    updateToggleStateUI();
                }
                alert('Import initialization error: ' + (err.message || String(err)));
            }
        }

        function executeCanvasImport(rawElements, copyData, layoutPlan, $btn) {
            try {
                let processedData = deepClone(rawElements);

                // Tag top-level container with section index for auto-detection on right-click
                processedData.forEach(function(el) {
                    if (!el.settings) el.settings = {};
                    el.settings._supercraft_section_idx = currentSectionIndex;
                });

                // Phase 1: Reassign fresh IDs to prevent collisions in Elementor
                processedData.forEach(function(el) {
                    reassignElementorIds(el);
                });

                // If copyData is provided (Adapt Copy enabled), perform symmetrical expansion & copy injection
                if (copyData) {
                    // Phase 2: Symmetrical Layout & Repeater Expansion
                    processedData = applySymmetricalLayout(processedData, layoutPlan, copyData.items);

                    // Phase 3: Token Placeholders Replacement
                    let jsonString = JSON.stringify(processedData);
                    jsonString = jsonString.replace(/YOUR_HEADING_HERE/g, copyData.heading || '');
                    jsonString = jsonString.replace(/YOUR_SUBHEADING_HERE/g, copyData.subheading || '');
                    jsonString = jsonString.replace(/YOUR_BODY_TEXT_HERE/g, copyData.body_text || '');
                    jsonString = jsonString.replace(/YOUR_CTA_LABEL/g, copyData.cta_label || 'Click Here');

                    let populatedData = JSON.parse(jsonString);

                    // Direct widget copy injection for non-tokenized templates
                    populatedData.forEach(function(topEl) {
                        injectDirectCopy(topEl, copyData);
                    });

                    processedData = populatedData;
                }

                // Phase 4: Insert elements into Elementor Canvas
                const targetView = (typeof elementor !== 'undefined' && typeof elementor.getPreviewView === 'function') 
                    ? elementor.getPreviewView() 
                    : null;

                let containerInstance = null;
                if (targetView && typeof targetView.getContainer === 'function') {
                    containerInstance = targetView.getContainer();
                } else if (typeof elementor !== 'undefined' && elementor.documents && elementor.documents.getCurrent) {
                    containerInstance = elementor.documents.getCurrent().container;
                }

                let anyInserted = false;
                processedData.forEach(function(el) {
                    let inserted = false;

                    // Method 1: Elementor $e Command API
                    if (typeof $e !== 'undefined' && $e.run) {
                        try {
                            const opts = { model: el };
                            if (containerInstance) opts.container = containerInstance;
                            const res = $e.run('document/elements/create', opts);
                            if (res) inserted = true;
                        } catch(e) {
                            console.warn('[Supercraft Builder] $e.run document/elements/create failed:', e);
                        }
                    }

                    // Method 2: targetView.addChildModel
                    if (!inserted && targetView && typeof targetView.addChildModel === 'function') {
                        try {
                            const resView = targetView.addChildModel(el);
                            if (resView) inserted = true;
                        } catch(e) {
                            console.warn('[Supercraft Builder] addChildModel failed:', e);
                        }
                    }

                    if (inserted) {
                        anyInserted = true;
                    }
                });

                if (!anyInserted) {
                    throw new Error('Could not find active Elementor canvas container to insert elements.');
                }

                // Set dirty flag so Elementor "Update" button lights up green
                if (typeof elementor !== 'undefined' && elementor.saver && elementor.saver.setFlagEditorChange) {
                    elementor.saver.setFlagEditorChange(true);
                }

                // Advance step smoothly
                currentSectionIndex++;
                loadCurrentSectionStep();
            } catch (err) {
                console.error('[Supercraft Builder] Error inserting into canvas:', err);
                if ($btn) {
                    $btn.prop('disabled', false);
                    updateToggleStateUI();
                }
                alert('Error importing section: ' + (err.message || String(err)));
            }
        }

        // =========================================================================
        // RIGHT-CLICK IN-PLACE COPY ADAPTATION SYSTEM
        // Extracts only semantic text with context (heading, subheading, point heading, etc.)
        // Never modifies the container structure, columns, or layout.
        // =========================================================================

        // Find the true top-level section / container in the Elementor preview hierarchy
        function findTopLevelElementView(view) {
            if (!view) return null;

            // 1. Get top-level container/section IDs from elementor.elements
            const topLevelIds = new Set();
            if (typeof elementor !== 'undefined' && elementor.elements && typeof elementor.elements.each === 'function') {
                elementor.elements.each(function(m) {
                    if (m && typeof m.get === 'function') {
                        topLevelIds.add(m.get('id'));
                    }
                });
            }

            // 2. Ascend via view hierarchy AND container parent hierarchy
            let curr = view;
            while (curr) {
                const model = curr.model;
                const modelId = model && typeof model.get === 'function' ? model.get('id') : null;

                // If this model is one of the top-level sections/containers on canvas
                if (modelId && topLevelIds.has(modelId)) {
                    return curr;
                }

                let nextParent = null;
                if (curr._parent) {
                    nextParent = curr._parent;
                } else if (typeof curr.getContainer === 'function') {
                    const cont = curr.getContainer();
                    if (cont && cont.parent && cont.parent.view) {
                        nextParent = cont.parent.view;
                    }
                } else if (modelId && typeof elementor !== 'undefined' && typeof elementor.getContainer === 'function') {
                    const cont = elementor.getContainer(modelId);
                    if (cont && cont.parent && cont.parent.view) {
                        nextParent = cont.parent.view;
                    }
                }

                if (nextParent) {
                    const pModel = nextParent.model;
                    const pType = pModel && typeof pModel.get === 'function' ? pModel.get('elType') : null;
                    const previewView = (typeof elementor !== 'undefined' && typeof elementor.getPreviewView === 'function') 
                        ? elementor.getPreviewView() 
                        : null;

                    if (nextParent === previewView || pType === 'document' || !pType) {
                        return curr;
                    }
                    curr = nextParent;
                } else {
                    break;
                }
            }

            // Fallback: If view has a model, walk up via elementor.getContainer chain
            if (view.model && typeof elementor !== 'undefined' && typeof elementor.getContainer === 'function') {
                const startId = view.model.get ? view.model.get('id') : null;
                if (startId) {
                    let c = elementor.getContainer(startId);
                    while (c && c.parent) {
                        if (topLevelIds.has(c.id)) {
                            return c.view || curr;
                        }
                        c = c.parent;
                    }
                }
            }

            return curr;
        }

        // Helper to safely extract arrays from Elementor settings (which can be a plain Array or Backbone.Collection)
        function getSettingArray(settings, key) {
            if (!settings) return [];
            const raw = settings.get(key);
            if (!raw) return [];
            if (Array.isArray(raw)) return raw;
            if (typeof raw.toJSON === 'function') {
                const json = raw.toJSON();
                if (Array.isArray(json)) return json;
            }
            if (raw.models && Array.isArray(raw.models)) {
                return raw.models.map(m => {
                    if (!m) return {};
                    if (typeof m.toJSON === 'function') return m.toJSON();
                    return m.attributes || m;
                });
            }
            return [];
        }

        // Helper to retrieve child models from an Elementor Backbone Model
        function getElementChildren(model) {
            if (!model) return [];
            const el = model.get('elements');
            if (!el) return [];
            if (el.models && Array.isArray(el.models)) return el.models;
            if (Array.isArray(el)) return el;
            if (typeof el.toArray === 'function') return el.toArray();
            return [];
        }

        // Helper to check if a child model is a descendant of a parent model
        function isDescendantOf(childNode, parentNode) {
            if (!childNode || !parentNode) return false;
            let found = false;
            function walk(m) {
                if (found) return;
                const mId = m.get ? m.get('id') : m.id;
                const cId = childNode.get ? childNode.get('id') : childNode.id;
                if (mId && cId && mId === cId) {
                    found = true;
                    return;
                }
                getElementChildren(m).forEach(walk);
            }
            getElementChildren(parentNode).forEach(walk);
            return found;
        }

        // Semantic Text Extractor: Extracts text with context (heading, subheading, badge, cta, point heading, point description)
        // Never passes raw Elementor JSON to AI.
        function extractSemanticSlotsFromView(rootView) {
            if (!rootView || !rootView.model) return null;
            const rootModel = rootView.model;

            const allSlots = [];
            let slotCounter = 0;
            let htmlPointCounter = 0;

            // 1. Traverse and collect ALL text-bearing widgets
            function collectTextWidgets(node, depth, parentContainer) {
                if (!node) return;
                const elType = node.get('elType');

                if (elType === 'widget') {
                    const wt = node.get('widgetType');
                    const settings = node.get('settings');

                    if (wt === 'heading' && settings) {
                        const title = String(settings.get('title') || '').trim();
                        if (title) {
                            allSlots.push({
                                id: 'slot_' + (++slotCounter),
                                model: node,
                                widgetType: 'heading',
                                settingKey: 'title',
                                currentText: title,
                                headerSize: String(settings.get('header_size') || 'h2').toLowerCase(),
                                depth: depth,
                                parentId: parentContainer ? parentContainer.get('id') : null,
                                detectedRole: 'heading'
                            });
                        }
                    } else if (wt === 'text-editor' && settings) {
                        const rawHtml = String(settings.get('editor') || '').trim();
                        const cleanText = rawHtml.replace(/<[^>]+>/g, '').trim();
                        if (cleanText) {
                            allSlots.push({
                                id: 'slot_' + (++slotCounter),
                                model: node,
                                widgetType: 'text-editor',
                                settingKey: 'editor',
                                currentText: cleanText,
                                depth: depth,
                                parentId: parentContainer ? parentContainer.get('id') : null,
                                detectedRole: 'subheading'
                            });
                        }
                    } else if (wt === 'button' && settings) {
                        const btnText = String(settings.get('text') || '').trim();
                        if (btnText) {
                            allSlots.push({
                                id: 'slot_' + (++slotCounter),
                                model: node,
                                widgetType: 'button',
                                settingKey: 'text',
                                currentText: btnText,
                                depth: depth,
                                parentId: parentContainer ? parentContainer.get('id') : null,
                                detectedRole: 'cta'
                            });
                        }
                    } else if (wt === 'counter' && settings) {
                        const title = String(settings.get('title') || '').trim();
                        const endingNumber = settings.get('ending_number') !== undefined ? String(settings.get('ending_number')) : '';
                        const prefix = String(settings.get('prefix') || '');
                        const suffix = String(settings.get('suffix') || '');
                        const numDisplay = (prefix + endingNumber + suffix).trim();

                        if (numDisplay) {
                            allSlots.push({
                                id: 'slot_' + (++slotCounter),
                                model: node,
                                widgetType: 'counter',
                                settingKey: 'metric',
                                currentText: numDisplay,
                                counterTitle: title,
                                counterNumber: endingNumber,
                                counterPrefix: prefix,
                                counterSuffix: suffix,
                                depth: depth,
                                parentId: parentContainer ? parentContainer.get('id') : null,
                                detectedRole: 'point_metric'
                            });
                        }

                        if (title) {
                            allSlots.push({
                                id: 'slot_' + (++slotCounter),
                                model: node,
                                widgetType: 'counter',
                                settingKey: 'title',
                                currentText: title,
                                counterTitle: title,
                                counterNumber: endingNumber,
                                counterPrefix: prefix,
                                counterSuffix: suffix,
                                depth: depth,
                                parentId: parentContainer ? parentContainer.get('id') : null,
                                detectedRole: 'point_heading'
                            });
                        }
                    } else if (wt === 'icon-list' && settings) {
                        const rawList = getSettingArray(settings, 'icon_list');
                        if (rawList.length > 0) {
                            if (rawList.length === 1) {
                                const text = String(rawList[0].text || '').trim();
                                if (text) {
                                    allSlots.push({
                                        id: 'slot_' + (++slotCounter),
                                        model: node,
                                        widgetType: 'icon-list',
                                        settingKey: 'icon_list',
                                        itemIndex: 0,
                                        currentText: text,
                                        depth: depth,
                                        parentId: parentContainer ? parentContainer.get('id') : null,
                                        detectedRole: 'badge'
                                    });
                                }
                            } else {
                                rawList.forEach((item, itemIdx) => {
                                    const text = String(item.text || '').trim();
                                    if (text) {
                                        allSlots.push({
                                            id: 'slot_' + (++slotCounter),
                                            model: node,
                                            widgetType: 'icon-list',
                                            settingKey: 'icon_list',
                                            itemIndex: itemIdx,
                                            currentText: text,
                                            depth: depth,
                                            parentId: parentContainer ? parentContainer.get('id') : null,
                                            detectedRole: `point_heading_${itemIdx + 1}`
                                        });
                                    }
                                });
                            }
                        }
                    } else if ((wt === 'icon-box' || wt === 'image-box') && settings) {
                        const titleText = String(settings.get('title_text') || '').trim();
                        const descText = String(settings.get('description_text') || '').trim();
                        if (titleText) {
                            allSlots.push({
                                id: 'slot_' + (++slotCounter),
                                model: node,
                                widgetType: wt,
                                settingKey: 'title_text',
                                currentText: titleText,
                                depth: depth,
                                parentId: parentContainer ? parentContainer.get('id') : null,
                                detectedRole: 'point_heading'
                            });
                        }
                        if (descText) {
                            allSlots.push({
                                id: 'slot_' + (++slotCounter),
                                model: node,
                                widgetType: wt,
                                settingKey: 'description_text',
                                currentText: descText,
                                depth: depth,
                                parentId: parentContainer ? parentContainer.get('id') : null,
                                detectedRole: 'point_description'
                            });
                        }
                    } else if (wt === 'call-to-action' && settings) {
                        const title = String(settings.get('title') || '').trim();
                        const desc = String(settings.get('description') || '').trim();
                        const btn = String(settings.get('button_text') || '').trim();
                        if (title) {
                            allSlots.push({
                                id: 'slot_' + (++slotCounter),
                                model: node,
                                widgetType: 'call-to-action',
                                settingKey: 'title',
                                currentText: title,
                                depth: depth,
                                parentId: parentContainer ? parentContainer.get('id') : null,
                                detectedRole: 'heading'
                            });
                        }
                        if (desc) {
                            allSlots.push({
                                id: 'slot_' + (++slotCounter),
                                model: node,
                                widgetType: 'call-to-action',
                                settingKey: 'description',
                                currentText: desc,
                                depth: depth,
                                parentId: parentContainer ? parentContainer.get('id') : null,
                                detectedRole: 'subheading'
                            });
                        }
                        if (btn) {
                            allSlots.push({
                                id: 'slot_' + (++slotCounter),
                                model: node,
                                widgetType: 'call-to-action',
                                settingKey: 'button_text',
                                currentText: btn,
                                depth: depth,
                                parentId: parentContainer ? parentContainer.get('id') : null,
                                detectedRole: 'cta'
                            });
                        }
                    } else if (wt === 'testimonial' && settings) {
                        const content = String(settings.get('testimonial_content') || '').trim();
                        const name = String(settings.get('testimonial_name') || '').trim();
                        const job = String(settings.get('testimonial_job') || '').trim();
                        if (name) {
                            allSlots.push({
                                id: 'slot_' + (++slotCounter),
                                model: node,
                                widgetType: 'testimonial',
                                settingKey: 'testimonial_name',
                                currentText: name,
                                depth: depth,
                                parentId: parentContainer ? parentContainer.get('id') : null,
                                detectedRole: 'point_heading'
                            });
                        }
                        if (content) {
                            allSlots.push({
                                id: 'slot_' + (++slotCounter),
                                model: node,
                                widgetType: 'testimonial',
                                settingKey: 'testimonial_content',
                                currentText: content,
                                depth: depth,
                                parentId: parentContainer ? parentContainer.get('id') : null,
                                detectedRole: 'point_description'
                            });
                        }
                        if (job) {
                            allSlots.push({
                                id: 'slot_' + (++slotCounter),
                                model: node,
                                widgetType: 'testimonial',
                                settingKey: 'testimonial_job',
                                currentText: job,
                                depth: depth,
                                parentId: parentContainer ? parentContainer.get('id') : null,
                                detectedRole: 'badge'
                            });
                        }
                    } else if ((wt === 'accordion' || wt === 'toggle') && settings) {
                        const tabs = getSettingArray(settings, 'tabs');
                        if (tabs.length > 0) {
                            tabs.forEach((tab, tabIdx) => {
                                const title = String(tab.tab_title || '').trim();
                                const content = String(tab.tab_content || '').trim().replace(/<[^>]+>/g, '');
                                if (title) {
                                    allSlots.push({
                                        id: 'slot_' + (++slotCounter),
                                        model: node,
                                        widgetType: wt,
                                        settingKey: 'tabs',
                                        tabIndex: tabIdx,
                                        tabField: 'tab_title',
                                        currentText: title,
                                        depth: depth,
                                        parentId: parentContainer ? parentContainer.get('id') : null,
                                        detectedRole: `point_heading_${tabIdx + 1}`
                                    });
                                }
                                if (content) {
                                    allSlots.push({
                                        id: 'slot_' + (++slotCounter),
                                        model: node,
                                        widgetType: wt,
                                        settingKey: 'tabs',
                                        tabIndex: tabIdx,
                                        tabField: 'tab_content',
                                        currentText: content,
                                        depth: depth,
                                        parentId: parentContainer ? parentContainer.get('id') : null,
                                        detectedRole: `point_description_${tabIdx + 1}`
                                    });
                                }
                            });
                        }
                    } else if (wt === 'supercomponent' && settings) {
                        let schema = null;
                        const schemaRaw = settings.get('schema');
                        if (typeof schemaRaw === 'string' && schemaRaw.trim()) {
                            try {
                                schema = JSON.parse(schemaRaw);
                            } catch (e) {}
                        } else if (typeof schemaRaw === 'object' && schemaRaw !== null) {
                            schema = schemaRaw;
                        }

                        const activeSchemaId = String(settings.get('active_schema_id') || (schema ? schema.id : '')).trim();
                        let foundRepeater = false;

                        // 1. Try extracting through schema definition
                        if (schema && Array.isArray(schema.settings)) {
                            schema.settings.forEach(ctrl => {
                                if (ctrl.type === 'repeater' && Array.isArray(ctrl.fields)) {
                                    const scopedKey = 'sc_' + activeSchemaId + '_' + ctrl.id;
                                    const rawList = getSettingArray(settings, scopedKey) || getSettingArray(settings, ctrl.id);
                                    if (rawList && rawList.length > 0) {
                                        foundRepeater = true;
                                        rawList.forEach((item, itemIdx) => {
                                            ctrl.fields.forEach(f => {
                                                if (['text', 'textarea', 'richtext'].includes(f.type)) {
                                                    const val = String(item[f.id] || '').replace(/<[^>]+>/g, '').trim();
                                                    if (val) {
                                                        const isDesc = ['description', 'desc', 'content', 'body', 'offer_items'].includes(f.id);
                                                        const isMetric = ['number', 'tab_number', 'metric', 'stat'].includes(f.id);
                                                        const role = isMetric ? `point_metric_${itemIdx + 1}` : (isDesc ? `point_description_${itemIdx + 1}` : `point_heading_${itemIdx + 1}`);
                                                        allSlots.push({
                                                            id: 'slot_' + (++slotCounter),
                                                            model: node,
                                                            widgetType: 'supercomponent',
                                                            settingKey: scopedKey,
                                                            repeaterKey: scopedKey,
                                                            itemIndex: itemIdx,
                                                            itemField: f.id,
                                                            currentText: val,
                                                            depth: depth,
                                                            parentId: parentContainer ? parentContainer.get('id') : null,
                                                            detectedRole: role
                                                        });
                                                    }
                                                }
                                            });
                                        });
                                    }
                                } else if (['text', 'textarea', 'richtext'].includes(ctrl.type)) {
                                    const scopedKey = 'sc_' + activeSchemaId + '_' + ctrl.id;
                                    const val = String(settings.get(scopedKey) || settings.get(ctrl.id) || '').replace(/<[^>]+>/g, '').trim();
                                    if (val) {
                                        const isBadge = ctrl.id.includes('badge') || ctrl.id.includes('tag');
                                        const isSub = ctrl.id.includes('subheading') || ctrl.id.includes('desc');
                                        allSlots.push({
                                            id: 'slot_' + (++slotCounter),
                                            model: node,
                                            widgetType: 'supercomponent',
                                            settingKey: scopedKey,
                                            currentText: val,
                                            depth: depth,
                                            parentId: parentContainer ? parentContainer.get('id') : null,
                                            detectedRole: isBadge ? 'badge' : (isSub ? 'subheading' : 'heading')
                                        });
                                    }
                                }
                            });
                        }

                        // 2. Fallback: If schema was missing or didn't yield repeaters, scan all setting attributes for repeater arrays matching sc_*
                        if (!foundRepeater) {
                            const attrs = (typeof settings.toJSON === 'function') ? settings.toJSON() : (settings.attributes || {});
                            Object.keys(attrs).forEach(k => {
                                const val = attrs[k];
                                if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object' && val[0] !== null) {
                                    if (k.startsWith('sc_') || k.includes('tabs') || k.includes('services') || k.includes('list') || k.includes('items')) {
                                        val.forEach((item, itemIdx) => {
                                            ['title', 'heading', 'name', 'vertical_title', 'description', 'desc', 'text', 'content', 'number'].forEach(fieldKey => {
                                                if (item[fieldKey] && typeof item[fieldKey] === 'string' && item[fieldKey].trim()) {
                                                    const cleanText = item[fieldKey].replace(/<[^>]+>/g, '').trim();
                                                    if (cleanText) {
                                                        const isDesc = ['description', 'desc', 'content', 'text'].includes(fieldKey);
                                                        const isMetric = ['number', 'tab_number'].includes(fieldKey);
                                                        const role = isMetric ? `point_metric_${itemIdx + 1}` : (isDesc ? `point_description_${itemIdx + 1}` : `point_heading_${itemIdx + 1}`);
                                                        allSlots.push({
                                                            id: 'slot_' + (++slotCounter),
                                                            model: node,
                                                            widgetType: 'supercomponent',
                                                            settingKey: k,
                                                            repeaterKey: k,
                                                            itemIndex: itemIdx,
                                                            itemField: fieldKey,
                                                            currentText: cleanText,
                                                            depth: depth,
                                                            parentId: parentContainer ? parentContainer.get('id') : null,
                                                            detectedRole: role
                                                        });
                                                    }
                                                }
                                            });
                                        });
                                    }
                                }
                            });
                        }
                    } else if (wt === 'html' && settings) {
                        const rawHtml = String(settings.get('html') || '');
                        if (rawHtml) {
                            // Strip style and script blocks before text extraction
                            const cleanMarkup = rawHtml
                                .replace(/<style[\s\S]*?<\/style>/gi, '')
                                .replace(/<script[\s\S]*?<\/script>/gi, '');

                            // Find text content inside HTML tags
                            const tagMatches = [...cleanMarkup.matchAll(/>([^<]+)</g)];
                            const validSnippets = [];
                            tagMatches.forEach(m => {
                                const rawSnippet = m[1];
                                const trimmed = rawSnippet.trim();
                                if (trimmed.length > 0 && !/^[\s\n\r]*$/.test(trimmed) && !/^[;{}()]*$/.test(trimmed) && !/^@/.test(trimmed)) {
                                    validSnippets.push({
                                        rawSnippet: rawSnippet,
                                        cleanText: trimmed
                                    });
                                }
                            });

                            if (validSnippets.length === 1) {
                                const item = validSnippets[0];
                                allSlots.push({
                                    id: 'slot_' + (++slotCounter),
                                    model: node,
                                    widgetType: 'html',
                                    settingKey: 'html',
                                    rawSnippet: item.rawSnippet,
                                    currentText: item.cleanText,
                                    depth: depth,
                                    parentId: parentContainer ? parentContainer.get('id') : null,
                                    detectedRole: item.cleanText.length < 30 ? 'badge' : 'subheading'
                                });
                            } else if (validSnippets.length > 1) {
                                validSnippets.forEach((item, sIdx) => {
                                    htmlPointCounter++;
                                    allSlots.push({
                                        id: 'slot_' + (++slotCounter),
                                        model: node,
                                        widgetType: 'html',
                                        settingKey: 'html',
                                        itemIndex: sIdx,
                                        rawSnippet: item.rawSnippet,
                                        currentText: item.cleanText,
                                        depth: depth,
                                        parentId: parentContainer ? parentContainer.get('id') : null,
                                        detectedRole: `point_heading_${htmlPointCounter}`
                                    });
                                });
                            }
                        }
                    } else if (settings) {
                        // Generic fallback for ANY other widget type: pick up common text-bearing settings
                        const genericKeys = ['title', 'title_text', 'sub_title', 'subtitle', 'description', 'description_text', 'text', 'content', 'editor', 'heading', 'label', 'button_text', 'badge_text', 'caption', 'name'];
                        genericKeys.forEach(gk => {
                            const gv = settings.get(gk);
                            if (typeof gv !== 'string') return;
                            const gClean = gv.replace(/<[^>]+>/g, '').trim();
                            if (!gClean || /^(https?:|#|\{)/.test(gClean)) return;
                            allSlots.push({
                                id: 'slot_' + (++slotCounter),
                                model: node,
                                widgetType: wt,
                                settingKey: gk,
                                currentText: gClean,
                                depth: depth,
                                parentId: parentContainer ? parentContainer.get('id') : null,
                                detectedRole: 'ignore'
                            });
                        });
                    }
                }

                const nextParent = (elType === 'container' || elType === 'column') ? node : parentContainer;
                getElementChildren(node).forEach(child => collectTextWidgets(child, depth + 1, nextParent));
            }

            collectTextWidgets(rootModel, 0, null);

            if (allSlots.length === 0) return null;

            // 2. Intelligent Role Classification
            // Check for True Repeater Cards across single grid, multi-row, or multi-column layouts
            const candidateCardsBySig = {}; // sig => Array of container models
            function scanCardNodes(node) {
                if (!node) return;
                const children = getElementChildren(node);
                const childContainers = children.filter(c => {
                    const t = c.get('elType');
                    return t === 'container' || t === 'column';
                });

                if (childContainers.length >= 2) {
                    const sigMap = {};
                    childContainers.forEach(c => {
                        const sub = [];
                        function findTypes(m) {
                            if (m.get('elType') === 'widget') sub.push(m.get('widgetType'));
                            getElementChildren(m).forEach(findTypes);
                        }
                        findTypes(c);
                        const sig = sub.sort().join(',');
                        if (!sigMap[sig]) sigMap[sig] = [];
                        sigMap[sig].push(c);
                    });

                    Object.keys(sigMap).forEach(sig => {
                        const containers = sigMap[sig];
                        const isCardType = sig && (
                            sig.includes('icon-box') || 
                            sig.includes('image-box') || 
                            sig.includes('counter') ||
                            sig.includes('testimonial') ||
                            sig.includes('call-to-action') ||
                            (sig.includes('heading') && sig.includes('text-editor')) ||
                            (sig.includes('heading') && sig.includes('icon')) ||
                            (sig.includes('heading') && sig.includes('image'))
                        );
                        // Exclude top-level 2-col hero container
                        const isTopLevelTwoCol = (node === rootModel && containers.length === 2 && childContainers.length === 2);
                        if (isCardType && !isTopLevelTwoCol) {
                            if (!candidateCardsBySig[sig]) candidateCardsBySig[sig] = [];
                            candidateCardsBySig[sig].push(...containers);
                        }
                    });
                }

                children.forEach(scanCardNodes);
            }

            scanCardNodes(rootModel);

            // Pick the signature that has >= 2 cards and represents the deepest/most specific cards
            let repeaterCardContainers = [];
            let maxCount = 0;

            Object.keys(candidateCardsBySig).forEach(sig => {
                let list = candidateCardsBySig[sig];
                // Filter out containers that contain another container in the list (remove outer row/section wrappers)
                list = list.filter(c => !list.some(other => other !== c && isDescendantOf(other, c)));
                if (list.length >= 2 && list.length > maxCount) {
                    maxCount = list.length;
                    repeaterCardContainers = list;
                }
            });

            // Assign initial detected roles based on structure
            if (repeaterCardContainers.length > 0) {
                // True repeater cards present
                repeaterCardContainers.forEach((cardNode, cardIdx) => {
                    const cardSlots = allSlots.filter(s => {
                        let isDesc = false;
                        function checkDesc(m) {
                            if (m.get('id') === s.model.get('id')) isDesc = true;
                            if (!isDesc) getElementChildren(m).forEach(checkDesc);
                        }
                        checkDesc(cardNode);
                        return isDesc;
                    });

                    // Tag slots with intra-card group context
                    cardSlots.forEach(s => {
                        s.groupId = 'card_' + (cardIdx + 1);
                        s.groupTitle = 'Card ' + (cardIdx + 1);
                        s.cardIndex = cardIdx;
                        s.isCard = true;
                    });

                    const pointNum = cardIdx + 1;
                    let headingAssigned = false;
                    let descAssigned = false;
                    let metricAssigned = false;

                    // Check if card has a separate heading or title widget alongside counter
                    const hasCounter = cardSlots.some(s => s.widgetType === 'counter');
                    const hasHeading = cardSlots.some(s => s.widgetType === 'heading' || s.settingKey === 'title_text');

                    cardSlots.forEach(s => {
                        if (s.widgetType === 'counter') {
                            if (s.settingKey === 'metric') {
                                s.detectedRole = `point_metric_${pointNum}`;
                                metricAssigned = true;
                            } else if (s.settingKey === 'title') {
                                s.detectedRole = `point_heading_${pointNum}`;
                                headingAssigned = true;
                            } else if (hasHeading || !s.counterTitle || s.counterTitle.trim() === '') {
                                s.detectedRole = `point_metric_${pointNum}`;
                                metricAssigned = true;
                            } else {
                                s.detectedRole = `point_heading_${pointNum}`;
                                headingAssigned = true;
                            }
                        } else if (s.settingKey === 'title_text') {
                            s.detectedRole = `point_heading_${pointNum}`;
                            headingAssigned = true;
                        } else if (s.settingKey === 'description_text') {
                            s.detectedRole = `point_description_${pointNum}`;
                            descAssigned = true;
                        } else if (s.widgetType === 'heading' && !headingAssigned) {
                            s.detectedRole = `point_heading_${pointNum}`;
                            headingAssigned = true;
                        } else if (s.widgetType === 'text-editor' && !descAssigned) {
                            s.detectedRole = `point_description_${pointNum}`;
                            descAssigned = true;
                        } else {
                            s.detectedRole = 'ignore';
                        }
                    });
                });

                // Classify slots OUTSIDE the repeater cards
                const outsideSlots = allSlots.filter(s => !s.isCard);
                outsideSlots.forEach(s => {
                    s.groupId = 'section_header';
                    s.groupTitle = 'Section Header';
                    s.cardIndex = -1;
                    s.isCard = false;
                });
                let mainHeadingAssigned = false;
                let subheadingAssigned = false;
                let badgeAssigned = false;
                let ctaAssigned = false;

                // 1. Identify main heading
                const outsideHeadings = outsideSlots.filter(s => s.widgetType === 'heading');
                let mainHeadingSlot = null;
                if (outsideHeadings.length === 1) {
                    mainHeadingSlot = outsideHeadings[0];
                } else if (outsideHeadings.length > 1) {
                    mainHeadingSlot = outsideHeadings.reduce((prev, curr) => curr.currentText.length > prev.currentText.length ? curr : prev, outsideHeadings[0]);
                }
                if (mainHeadingSlot) {
                    mainHeadingSlot.detectedRole = 'heading';
                    mainHeadingAssigned = true;
                }

                outsideSlots.forEach(s => {
                    if (s === mainHeadingSlot) return;

                    if (s.widgetType === 'heading') {
                        if (!badgeAssigned && s.currentText.length < 30 && mainHeadingSlot && allSlots.indexOf(s) < allSlots.indexOf(mainHeadingSlot)) {
                            s.detectedRole = 'badge';
                            badgeAssigned = true;
                        } else if (!subheadingAssigned) {
                            s.detectedRole = 'subheading';
                            subheadingAssigned = true;
                        } else {
                            s.detectedRole = 'ignore';
                        }
                    } else if (s.widgetType === 'text-editor') {
                        // Check if text-editor is positioned before the main heading and is short (like eyebrow badge e.g. "About us")
                        const isBeforeHeading = mainHeadingSlot && (allSlots.indexOf(s) < allSlots.indexOf(mainHeadingSlot));
                        if (!badgeAssigned && isBeforeHeading && s.currentText.length < 30) {
                            s.detectedRole = 'badge';
                            badgeAssigned = true;
                        } else if (!subheadingAssigned) {
                            s.detectedRole = 'subheading';
                            subheadingAssigned = true;
                        } else {
                            s.detectedRole = 'ignore';
                        }
                    } else if (s.widgetType === 'icon-list') {
                        s.detectedRole = 'badge';
                        badgeAssigned = true;
                    } else if (s.widgetType === 'button') {
                        const isBeforeHeading = mainHeadingSlot && (allSlots.indexOf(s) < allSlots.indexOf(mainHeadingSlot));
                        if (!badgeAssigned && isBeforeHeading && s.currentText.length < 25) {
                            s.detectedRole = 'badge';
                            badgeAssigned = true;
                        } else if (!ctaAssigned) {
                            s.detectedRole = 'cta';
                            ctaAssigned = true;
                        } else {
                            s.detectedRole = 'ignore';
                        }
                    } else if (s.widgetType === 'html') {
                        const isBeforeHeading = mainHeadingSlot && (allSlots.indexOf(s) < allSlots.indexOf(mainHeadingSlot));
                        if (!badgeAssigned && (isBeforeHeading || s.currentText.length < 30)) {
                            s.detectedRole = 'badge';
                            badgeAssigned = true;
                        } else if (!subheadingAssigned) {
                            s.detectedRole = 'subheading';
                            subheadingAssigned = true;
                        } else {
                            s.detectedRole = 'ignore';
                        }
                    } else {
                        s.detectedRole = 'ignore';
                    }
                });
            } else if (allSlots.some(s => s.detectedRole && s.detectedRole.startsWith('point_'))) {
                // Ensure any unindexed point slots (e.g. from multi-item HTML widgets or counters) are sequentially indexed
                let nextPointIndex = 1;
                allSlots.forEach(s => {
                    if (s.detectedRole && s.detectedRole.startsWith('point_')) {
                        const match = s.detectedRole.match(/^point_(?:heading|description|metric)_(\d+)$/);
                        if (match) {
                            nextPointIndex = Math.max(nextPointIndex, parseInt(match[1], 10) + 1);
                        }
                    }
                });
                allSlots.forEach(s => {
                    if (s.detectedRole === 'point_heading') {
                        s.detectedRole = `point_heading_${nextPointIndex++}`;
                    } else if (s.detectedRole === 'point_metric') {
                        s.detectedRole = `point_metric_${nextPointIndex}`;
                    } else if (s.detectedRole === 'point_description') {
                        s.detectedRole = `point_description_${nextPointIndex}`;
                    }
                });

                // Inherent widget repeater present (e.g. SuperComponent, Accordion, Icon-List, HTML Marquee)
                const outsideSlots = allSlots.filter(s => !s.detectedRole || !s.detectedRole.startsWith('point_'));
                let mainHeadingAssigned = false;
                let subheadingAssigned = false;
                let badgeAssigned = false;
                let ctaAssigned = false;

                const outsideHeadings = outsideSlots.filter(s => s.widgetType === 'heading');
                let mainHeadingSlot = null;
                if (outsideHeadings.length === 1) {
                    mainHeadingSlot = outsideHeadings[0];
                } else if (outsideHeadings.length > 1) {
                    mainHeadingSlot = outsideHeadings.reduce((prev, curr) => curr.currentText.length > prev.currentText.length ? curr : prev, outsideHeadings[0]);
                }
                if (mainHeadingSlot) {
                    mainHeadingSlot.detectedRole = 'heading';
                    mainHeadingAssigned = true;
                }

                outsideSlots.forEach(s => {
                    if (s === mainHeadingSlot) return;

                    if (s.widgetType === 'heading') {
                        if (!badgeAssigned && s.currentText.length < 30 && mainHeadingSlot && allSlots.indexOf(s) < allSlots.indexOf(mainHeadingSlot)) {
                            s.detectedRole = 'badge';
                            badgeAssigned = true;
                        } else if (!subheadingAssigned) {
                            s.detectedRole = 'subheading';
                            subheadingAssigned = true;
                        } else {
                            s.detectedRole = 'ignore';
                        }
                    } else if (s.widgetType === 'text-editor') {
                        const isBeforeHeading = mainHeadingSlot && (allSlots.indexOf(s) < allSlots.indexOf(mainHeadingSlot));
                        if (!badgeAssigned && isBeforeHeading && s.currentText.length < 30) {
                            s.detectedRole = 'badge';
                            badgeAssigned = true;
                        } else if (!subheadingAssigned) {
                            s.detectedRole = 'subheading';
                            subheadingAssigned = true;
                        } else {
                            s.detectedRole = 'ignore';
                        }
                    } else if (s.widgetType === 'icon-list') {
                        s.detectedRole = 'badge';
                        badgeAssigned = true;
                    } else if (s.widgetType === 'button') {
                        const isBeforeHeading = mainHeadingSlot && (allSlots.indexOf(s) < allSlots.indexOf(mainHeadingSlot));
                        if (!badgeAssigned && isBeforeHeading && s.currentText.length < 25) {
                            s.detectedRole = 'badge';
                            badgeAssigned = true;
                        } else if (!ctaAssigned) {
                            s.detectedRole = 'cta';
                            ctaAssigned = true;
                        } else {
                            s.detectedRole = 'ignore';
                        }
                    } else if (s.widgetType === 'html') {
                        const isBeforeHeading = mainHeadingSlot && (allSlots.indexOf(s) < allSlots.indexOf(mainHeadingSlot));
                        if (!badgeAssigned && (isBeforeHeading || s.currentText.length < 30)) {
                            s.detectedRole = 'badge';
                            badgeAssigned = true;
                        } else if (!subheadingAssigned) {
                            s.detectedRole = 'subheading';
                            subheadingAssigned = true;
                        } else {
                            s.detectedRole = 'ignore';
                        }
                    } else {
                        s.detectedRole = 'ignore';
                    }
                });
            } else {
                // Non-repeater classification (e.g. stats counters in an authority bar / section)
                const counterWidgets = [];
                allSlots.forEach(s => {
                    const wid = s.model ? (s.model.get ? s.model.get('id') : s.model.id) : null;
                    if (s.widgetType === 'counter' && wid && !counterWidgets.includes(wid)) {
                        counterWidgets.push(wid);
                    }
                });

                let counterPointIdx = 1;
                if (counterWidgets.length > 0) {
                    counterWidgets.forEach(wid => {
                        const ptIdx = counterPointIdx++;
                        const wSlots = allSlots.filter(s => {
                            const swid = s.model ? (s.model.get ? s.model.get('id') : s.model.id) : null;
                            return s.widgetType === 'counter' && swid === wid;
                        });
                        wSlots.forEach(s => {
                            if (s.settingKey === 'metric') s.detectedRole = `point_metric_${ptIdx}`;
                            else if (s.settingKey === 'title') s.detectedRole = `point_heading_${ptIdx}`;
                            else s.detectedRole = `point_heading_${ptIdx}`;
                        });
                    });
                } else {
                    const counters = allSlots.filter(s => s.widgetType === 'counter');
                    counters.forEach(c => {
                        if (c.settingKey === 'metric') c.detectedRole = `point_metric_${counterPointIdx}`;
                        else c.detectedRole = `point_heading_${counterPointIdx++}`;
                    });
                }

                // Check icon-list (e.g. badge like "About Us")
                const iconLists = allSlots.filter(s => s.widgetType === 'icon-list');
                iconLists.forEach(il => {
                    if (!il.detectedRole || il.detectedRole === 'ignore') {
                        il.detectedRole = 'badge';
                    }
                });

                // 1. Identify Main Section Heading
                const headings = allSlots.filter(s => s.widgetType === 'heading');
                let mainHeading = null;

                if (headings.length === 1) {
                    mainHeading = headings[0];
                } else if (headings.length > 1) {
                    if (headings[0].currentText.length < 30 && ['h4', 'h5', 'h6', 'div', 'span', 'p'].includes(headings[0].headerSize)) {
                        headings[0].detectedRole = 'badge';
                        mainHeading = headings[1];
                    } else {
                        mainHeading = headings.find(h => h.headerSize === 'h1') ||
                                      headings.find(h => h.headerSize === 'h2') ||
                                      headings.reduce((prev, curr) => (curr.currentText.length > prev.currentText.length ? curr : prev), headings[0]);
                    }
                }

                if (mainHeading) {
                    mainHeading.detectedRole = 'heading';
                }

                // 2. Identify Subheading
                let subheadingAssigned = false;
                const texts = allSlots.filter(s => s.widgetType === 'text-editor');
                if (texts.length > 0) {
                    texts[0].detectedRole = 'subheading';
                    subheadingAssigned = true;
                }

                // If multiple headings exist and no text-editor was assigned as subheading, assign secondary heading as subheading
                if (headings.length > 1) {
                    headings.forEach(h => {
                        if (h === mainHeading) return;
                        if (!subheadingAssigned) {
                            h.detectedRole = 'subheading';
                            subheadingAssigned = true;
                        } else if (h.detectedRole === 'heading') {
                            h.detectedRole = 'ignore';
                        }
                    });
                }

                // 3. Identify CTA Button or Eyebrow Badge Button
                const buttons = allSlots.filter(s => s.widgetType === 'button');
                if (buttons.length > 0) {
                    const firstBtn = buttons[0];
                    const isBeforeHeading = mainHeading && (allSlots.indexOf(firstBtn) < allSlots.indexOf(mainHeading));
                    if (isBeforeHeading && firstBtn.currentText.length < 25) {
                        firstBtn.detectedRole = 'badge';
                        if (buttons.length > 1) buttons[1].detectedRole = 'cta';
                    } else {
                        firstBtn.detectedRole = 'cta';
                    }
                }

                // 4. Remaining widgets (pills, badges, boxes)
                let extraPointCounter = counterPointIdx;
                allSlots.forEach(s => {
                    if (s.detectedRole && s.detectedRole !== 'ignore' && !s.detectedRole.startsWith('point_heading_')) {
                        return; // Already classified as heading/subheading/badge/cta
                    }
                    if (s.widgetType === 'counter' || s.widgetType === 'icon-list') {
                        return; // Already classified above
                    }
                    if (s.settingKey === 'title_text') {
                        s.detectedRole = `point_heading_${extraPointCounter}`;
                    } else if (s.settingKey === 'description_text') {
                        s.detectedRole = `point_description_${extraPointCounter++}`;
                    } else if (s.widgetType === 'heading' && !mainHeading) {
                        s.detectedRole = 'heading';
                        mainHeading = s;
                    } else if (!s.detectedRole) {
                        s.detectedRole = 'ignore';
                    }
                });
            }

            // Ensure every slot has a clean, reliable structural group assignment
            allSlots.forEach(s => {
                if (!s.groupId) {
                    if (s.detectedRole && s.detectedRole.startsWith('point_')) {
                        const match = s.detectedRole.match(/^point_(?:heading|description|metric)_(\d+)$/);
                        const ptNum = match ? parseInt(match[1], 10) : 1;
                        s.groupId = 'card_' + ptNum;
                        s.groupTitle = 'Card ' + ptNum;
                        s.cardIndex = ptNum - 1;
                        s.isCard = true;
                    } else {
                        s.groupId = 'section_header';
                        s.groupTitle = 'Section Header';
                        s.cardIndex = -1;
                        s.isCard = false;
                    }
                }
            });

            return {
                allSlots: allSlots
            };
        }

        // Render In-Place Adapt Copy Modal Overlay
        const $adaptModal = $(`
            <div id="supercraft-adapt-copy-modal" class="supercraft-modal-overlay" style="display:none;">
                <div class="supercraft-modal-content supercraft-adapt-modal-dialog">
                    <div class="supercraft-modal-header">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="font-size:20px;">✨</span>
                            <div>
                                <h2>Supercraft In-Place Copy Adaptor</h2>
                                <p style="margin:2px 0 0 0; font-size:12px; color:#94a3b8;">Adapts copy into existing component slots without altering structure or layout.</p>
                            </div>
                        </div>
                        <button class="supercraft-modal-close supercraft-adapt-modal-close" aria-label="Close Modal">&times;</button>
                    </div>
                    <div class="supercraft-modal-body">
                        <!-- Panel 1: Configuration & Prompting -->
                        <div id="supercraft-config-panel">
                            <!-- Scope Selector Bar (Single Element / Container vs Entire Section) -->
                            <div id="supercraft-scope-bar" class="supercraft-scope-bar" style="display:none;">
                                <div class="supercraft-scope-info">
                                    <span>🎯 <strong>Adaptation Scope:</strong></span>
                                    <span id="supercraft-scope-target-badge" class="supercraft-scope-target-badge">Selected Element</span>
                                </div>
                                <div class="supercraft-scope-toggles">
                                    <button type="button" id="supercraft-scope-target-btn" class="supercraft-scope-btn active">Selected Element</button>
                                    <button type="button" id="supercraft-scope-section-btn" class="supercraft-scope-btn">Entire Section</button>
                                </div>
                            </div>

                            <!-- Active Business Context Banner -->
                            <div id="supercraft-active-context-banner" class="supercraft-context-banner" style="display:none;"></div>

                            <!-- Section Dropdown (shown when structured sections exist) -->
                            <div id="supercraft-section-select-group" class="supercraft-adapt-form-group">
                                <label for="supercraft-adapt-section-select" class="supercraft-form-label">
                                    <strong>Choose Copy Document Section:</strong>
                                    <span style="font-size:11px; color:#64748b; font-weight:normal;">(Pre-selected based on current section tag)</span>
                                </label>
                                <select id="supercraft-adapt-section-select" class="supercraft-adapt-select"></select>
                            </div>

                            <!-- User Instruction / Prompt Box -->
                            <div class="supercraft-prompt-box">
                                <label class="supercraft-form-label" for="supercraft-adapt-user-prompt">
                                    <strong id="supercraft-prompt-label">Custom Instruction / Direction:</strong>
                                    <span id="supercraft-prompt-hint" style="font-size:11px; color:#64748b; font-weight:normal;">(Optional custom focus or tone guidance)</span>
                                </label>
                                <textarea id="supercraft-adapt-user-prompt" class="supercraft-prompt-textarea" rows="2" placeholder="e.g. Focus on our 3 core corporate packages with punchy deliverable pills and strong CTA..."></textarea>
                            </div>

                            <div class="supercraft-adapt-columns">
                                <!-- Column 1: Detected Destination Slots Grouped by Card -->
                                <div class="supercraft-adapt-col">
                                    <div class="supercraft-adapt-col-header">
                                        <strong>Detected Canvas Text Slots</strong>
                                        <span id="supercraft-detected-slots-badge" class="supercraft-badge-pill">Detected</span>
                                    </div>
                                    <div id="supercraft-detected-slots-list" class="supercraft-slots-list"></div>
                                </div>

                                <!-- Column 2: Selected Source Copy or Context Preview -->
                                <div class="supercraft-adapt-col">
                                    <div class="supercraft-adapt-col-header">
                                        <strong id="supercraft-source-panel-title">Source Document Copy</strong>
                                        <span id="supercraft-source-items-badge" class="supercraft-badge-pill">Points: 0</span>
                                    </div>
                                    <div id="supercraft-source-copy-preview" class="supercraft-source-preview"></div>
                                </div>
                            </div>

                            <div id="supercraft-adapt-notice" class="supercraft-adapt-notice" style="display:none;"></div>

                            <div class="supercraft-adapt-footer">
                                <button type="button" class="supercraft-cancel-btn supercraft-adapt-modal-close">Cancel</button>
                                <button type="button" id="supercraft-submit-adapt-btn" class="supercraft-submit-btn">✨ Generate Adaptations</button>
                            </div>
                        </div>

                        <!-- Panel 2: Interactive Before & After Review Screen -->
                        <div id="supercraft-review-panel" class="supercraft-review-panel" style="display:none;">
                            <div class="supercraft-review-header">
                                <div>
                                    <strong style="color:#0f172a; font-size:14px;">✨ Review Proposed Copy Before Applying</strong>
                                    <div style="font-size:11px; color:#64748b; margin-top:2px;">Compare original text vs proposed AI copy. Edit text inline or click "Regenerate" on any slot with comments.</div>
                                </div>
                                <button type="button" id="supercraft-regen-all-btn" class="supercraft-btn-secondary">🔄 Regenerate All...</button>
                            </div>

                            <!-- Diff Cards Container -->
                            <div id="supercraft-review-diff-container" class="supercraft-review-diff-container"></div>

                            <div class="supercraft-review-footer">
                                <button type="button" id="supercraft-review-back-btn" class="supercraft-cancel-btn">← Back to Settings</button>
                                <button type="button" id="supercraft-apply-review-btn" class="supercraft-submit-btn" style="background:#16a34a;">✅ Apply Changes to Canvas</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div id="supercraft-toast" class="supercraft-toast" style="display:none;"></div>
        `);
        $('body').append($adaptModal);

        $adaptModal.find('.supercraft-adapt-modal-close').on('click', function() {
            $adaptModal.hide();
        });

        function showToastNotice(msg) {
            const $toast = $('#supercraft-toast');
            $toast.html(`<span>✨</span> ${escapeHTML(msg)}`).fadeIn(200);
            setTimeout(function() {
                $toast.fadeOut(300);
            }, 3500);
        }

        // Open Adapt Copy Modal for right-clicked Elementor view
        let activeTargetTopView = null;
        let activeTargetElementView = null;
        let activeTargetSlotIds = [];
        let activeScopeMode = 'all'; // 'selected' or 'all'
        let activeAllSlots = [];
        let activeSelectedIdx = 0;
        let activeFlatSlotsPayload = [];
        let activeSourceCopyPayload = {};

        function getElementAndDescendantIds(model) {
            const ids = new Set();
            if (!model) return ids;
            if (typeof model.get === 'function') {
                ids.add(model.get('id'));
                const elements = model.get('elements');
                if (elements && elements.models) {
                    elements.models.forEach(child => {
                        const childIds = getElementAndDescendantIds(child);
                        childIds.forEach(id => ids.add(id));
                    });
                }
            }
            return ids;
        }

        function openAdaptCopyModal(targetView) {
            const topView = findTopLevelElementView(targetView);
            if (!topView) {
                alert('Could not locate the section or container on canvas.');
                return;
            }

            activeTargetTopView = topView;
            activeTargetElementView = targetView;
            const extracted = extractSemanticSlotsFromView(topView);

            if (!extracted || !extracted.allSlots || extracted.allSlots.length === 0) {
                alert('Could not extract text slots from this section.');
                return;
            }

            activeAllSlots = extracted.allSlots;

            // Determine if a specific widget or sub-container/card was targeted
            const isSpecificTarget = Boolean(targetView && targetView !== topView && targetView.model);
            const targetModelIds = isSpecificTarget ? getElementAndDescendantIds(targetView.model) : new Set();
            activeTargetSlotIds = isSpecificTarget 
                ? activeAllSlots.filter(s => targetModelIds.has(s.model.get('id'))).map(s => s.id)
                : activeAllSlots.map(s => s.id);

            // Configure Scope Selector Bar
            if (isSpecificTarget && activeTargetSlotIds.length > 0 && activeTargetSlotIds.length < activeAllSlots.length) {
                activeScopeMode = 'selected';
                const elType = targetView.model.get('elType');
                const widgetType = targetView.model.get('widgetType') || elType;
                const typeLabel = elType === 'widget' 
                    ? (widgetType === 'supercomponent' ? 'SuperComponent' : `${widgetType.toUpperCase()} Widget`)
                    : 'Card / Container';
                
                $('#supercraft-scope-target-badge').text(`${typeLabel} (${activeTargetSlotIds.length} slot${activeTargetSlotIds.length > 1 ? 's' : ''})`);
                $('#supercraft-scope-target-btn')
                    .text(`Selected ${elType === 'widget' ? 'Widget' : 'Card'} (${activeTargetSlotIds.length})`)
                    .addClass('active');
                $('#supercraft-scope-section-btn')
                    .text(`Entire Section (${activeAllSlots.length})`)
                    .removeClass('active');
                $('#supercraft-scope-bar').show();
            } else {
                activeScopeMode = 'all';
                $('#supercraft-scope-bar').hide();
            }

            function applyScopeSelectionToSlots() {
                if (activeScopeMode === 'selected') {
                    const tSet = new Set(activeTargetSlotIds);
                    activeAllSlots.forEach(s => {
                        s.userRole = tSet.has(s.id) ? '' : 'ignore';
                    });
                } else {
                    activeAllSlots.forEach(s => {
                        s.userRole = '';
                    });
                }
            }
            applyScopeSelectionToSlots();

            $('#supercraft-scope-target-btn').off('click').on('click', function() {
                activeScopeMode = 'selected';
                $(this).addClass('active');
                $('#supercraft-scope-section-btn').removeClass('active');
                applyScopeSelectionToSlots();
                renderGroupedSlots(activeSelectedIdx);
            });

            $('#supercraft-scope-section-btn').off('click').on('click', function() {
                activeScopeMode = 'all';
                $(this).addClass('active');
                $('#supercraft-scope-target-btn').removeClass('active');
                applyScopeSelectionToSlots();
                renderGroupedSlots(activeSelectedIdx);
            });

            // Reset modal state to Configuration View
            $('#supercraft-config-panel').show();
            $('#supercraft-review-panel').hide();
            $('#supercraft-adapt-user-prompt').val('');
            $('#supercraft-submit-adapt-btn').prop('disabled', false).text('✨ Generate Adaptations');

            const hasSections = Array.isArray(sections) && sections.length > 0;
            const businessContext = (window.supercraftBuilderVars && window.supercraftBuilderVars.businessContext) || null;

            // Display Business Context Banner if available
            if (businessContext && typeof businessContext === 'object') {
                const bName = escapeHTML(businessContext.business_name || 'Business Profile');
                const bSum = escapeHTML((businessContext.summary || '').substring(0, 150));
                let bannerHtml = `
                    <div class="supercraft-context-title">🏢 Active Context: ${bName}</div>
                    <div class="supercraft-context-desc">${bSum}${businessContext.summary && businessContext.summary.length > 150 ? '...' : ''}</div>
                `;
                if (Array.isArray(businessContext.services) && businessContext.services.length > 0) {
                    bannerHtml += `<div class="supercraft-context-pills">`;
                    businessContext.services.slice(0, 6).forEach(s => {
                        const st = escapeHTML(typeof s === 'object' ? (s.title || '') : s);
                        if (st) bannerHtml += `<span class="supercraft-context-pill">✓ ${st}</span>`;
                    });
                    bannerHtml += `</div>`;
                }
                $('#supercraft-active-context-banner').html(bannerHtml).show();
            } else {
                $('#supercraft-active-context-banner').hide();
            }

            if (hasSections) {
                $('#supercraft-section-select-group').show();
                $('#supercraft-prompt-label').text('Custom Instruction / Direction (Optional):');
                $('#supercraft-prompt-hint').text('(Optional custom focus or tone guidance)');
                $('#supercraft-source-panel-title').text('Source Document Copy');

                // Determine preselected section index
                let preselectedIdx = 0;
                const settings = topView.model ? topView.model.get('settings') : null;
                if (settings && typeof settings.get === 'function' && typeof settings.get('_supercraft_section_idx') !== 'undefined') {
                    preselectedIdx = parseInt(settings.get('_supercraft_section_idx'), 10);
                    if (isNaN(preselectedIdx) || preselectedIdx < 0 || preselectedIdx >= sections.length) {
                        preselectedIdx = 0;
                    }
                }
                activeSelectedIdx = preselectedIdx;

                // Populate Section Dropdown
                const $secSelect = $('#supercraft-adapt-section-select');
                $secSelect.empty();
                sections.forEach((sec, idx) => {
                    const title = sec.heading || sec.title || (sec.section_type ? sec.section_type.toUpperCase() : `Section ${idx + 1}`);
                    const optText = `Section ${idx + 1}: ${sec.section_type || 'General'} - "${title}"`;
                    const $opt = $('<option>').val(idx).text(optText);
                    if (idx === preselectedIdx) {
                        $opt.prop('selected', true);
                    }
                    $secSelect.append($opt);
                });

                updateSourcePreview(preselectedIdx);
                renderGroupedSlots(preselectedIdx);

                $secSelect.off('change').on('change', function() {
                    const newIdx = parseInt($(this).val(), 10);
                    activeSelectedIdx = newIdx;
                    updateSourcePreview(newIdx);
                    renderGroupedSlots(newIdx);
                });
            } else {
                // Context-Only / Manual Page Mode
                $('#supercraft-section-select-group').hide();
                $('#supercraft-prompt-label').text('Section Prompt / Instructions (Required):');
                $('#supercraft-prompt-hint').text('(Instruct AI what this section is about)');
                $('#supercraft-source-panel-title').text('Business Context & Offerings');

                if (businessContext) {
                    let bHtml = `<div style="margin-bottom:8px;"><strong style="font-size:14px; color:#0f172a;">${escapeHTML(businessContext.business_name || 'Business Overview')}</strong></div>`;
                    if (businessContext.summary) {
                        bHtml += `<div style="font-size:12px; color:#475569; line-height:1.4; margin-bottom:10px;">${escapeHTML(businessContext.summary)}</div>`;
                    }
                    if (Array.isArray(businessContext.services) && businessContext.services.length > 0) {
                        bHtml += `<strong>Services (${businessContext.services.length}):</strong><ul style="margin:4px 0 0 16px; padding:0; font-size:12px; color:#334155;">`;
                        businessContext.services.forEach(s => {
                            const st = typeof s === 'object' ? s.title : s;
                            const sd = typeof s === 'object' ? s.description : '';
                            bHtml += `<li><strong>${escapeHTML(st || '')}</strong>${sd ? ': ' + escapeHTML(sd.substring(0, 60)) + '...' : ''}</li>`;
                        });
                        bHtml += `</ul>`;
                    }
                    $('#supercraft-source-copy-preview').html(bHtml);
                    $('#supercraft-source-items-badge').text(`Services: ${businessContext.services ? businessContext.services.length : 0}`);
                } else {
                    $('#supercraft-source-copy-preview').html('<div style="color:#64748b; font-size:12px;">No document context uploaded yet. You can still adapt copy using your custom instructions above.</div>');
                    $('#supercraft-source-items-badge').text('Manual');
                }

                renderGroupedSlots(0);
                $('#supercraft-adapt-notice').hide();
            }

            function updateSlotCountsBadge() {
                const included = $('.supercraft-slot-include:checked').length;
                $('#supercraft-detected-slots-badge').text(`${included} of ${activeAllSlots.length} text fields`);
                const cardGroups = new Set();
                activeAllSlots.forEach(s => {
                    if (s.isCard && s.userRole !== 'ignore') cardGroups.add(s.groupId);
                });
                return cardGroups.size;
            }

            // Render Detected Slots List grouped into Card Units and Section Header
            function renderGroupedSlots(secIdx) {
                const sec = sections[secIdx];
                const items = (sec && Array.isArray(sec.items)) ? sec.items : (businessContext && Array.isArray(businessContext.services) ? businessContext.services : []);

                // Group activeAllSlots by groupId
                const groups = [];
                const groupMap = {};

                activeAllSlots.forEach(slot => {
                    const gId = slot.groupId || 'section_header';
                    if (!groupMap[gId]) {
                        groupMap[gId] = {
                            id: gId,
                            title: slot.groupTitle || (slot.isCard ? `Card ${(slot.cardIndex || 0) + 1}` : 'Section Header'),
                            isCard: Boolean(slot.isCard),
                            cardIndex: typeof slot.cardIndex === 'number' ? slot.cardIndex : -1,
                            slots: []
                        };
                        groups.push(groupMap[gId]);
                    }
                    groupMap[gId].slots.push(slot);
                });

                let slotsHtml = '';
                groups.forEach(grp => {
                    let mappedBadge = '';
                    if (grp.isCard && grp.cardIndex >= 0) {
                        const mappedItem = items[grp.cardIndex];
                        if (mappedItem) {
                            const itemTitle = typeof mappedItem === 'object' ? (mappedItem.title || mappedItem.heading || `Point ${grp.cardIndex + 1}`) : String(mappedItem);
                            const displayTitle = itemTitle.length > 28 ? (itemTitle.substring(0, 28) + '…') : itemTitle;
                            mappedBadge = `<span class="supercraft-slot-group-mapped" title="${escapeHTML(itemTitle)}">Mapped: "${escapeHTML(displayTitle)}"</span>`;
                        } else {
                            mappedBadge = `<span class="supercraft-slot-group-mapped" style="color:#64748b; background:#f1f5f9;">Prompt Guided</span>`;
                        }
                    } else if (grp.id === 'section_header') {
                        mappedBadge = `<span class="supercraft-slot-group-mapped" style="color:#059669; background:#ecfdf5;">Section Level</span>`;
                    }

                    slotsHtml += `
                        <div class="supercraft-slot-group-block">
                            <div class="supercraft-slot-group-header">
                                <span>${escapeHTML(grp.title)}</span>
                                ${mappedBadge}
                            </div>
                            <div class="supercraft-slot-group-items">
                    `;

                    grp.slots.forEach(slot => {
                        const words = (slot.currentText || '').trim().split(/\s+/).filter(Boolean).length;
                        const wordsLabel = words > 0 ? ` • ${words} ${words === 1 ? 'word' : 'words'}` : '';
                        const isChecked = slot.userRole !== 'ignore';
                        const isTargetSlot = (activeScopeMode !== 'selected' || activeTargetSlotIds.includes(slot.id));

                        let targetBadge = '';
                        if (activeScopeMode === 'selected') {
                            if (isTargetSlot) {
                                targetBadge = `<span style="font-size:10px; font-weight:700; color:#4338ca; background:#e0e7ff; padding:1px 6px; border-radius:4px; margin-left:6px;">🎯 TARGET</span>`;
                            } else {
                                targetBadge = `<span style="font-size:10px; font-weight:600; color:#64748b; background:#f1f5f9; padding:1px 6px; border-radius:4px; margin-left:6px;">Context Only</span>`;
                            }
                        }

                        slotsHtml += `
                            <div class="supercraft-slot-card ${isTargetSlot ? 'is-target-slot' : 'is-context-slot'}" data-slot-id="${escapeHTML(slot.id)}" style="${!isTargetSlot ? 'opacity:0.65; border-style:dashed;' : ''}">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                                    <label class="supercraft-slot-include-label" style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600; cursor:pointer;">
                                        <input type="checkbox" class="supercraft-slot-include" data-slot-id="${escapeHTML(slot.id)}" ${isChecked ? 'checked' : ''}> Adapt this text ${targetBadge}
                                    </label>
                                    <span class="supercraft-slot-tag">${escapeHTML(slot.widgetType.toUpperCase())}${wordsLabel}</span>
                                </div>
                                <div class="supercraft-slot-text-preview" title="${escapeHTML(slot.currentText)}">"${escapeHTML(slot.currentText)}"</div>
                            </div>
                        `;
                    });

                    slotsHtml += `
                            </div>
                        </div>
                    `;
                });

                $('#supercraft-detected-slots-list').html(slotsHtml);

                $('.supercraft-slot-include').off('change').on('change', function() {
                    const changedSlot = activeAllSlots.find(s => s.id === $(this).data('slot-id'));
                    if (changedSlot) changedSlot.userRole = $(this).is(':checked') ? '' : 'ignore';
                    updateSlotCountsBadge();
                });

                updateSlotCountsBadge();
            }

            // Update Source Copy Preview
            function updateSourcePreview(secIdx) {
                const sec = sections[secIdx];
                if (!sec) return;

                const itemsCount = Array.isArray(sec.items) ? sec.items.length : 0;
                $('#supercraft-source-items-badge').text(`Items: ${itemsCount}`);

                let srcHtml = `
                    <div style="margin-bottom:6px;"><strong>Heading:</strong> ${escapeHTML(sec.heading || 'N/A')}</div>
                    <div style="margin-bottom:6px;"><strong>Subheading:</strong> ${escapeHTML(sec.subheading || 'N/A')}</div>
                    <div style="margin-bottom:6px;"><strong>CTA Label:</strong> ${escapeHTML(sec.cta_label || 'N/A')}</div>
                `;

                if (itemsCount > 0) {
                    srcHtml += `<div style="margin-top:8px;"><strong>Itemized Points (${itemsCount}):</strong><ul style="margin:4px 0 0 16px; padding:0;">`;
                    sec.items.forEach((it, i) => {
                        const t = typeof it === 'object' ? (it.title || it.heading || `Point ${i + 1}`) : it;
                        const d = typeof it === 'object' ? (it.description || it.body || '') : '';
                        srcHtml += `<li><strong>${escapeHTML(t)}</strong>${d ? ': ' + escapeHTML(d.substring(0, 60)) + '...' : ''}</li>`;
                    });
                    srcHtml += `</ul></div>`;
                }

                $('#supercraft-source-copy-preview').html(srcHtml);

                const destPoints = updateSlotCountsBadge();
                const $notice = $('#supercraft-adapt-notice');
                if (destPoints > 0 && itemsCount > 0 && destPoints !== itemsCount) {
                    $notice.removeClass('notice-warning').show().html(`
                        <strong>ℹ Structure Preservation:</strong> The copy document contains <strong>${itemsCount} points</strong>, but this component has <strong>${destPoints} fixed slots</strong>. 
                        The AI will synthesize and fit the <strong>${destPoints} best points</strong> to preserve your exact visual layout and cards.
                    `);
                } else if (destPoints > 0 && itemsCount === 0) {
                    $notice.addClass('notice-warning').show().html(`
                        <strong>Notice:</strong> This component has <strong>${destPoints} card slots</strong>, but the selected section has no itemized points. The AI will author compelling points based on the document context to fill the slots.
                    `);
                } else {
                    $notice.hide();
                }
            }

            $adaptModal.show();
        }

        // Render Before & After Review Screen
        function renderReviewDiffScreen(updates) {
            const updateMap = {};
            (updates || []).forEach(u => { updateMap[u.id] = u.text; });

            const groups = [];
            const groupMap = {};

            activeAllSlots.forEach(slot => {
                if (slot.userRole === 'ignore') return;
                const gId = slot.groupId || 'section_header';
                if (!groupMap[gId]) {
                    groupMap[gId] = {
                        id: gId,
                        title: slot.groupTitle || (slot.isCard ? `Card ${(slot.cardIndex || 0) + 1}` : 'Section Header'),
                        isCard: Boolean(slot.isCard),
                        slots: []
                    };
                    groups.push(groupMap[gId]);
                }
                groupMap[gId].slots.push(slot);
            });

            let html = '';
            groups.forEach(grp => {
                html += `
                    <div class="supercraft-slot-group-block">
                        <div class="supercraft-slot-group-header">
                            <span>${escapeHTML(grp.title)}</span>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:10px;">
                `;

                grp.slots.forEach(slot => {
                    const origText = slot.currentText || '';
                    const proposedText = (slot.id in updateMap) ? updateMap[slot.id] : origText;

                    html += `
                        <div class="supercraft-diff-card" id="diff-card-${escapeHTML(slot.id)}" data-slot-id="${escapeHTML(slot.id)}">
                            <div class="supercraft-diff-card-header">
                                <span class="supercraft-slot-tag">${escapeHTML(slot.widgetType.toUpperCase())}</span>
                                <button type="button" class="supercraft-slot-regen-trigger" data-slot-id="${escapeHTML(slot.id)}">🔄 Regenerate</button>
                            </div>
                            <div class="supercraft-diff-grid">
                                <div class="supercraft-diff-col supercraft-diff-before">
                                    <div class="supercraft-diff-label">Original Text:</div>
                                    <div class="supercraft-diff-content">"${escapeHTML(origText)}"</div>
                                </div>
                                <div class="supercraft-diff-col supercraft-diff-after">
                                    <div class="supercraft-diff-label">Proposed AI Copy (Editable):</div>
                                    <textarea class="supercraft-diff-editable" data-slot-id="${escapeHTML(slot.id)}">${escapeHTML(proposedText)}</textarea>
                                </div>
                            </div>
                            <div class="supercraft-inline-regen-box" id="regen-box-${escapeHTML(slot.id)}" style="display:none;">
                                <input type="text" class="supercraft-inline-regen-input" id="regen-input-${escapeHTML(slot.id)}" placeholder="Revision instruction (e.g. 'make shorter', 'emphasize compliance')...">
                                <button type="button" class="supercraft-inline-regen-submit" data-slot-id="${escapeHTML(slot.id)}">Regenerate</button>
                                <button type="button" class="supercraft-inline-regen-cancel" data-slot-id="${escapeHTML(slot.id)}">Cancel</button>
                            </div>
                        </div>
                    `;
                });

                html += `
                        </div>
                    </div>
                `;
            });

            $('#supercraft-review-diff-container').html(html);

            // Toggle per-slot inline regen box
            $('.supercraft-slot-regen-trigger').off('click').on('click', function() {
                const sid = $(this).data('slot-id');
                const $box = $(`#regen-box-${sid}`);
                $box.toggle();
                if ($box.is(':visible')) {
                    $box.find('.supercraft-inline-regen-input').focus();
                }
            });

            $('.supercraft-inline-regen-cancel').off('click').on('click', function() {
                const sid = $(this).data('slot-id');
                $(`#regen-box-${sid}`).hide();
            });

            // Per-slot regeneration submit
            $('.supercraft-inline-regen-submit').off('click').on('click', function() {
                const sid = $(this).data('slot-id');
                const comment = $(`#regen-input-${sid}`).val().trim();
                const $card = $(`#diff-card-${sid}`);
                const $subBtn = $(this);
                $subBtn.prop('disabled', true).text('Regenerating...');
                $card.addClass('is-regenerating');

                const targetSlot = activeAllSlots.find(s => s.id === sid);
                const fieldName = targetSlot ? [targetSlot.settingKey, targetSlot.itemField || targetSlot.tabField].filter(Boolean).join('.') : '';

                const regenSlotPayload = targetSlot ? [{
                    id: targetSlot.id,
                    widget_type: targetSlot.widgetType,
                    field: fieldName,
                    text: $(`textarea[data-slot-id="${sid}"]`).val() || targetSlot.currentText || '',
                    word_count: (targetSlot.currentText || '').trim().split(/\s+/).filter(Boolean).length,
                    depth: targetSlot.depth,
                    parent_id: targetSlot.parentId,
                    group_index: 0,
                    group_id: targetSlot.groupId || 'section_header',
                    group_title: targetSlot.groupTitle || 'Card 1',
                    card_index: typeof targetSlot.cardIndex === 'number' ? targetSlot.cardIndex : -1,
                    is_card: Boolean(targetSlot.isCard),
                    hint_role: targetSlot.detectedRole || ''
                }] : [];

                const userPrompt = $('#supercraft-adapt-user-prompt').val() || '';
                const apiEndpoint = (window.supercraftBuilderVars && window.supercraftBuilderVars.apiEndpoint) 
                    ? window.supercraftBuilderVars.apiEndpoint.replace('host.docker.internal', 'localhost') 
                    : 'http://localhost:3000/api/sitebuilder';
                const businessContext = (window.supercraftBuilderVars && window.supercraftBuilderVars.businessContext) || null;

                $.ajax({
                    url: `${apiEndpoint}/adapt-copy-flat`,
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        source_copy: activeSourceCopyPayload,
                        user_prompt: userPrompt,
                        business_context: businessContext,
                        revision_instruction: comment,
                        target_slot_id: sid,
                        slots: regenSlotPayload.length ? regenSlotPayload : activeFlatSlotsPayload
                    }),
                    timeout: 45000
                }).done(function(res) {
                    if (res && res.status === 'success' && Array.isArray(res.updates)) {
                        const match = res.updates.find(u => u.id === sid);
                        if (match) {
                            $(`textarea[data-slot-id="${sid}"]`).val(match.text);
                            $(`#regen-box-${sid}`).hide();
                            $(`#regen-input-${sid}`).val('');
                            showToastNotice('Slot revised successfully!');
                        }
                    }
                }).fail(function(xhr, status, err) {
                    alert('Regeneration failed: ' + ((xhr.responseJSON && xhr.responseJSON.error) || err || 'Server error'));
                }).always(function() {
                    $subBtn.prop('disabled', false).text('Regenerate');
                    $card.removeClass('is-regenerating');
                });
            });

            // Show Review Panel & Hide Config Panel
            $('#supercraft-config-panel').hide();
            $('#supercraft-review-panel').show();
        }

        // Global Regenerate All Handler (Respects activeScopeMode)
        $adaptModal.on('click', '#supercraft-regen-all-btn', function() {
            const promptScope = (activeScopeMode === 'selected') ? 'selected element' : 'entire section';
            const comment = prompt(`Enter revision instructions for ${promptScope} (optional):`, '');
            if (comment === null) return;

            const $btn = $(this);
            $btn.prop('disabled', true).text(`🔄 Regenerating ${activeScopeMode === 'selected' ? 'Selection...' : 'All...'}`);

            const apiEndpoint = (window.supercraftBuilderVars && window.supercraftBuilderVars.apiEndpoint) 
                ? window.supercraftBuilderVars.apiEndpoint.replace('host.docker.internal', 'localhost') 
                : 'http://localhost:3000/api/sitebuilder';
            const businessContext = (window.supercraftBuilderVars && window.supercraftBuilderVars.businessContext) || null;
            const userPrompt = $('#supercraft-adapt-user-prompt').val() || '';

            // Read latest edited text as current slot text
            const refreshedFlatSlots = activeFlatSlotsPayload.map(s => {
                const curVal = $(`textarea[data-slot-id="${s.id}"]`).val();
                return Object.assign({}, s, { text: (curVal && curVal.trim()) ? curVal : s.text });
            });

            const targetIdsForRegenAll = (activeScopeMode === 'selected' && activeTargetSlotIds.length > 0)
                ? activeTargetSlotIds
                : [];

            $.ajax({
                url: `${apiEndpoint}/adapt-copy-flat`,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    source_copy: activeSourceCopyPayload,
                    user_prompt: userPrompt,
                    business_context: businessContext,
                    revision_instruction: comment,
                    slots: refreshedFlatSlots,
                    target_slot_ids: targetIdsForRegenAll
                }),
                timeout: 60000
            }).done(function(res) {
                if (res && res.status === 'success' && Array.isArray(res.updates) && res.updates.length > 0) {
                    res.updates.forEach(u => {
                        $(`textarea[data-slot-id="${u.id}"]`).val(u.text);
                    });
                    showToastNotice('Slots regenerated with revision instructions!');
                }
            }).fail(function(xhr, status, err) {
                alert('Regeneration failed: ' + ((xhr.responseJSON && xhr.responseJSON.error) || err || 'Server error'));
            }).always(function() {
                $btn.prop('disabled', false).text(activeScopeMode === 'selected' ? '🔄 Regenerate Selection...' : '🔄 Regenerate All...');
            });
        });

        // Back to Config button in Review View
        $adaptModal.on('click', '#supercraft-review-back-btn', function() {
            $('#supercraft-review-panel').hide();
            $('#supercraft-config-panel').show();
        });

        // Apply Reviewed Copy to Elementor Canvas
        $adaptModal.on('click', '#supercraft-apply-review-btn', function() {
            const finalUpdates = [];
            $('.supercraft-diff-editable').each(function() {
                const sid = $(this).data('slot-id');
                const val = $(this).val();
                if (sid && typeof val === 'string') {
                    finalUpdates.push({ id: sid, text: val });
                }
            });

            if (finalUpdates.length === 0) {
                alert('No updates to apply.');
                return;
            }

            applyFlatCopyInPlace(activeTargetTopView, finalUpdates, activeSelectedIdx);
            $adaptModal.hide();
            showToastNotice('✨ Section copy adapted & applied successfully to canvas!');
        });

        // Submit Initial In-Place Copy Adaptation
        $adaptModal.on('click', '#supercraft-submit-adapt-btn', function() {
            const $btn = $(this);
            if ($btn.prop('disabled')) return;

            const hasSections = Array.isArray(sections) && sections.length > 0;
            const businessContext = (window.supercraftBuilderVars && window.supercraftBuilderVars.businessContext) || null;
            const userPrompt = $('#supercraft-adapt-user-prompt').val().trim();

            let selectedCopy = null;
            if (hasSections) {
                const selectedIdx = parseInt($('#supercraft-adapt-section-select').val(), 10);
                activeSelectedIdx = selectedIdx;
                selectedCopy = sections[selectedIdx];
            } else {
                if (!userPrompt && !businessContext) {
                    alert('Please enter an instruction or prompt for what this section should describe.');
                    return;
                }
                selectedCopy = {
                    section_type: 'custom',
                    heading: userPrompt || 'Custom Section',
                    subheading: '',
                    items: []
                };
            }

            if (!activeTargetTopView || activeAllSlots.length === 0) {
                alert('Component context missing.');
                return;
            }

            $btn.prop('disabled', true).text('✨ AI Generating Adaptations...');

            const apiEndpoint = (window.supercraftBuilderVars && window.supercraftBuilderVars.apiEndpoint) 
                ? window.supercraftBuilderVars.apiEndpoint.replace('host.docker.internal', 'localhost') 
                : 'http://localhost:3000/api/sitebuilder';

            // Build rich document context from all sections
            let docSummary = '';
            if (hasSections) {
                docSummary = sections.map((s, i) => {
                    const h = s.heading || s.title || '';
                    const sh = s.subheading || '';
                    return `Section ${i + 1} (${s.section_type || 'general'}): ${h}${sh ? ' - ' + sh : ''}`;
                }).join('\n');
            } else if (businessContext) {
                docSummary = businessContext.summary || '';
            }

            activeSourceCopyPayload = Object.assign({}, selectedCopy, {
                doc_context: selectedCopy.doc_context || docSummary
            });

            const parentOrder = {};
            activeFlatSlotsPayload = [];
            activeAllSlots.forEach(slot => {
                const pKey = slot.parentId || 'root';
                if (!(pKey in parentOrder)) parentOrder[pKey] = Object.keys(parentOrder).length;
                const fieldName = [slot.settingKey, slot.itemField || slot.tabField].filter(Boolean).join('.');
                activeFlatSlotsPayload.push({
                    id: slot.id,
                    widget_type: slot.widgetType,
                    field: fieldName,
                    text: slot.currentText || '',
                    word_count: (slot.currentText || '').trim().split(/\s+/).filter(Boolean).length,
                    depth: slot.depth,
                    parent_id: slot.parentId,
                    group_index: parentOrder[pKey],
                    group_id: slot.groupId || 'section_header',
                    group_title: slot.groupTitle || (slot.isCard ? `Card ${(slot.cardIndex || 0) + 1}` : 'Section Header'),
                    card_index: typeof slot.cardIndex === 'number' ? slot.cardIndex : -1,
                    is_card: Boolean(slot.isCard),
                    item_index: slot.itemIndex,
                    hint_role: slot.detectedRole || ''
                });
            });

            // Target slot IDs to rewrite (selective element vs entire section)
            const targetSlotIdsToSend = (activeScopeMode === 'selected' && activeTargetSlotIds.length > 0)
                ? activeTargetSlotIds
                : activeAllSlots.filter(s => s.userRole !== 'ignore').map(s => s.id);

            if (targetSlotIdsToSend.length === 0) {
                alert('No text fields selected for adaptation.');
                $btn.prop('disabled', false).text('✨ Generate Adaptations');
                return;
            }

            if (activeFlatSlotsPayload.length > 0) {
                $.ajax({
                    url: `${apiEndpoint}/adapt-copy-flat`,
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        source_copy: activeSourceCopyPayload,
                        user_prompt: userPrompt,
                        business_context: businessContext,
                        slots: activeFlatSlotsPayload,
                        target_slot_ids: targetSlotIdsToSend
                    }),
                    timeout: 60000
                }).done(function(res) {
                    if (res && res.status === 'success' && Array.isArray(res.updates) && res.updates.length > 0) {
                        console.log('[Supercraft Builder] AI adaptation response:', res);
                        renderReviewDiffScreen(res.updates);
                    } else {
                        alert('Adaptation returned no updates. Please check your instructions.');
                    }
                }).fail(function(xhr, status, err) {
                    console.error('[Supercraft Builder] Adapt failed:', err);
                    alert('AI request failed: ' + ((xhr.responseJSON && xhr.responseJSON.error) || err || xhr.statusText || 'Server error'));
                }).always(function() {
                    $btn.prop('disabled', false).text('✨ Generate Adaptations');
                });
                return;
            }
        });

        // Helper to apply settings and trigger immediate real-time canvas re-render without page refresh
        function applySettingsAndReRender(slot, settingsObj) {
            if (!slot || !slot.model || !settingsObj) return;
            const model = slot.model;
            const modelId = model.get ? model.get('id') : null;

            let container = null;
            if (typeof elementor !== 'undefined' && typeof elementor.getContainer === 'function' && modelId) {
                try {
                    container = elementor.getContainer(modelId);
                } catch (e) {
                    console.warn('[Supercraft Builder] getContainer error:', e);
                }
            }

            // 1. Elementor official command API ($e.run)
            let commandExecuted = false;
            if (typeof $e !== 'undefined' && typeof $e.run === 'function' && container) {
                try {
                    $e.run('document/elements/settings', {
                        container: container,
                        settings: settingsObj
                    });
                    commandExecuted = true;
                } catch (e) {
                    console.warn('[Supercraft Builder] $e.run settings error:', e);
                }
            }

            // 2. Direct model update
            Object.keys(settingsObj).forEach(k => {
                try {
                    if (typeof model.setSetting === 'function') {
                        model.setSetting(k, settingsObj[k]);
                    }
                } catch (e) {}
            });

            if (model.get && model.get('settings')) {
                const s = model.get('settings');
                try {
                    if (typeof s.setExternalChange === 'function') {
                        s.setExternalChange(settingsObj);
                    } else if (typeof s.set === 'function') {
                        s.set(settingsObj);
                    }
                } catch (e) {}
            }

            // 3. Force live canvas view re-render immediately
            if (container) {
                try {
                    // For HTML widgets, immediately update the DOM in the live preview canvas
                    if (slot.widgetType === 'html' && settingsObj.html) {
                        if (container.view && container.view.$el) {
                            const $wc = container.view.$el.find('.elementor-widget-container');
                            if ($wc.length) $wc.html(settingsObj.html);
                        }
                        if (typeof elementor !== 'undefined' && elementor.$previewContents && modelId) {
                            const $iframeWidget = elementor.$previewContents.find('.elementor-element-' + modelId + ' .elementor-widget-container');
                            if ($iframeWidget.length) $iframeWidget.html(settingsObj.html);
                        }
                    }

                    if (container.view) {
                        if (typeof container.view.renderHTML === 'function') {
                            container.view.renderHTML();
                        } else if (typeof container.view.render === 'function') {
                            container.view.render();
                        }
                        if (typeof container.view.renderUI === 'function') {
                            container.view.renderUI();
                        }
                    }
                    if (typeof container.render === 'function') {
                        container.render();
                    }
                } catch (e) {
                    console.warn('[Supercraft Builder] view render error:', e);
                }
            }

            // 4. Trigger supercomponent:update event if applicable
            if (modelId && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
                try {
                    window.dispatchEvent(new CustomEvent('supercomponent:update', {
                        detail: { instanceId: modelId }
                    }));
                } catch (e) {}
            }
        }

        // Helper to update text in various Elementor widget models preserving original settings
        function updateSlotValue(slot, newText) {
            if (!slot || !slot.model || typeof newText !== 'string' || !newText.trim()) return;
            const text = newText.trim();
            const wt = slot.widgetType;
            const key = slot.settingKey;
            let settingsObj = {};

            if (wt === 'heading') {
                settingsObj.title = text;
            } else if (wt === 'text-editor') {
                settingsObj.editor = /<[a-z][\s\S]*>/i.test(text) ? text : `<p>${text}</p>`;
            } else if (wt === 'button') {
                settingsObj.text = text;
            } else if (wt === 'counter') {
                settingsObj = {};
                if (key === 'title') {
                    settingsObj.title = text;
                } else if (key === 'metric') {
                    const m = text.match(/^([^\d]*?)(\d+(?:[.,]\d+)?)\s*([+%kKmMbB\w]*?)$/);
                    if (m) {
                        const num = parseFloat(m[2].replace(/,/g, ''));
                        if (!isNaN(num)) {
                            settingsObj.ending_number = num;
                            settingsObj.prefix = (m[1] || '').trim();
                            settingsObj.suffix = (m[3] || '').trim();
                        }
                    } else {
                        const fallbackNum = parseFloat(text.replace(/[^\d.]/g, ''));
                        if (!isNaN(fallbackNum)) {
                            settingsObj.ending_number = fallbackNum;
                        }
                    }
                } else {
                    const hadEmptyTitle = !slot.counterTitle || slot.counterTitle.trim() === '';
                    let prefix = '';
                    let rawNum = '';
                    let suffix = '';
                    let title = '';

                    // Try matching: optional prefix + digits + optional suffix + optional title
                    const standardMatch = text.match(/^([^\d]*?)(\d+(?:[.,]\d+)?)\s*([+%kKmMbB\w]*?)(?:\s+(.+))?$/);
                    if (standardMatch) {
                        prefix = (standardMatch[1] || '').trim();
                        rawNum = (standardMatch[2] || '').replace(/,/g, '');
                        suffix = (standardMatch[3] || '').trim();
                        title = (standardMatch[4] || '').trim();
                    } else {
                        const endMatch = text.match(/^(.+?)\s+([^\d]*?)(\d+(?:[.,]\d+)?)\s*([+%kKmMbB\w]*?)$/);
                        if (endMatch) {
                            title = (endMatch[1] || '').trim();
                            prefix = (endMatch[2] || '').trim();
                            rawNum = (endMatch[3] || '').replace(/,/g, '');
                            suffix = (endMatch[4] || '').trim();
                        } else {
                            title = text;
                        }
                    }

                    if (rawNum) {
                        const num = parseFloat(rawNum);
                        if (!isNaN(num)) {
                            settingsObj.ending_number = num;
                            settingsObj.prefix = prefix;
                            settingsObj.suffix = suffix;
                        }
                    }

                    if (hadEmptyTitle) {
                        // Counter was originally configured with an empty title; keep it empty!
                        settingsObj.title = '';
                    } else if (title) {
                        settingsObj.title = title;
                    }
                }
            } else if (wt === 'icon-list') {
                const settings = slot.model.get('settings');
                const rawList = getSettingArray(settings, 'icon_list');
                if (rawList.length > 0) {
                    const newList = JSON.parse(JSON.stringify(rawList));
                    const idx = typeof slot.itemIndex === 'number' ? slot.itemIndex : 0;
                    if (newList[idx]) {
                        newList[idx].text = text;
                        settingsObj.icon_list = newList;
                    }
                }
            } else if (wt === 'supercomponent') {
                const settings = slot.model.get('settings');
                if (slot.repeaterKey && typeof slot.itemIndex === 'number' && slot.itemField) {
                    if (!slot.model._workingRepeaters) slot.model._workingRepeaters = {};
                    if (!slot.model._workingRepeaters[slot.repeaterKey]) {
                        const rawList = getSettingArray(settings, slot.repeaterKey);
                        slot.model._workingRepeaters[slot.repeaterKey] = JSON.parse(JSON.stringify(rawList));
                    }
                    const list = slot.model._workingRepeaters[slot.repeaterKey];
                    if (list[slot.itemIndex]) {
                        list[slot.itemIndex][slot.itemField] = text;
                        settingsObj[slot.repeaterKey] = list;
                    }
                } else if (slot.settingKey) {
                    settingsObj[slot.settingKey] = text;
                }
            } else if (wt === 'accordion' || wt === 'toggle') {
                const settings = slot.model.get('settings');
                const rawTabs = getSettingArray(settings, 'tabs');
                if (rawTabs.length > 0) {
                    const newTabs = JSON.parse(JSON.stringify(rawTabs));
                    const idx = typeof slot.tabIndex === 'number' ? slot.tabIndex : 0;
                    if (newTabs[idx]) {
                        const field = slot.tabField || 'tab_title';
                        newTabs[idx][field] = (field === 'tab_content' && !/<[a-z][\s\S]*>/i.test(text)) ? `<p>${text}</p>` : text;
                        settingsObj.tabs = newTabs;
                    }
                }
            } else if (wt === 'html') {
                const settings = slot.model.get('settings');
                if (!slot.model._workingHtml) {
                    slot.model._workingHtml = String(settings.get('html') || '');
                }
                let currentSnippet = slot.rawSnippet || slot.currentText;
                if (currentSnippet) {
                    if (slot.model._workingHtml.includes(currentSnippet)) {
                        slot.model._workingHtml = slot.model._workingHtml.split(currentSnippet).join(text);
                        settingsObj.html = slot.model._workingHtml;
                    } else {
                        // Check if currentSnippet was escaped/unescaped in the HTML markup
                        const unescaped = $('<div>').html(currentSnippet).text();
                        const escaped = $('<div>').text(currentSnippet).html();
                        if (unescaped && slot.model._workingHtml.includes(unescaped)) {
                            slot.model._workingHtml = slot.model._workingHtml.split(unescaped).join(text);
                            settingsObj.html = slot.model._workingHtml;
                        } else if (escaped && slot.model._workingHtml.includes(escaped)) {
                            slot.model._workingHtml = slot.model._workingHtml.split(escaped).join(text);
                            settingsObj.html = slot.model._workingHtml;
                        }
                    }
                }
            } else {
                if (key === 'editor' && !/<[a-z][\s\S]*>/i.test(text)) {
                    settingsObj[key] = `<p>${text}</p>`;
                } else {
                    settingsObj[key] = text;
                }
            }

            return settingsObj;
        }

        // Apply adapted copy in-place using Elementor Settings API (preserves styles, columns & structure)
        function applyAdaptedCopyInPlace(topView, headingSlot, subheadingSlot, badgeSlot, ctaSlot, pointsList, adaptedSlots, adaptedPoints, selectedSectionIdx) {
            const pendingUpdates = new Map(); // modelId => { slot, settingsObj }

            function recordSlotUpdate(slot, newText) {
                if (!slot || !slot.model || typeof newText !== 'string' || !newText.trim()) return;
                const modelId = slot.model.get ? slot.model.get('id') : slot.model.id;
                const settingsObj = updateSlotValue(slot, newText);
                if (settingsObj && modelId) {
                    if (!pendingUpdates.has(modelId)) {
                        pendingUpdates.set(modelId, { slot, settingsObj: {} });
                    }
                    Object.assign(pendingUpdates.get(modelId).settingsObj, settingsObj);
                }
            }

            // 1. Heading
            if (headingSlot && adaptedSlots.heading) {
                recordSlotUpdate(headingSlot, adaptedSlots.heading);
            }
            // 2. Subheading
            if (subheadingSlot && adaptedSlots.subheading) {
                recordSlotUpdate(subheadingSlot, adaptedSlots.subheading);
            }
            // 3. Eyebrow Badge
            if (badgeSlot && adaptedSlots.badge) {
                recordSlotUpdate(badgeSlot, adaptedSlots.badge);
            }
            // 4. CTA Button
            if (ctaSlot && adaptedSlots.cta) {
                recordSlotUpdate(ctaSlot, adaptedSlots.cta);
            }
            // 5. Item Points
            if (Array.isArray(adaptedPoints)) {
                adaptedPoints.forEach((pt, idx) => {
                    if (pointsList[idx]) {
                        const pointSlot = pointsList[idx];
                        if (pointSlot.metricSlot && (pt.metric || pt.title)) {
                            recordSlotUpdate(pointSlot.metricSlot, pt.metric || pt.title);
                        }
                        if (pointSlot.headingSlot && pt.title) {
                            recordSlotUpdate(pointSlot.headingSlot, pt.title);
                        }
                        if (pointSlot.descriptionSlot && pt.description) {
                            recordSlotUpdate(pointSlot.descriptionSlot, pt.description);
                        }
                    }
                });
            }

            // Apply all batched updates once per unique model
            pendingUpdates.forEach(({ slot, settingsObj }) => {
                applySettingsAndReRender(slot, settingsObj);
            });

            // Clean up temporary repeater working buffers
            activeAllSlots.forEach(s => {
                if (s.model && s.model._workingRepeaters) {
                    delete s.model._workingRepeaters;
                }
                if (s.model && s.model._workingHtml) {
                    delete s.model._workingHtml;
                }
            });

            // Tag container with the updated section index
            if (topView.model && topView.model.get('settings')) {
                topView.model.get('settings').set('_supercraft_section_idx', selectedSectionIdx);
            }

            // Re-render top section/container view to ensure seamless visual synchronization
            try {
                if (topView) {
                    const topContainer = (typeof elementor !== 'undefined' && typeof elementor.getContainer === 'function' && topView.model)
                        ? elementor.getContainer(topView.model.get('id'))
                        : null;
                    if (topContainer && typeof topContainer.render === 'function') {
                        topContainer.render();
                    }
                    if (typeof topView.renderHTML === 'function') {
                        topView.renderHTML();
                    } else if (typeof topView.render === 'function') {
                        topView.render();
                    }
                }
            } catch (e) {
                console.warn('[Supercraft Builder] topView render error:', e);
            }

            // Mark document dirty in Elementor so Save / Update button activates
            if (typeof elementor !== 'undefined' && elementor.saver && elementor.saver.setFlagEditorChange) {
                elementor.saver.setFlagEditorChange(true);
            }
        }

        // Apply AI-returned per-slot text (structure-agnostic): { id, text } list keyed by slot id
        function applyFlatCopyInPlace(topView, updates, selectedSectionIdx) {
            const slotById = {};
            activeAllSlots.forEach(s => { slotById[s.id] = s; });
            const pendingUpdates = new Map();

            updates.forEach(u => {
                const slot = slotById[u.id];
                if (!slot || !slot.model || typeof u.text !== 'string' || !u.text.trim()) return;
                if (u.text.trim() === (slot.currentText || '').trim()) return;
                const modelId = slot.model.get ? slot.model.get('id') : slot.model.id;
                const settingsObj = updateSlotValue(slot, u.text);
                if (settingsObj && modelId) {
                    if (!pendingUpdates.has(modelId)) pendingUpdates.set(modelId, { slot, settingsObj: {} });
                    Object.assign(pendingUpdates.get(modelId).settingsObj, settingsObj);
                }
            });

            pendingUpdates.forEach(({ slot, settingsObj }) => applySettingsAndReRender(slot, settingsObj));

            activeAllSlots.forEach(s => {
                if (s.model && s.model._workingRepeaters) delete s.model._workingRepeaters;
                if (s.model && s.model._workingHtml) delete s.model._workingHtml;
            });

            if (topView.model && topView.model.get('settings')) {
                topView.model.get('settings').set('_supercraft_section_idx', selectedSectionIdx);
            }

            try {
                const topContainer = (typeof elementor !== 'undefined' && typeof elementor.getContainer === 'function' && topView.model)
                    ? elementor.getContainer(topView.model.get('id'))
                    : null;
                if (topContainer && typeof topContainer.render === 'function') topContainer.render();
                if (typeof topView.renderHTML === 'function') topView.renderHTML();
                else if (typeof topView.render === 'function') topView.render();
            } catch (e) {
                console.warn('[Supercraft Builder] topView render error:', e);
            }

            if (typeof elementor !== 'undefined' && elementor.saver && elementor.saver.setFlagEditorChange) {
                elementor.saver.setFlagEditorChange(true);
            }
        }

        // Register Elementor Context Menu Filters for all elements including Flexbox Containers
        function initContextMenu() {
            if (typeof elementor === 'undefined' || !elementor.hooks) {
                setTimeout(initContextMenu, 300);
                return;
            }

            const elementTypes = ['section', 'container', 'column', 'widget', 'empty', 'add-section', 'document', 'main', 'container_empty', 'section_empty', 'editor'];

            elementTypes.forEach(function(elType) {
                elementor.hooks.addFilter('elements/' + elType + '/contextMenuGroups', function(groups, elementView) {
                    groups = groups || [];
                    const hasGroup = groups.some(function(g) { return g.name === 'supercraft'; });
                    if (!hasGroup) {
                        groups.push({
                            name: 'supercraft',
                            actions: [
                                {
                                    name: 'supercraft_adapt_copy',
                                    title: '✨ Supercraft Adapt Copy',
                                    icon: 'eicon-magic-wand',
                                    callback: function() {
                                        const activeView = elementView || this;
                                        openAdaptCopyModal(activeView);
                                    }
                                }
                            ]
                        });
                    }
                    return groups;
                });
            });

            // Universal behavior filters for Flexbox Containers and all element views
            ['elements/base/behaviors', 'elements/container/behaviors', 'views/add-section/behaviors'].forEach(function(filterHook) {
                elementor.hooks.addFilter(filterHook, function(behaviors, view) {
                    if (behaviors && behaviors.contextMenu) {
                        if (!behaviors.contextMenu.groups) {
                            behaviors.contextMenu.groups = [];
                        }
                        const exists = behaviors.contextMenu.groups.some(function(g) { return g.name === 'supercraft'; });
                        if (!exists) {
                            behaviors.contextMenu.groups.push({
                                name: 'supercraft',
                                actions: [
                                    {
                                        name: 'supercraft_adapt_copy',
                                        title: '✨ Supercraft Adapt Copy',
                                        icon: 'eicon-magic-wand',
                                        callback: function() {
                                            openAdaptCopyModal(view || this);
                                        }
                                    }
                                ]
                            });
                        }
                    }
                    return behaviors;
                });
            });

            console.log('[Supercraft Builder] Context menu registered across all element types and container behaviors.');
        }

        initContextMenu();
    }

    if (typeof window.elementor !== 'undefined' && window.elementor.hooks) {
        initSupercraftBuilder();
    } else {
        $(window).on('elementor:init elementor/init', initSupercraftBuilder);
        $(document).ready(function() {
            setTimeout(initSupercraftBuilder, 500);
        });
    }
})(jQuery);
