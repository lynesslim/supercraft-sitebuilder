# Spec: AI Smart Copy Adaptation, Symmetrical Repeater Expansion & Video Previews

## 1. Overview & Goals
When importing candidate component templates into Elementor via the Supercraft SiteBuilder in-editor wizard modal:
1. **Video Thumbnails:** Candidate cards in the modal should support `.mp4`/`.webm` or video URLs as live autoplaying/looping previews alongside static images.
2. **AI Smart Copy Adaptation:** Use an LLM on the Superapp backend to intelligently fit the copywriter's source text into the destination component's specific layout (shortening, lengthening, and generating missing/extra copy such as badges, secondary buttons, or metrics based on business context).
3. **Symmetrical Repeater Expansion:** When expanding or reducing repeating elements (e.g., feature cards, testimonial cards), use an AI design plan that understands multi-column containers to clone cards symmetrically (e.g., 2 columns with 3 cards each for 6 items) rather than breaking layout geometry.

---

## 2. Architecture & Data Flow

```
1. User clicks "Select & Import Section" in Elementor Builder Modal
                    │
                    ▼
2. Client-side Blueprint Extractor (elementor-builder-modal.js)
   - Inspects target Elementor JSON tree
   - Extracts root text slots (headings, subheadings, badges, CTAs)
   - Identifies repeater architecture (single flex vs multi-column container)
                    │
                    ▼
3. POST http://host.docker.internal:3000/api/sitebuilder/adapt-copy
   - Payload: { source_copy, component_blueprint }
   - LLM Engine: gpt-5.4-nano-2026-03-17 (via AI SDK)
   - Performs copy length fitting, extra slot authoring, and symmetrical column planning
                    │
                    ▼
4. Response: { adapted_slots, layout_plan }
                    │
                    ▼
5. Symmetrical Tree Transformer (elementor-builder-modal.js)
   - Clones archetype cards per column according to layout_plan.columns
   - Replaces text slot values and token placeholders
   - Reassigns fresh unique Elementor node IDs (reassignElementorIds)
                    │
                    ▼
6. Elementor Canvas Insertion ($e.run('document/elements/create'))
   - Flags document dirty to enable "Update" button
   - Advances wizard to next section step
```

---

## 3. Detailed Component Specifications

### 3.1 Video Thumbnail Support in Modal UI
- In `elementor-builder-modal.js`, update `renderCandidateCards(components, currentSec)`:
  - Check `comp.video_url || comp.thumbnail_url || comp.thumbnail`.
  - If the URL matches `/\.(mp4|webm)($|\?)/i` or `comp.video_url` is present:
    Render:
    ```html
    <video src="${videoUrl}" autoplay loop muted playsinline class="supercraft-card-thumb-video" poster="${fallbackPoster}"></video>
    ```
  - In `elementor-builder-modal.css`, add styles for `.supercraft-card-thumb-video` ensuring `width: 100%; height: 140px; object-fit: cover; border-radius: 6px;`.

### 3.2 Blueprint Extractor (`elementor-builder-modal.js`)
- Recursively walks the template's Elementor JSON:
  - Detects repeated containers:
    - Finds containers with multiple child container cards, or parent containers with 2+ columns containing card archetypes.
    - Captures `column_count`, `initial_card_counts`, and the card archetype definition.
  - Catalogs text slots:
    - Widget types: `heading`, `text-editor`, `button`.
    - Captures current placeholder text to estimate desired length.

### 3.3 Backend LLM Route (`/api/sitebuilder/adapt-copy/route.ts`)
- Location: `/Volumes/T7/Lyness/SAAS/Supercraft/supercraft-superapp/src/app/api/sitebuilder/adapt-copy/route.ts`.
- Handles `POST` requests with JSON:
  - `source_copy`: `{ heading, subheading, cta_label, items }`
  - `component_blueprint`: `{ component_title, root_slots, repeater_layout }`
- Prompt instructions:
  - Act as a design director.
  - Scale copy to match the visual character count of the component slots.
  - If the component has extra slots (eyebrow, disclaimer, secondary button, stats), author contextual copy aligned with the business.
  - Symmetrically distribute items across columns:
    - If 6 items and 2 columns: 3 items in column 0, 3 items in column 1.
    - If odd number: distribute evenly and flag if an archetype card should span full width or balance naturally.
- Fallback: If LLM call times out or errors, fall back gracefully to direct token substitution without blocking the user.

### 3.4 Symmetrical Layout Engine (`elementor-builder-modal.js`)
- Replaces naive `expandRepeaterElements` with `applySymmetricalLayout(processedData, layoutPlan, cardArchetypes)`:
  - If `layout_plan` specifies multi-column distribution:
    - For each column, ensures child card count matches `layout_plan.columns[i].items.length`.
    - Clones the column's card archetype for any additional slots needed.
    - Injects the adapted item copy (title, description) into each card node.
  - Injects scalar root slots (`heading`, `subheading`, `badge`, `cta`).
  - Calls `reassignElementorIds()` recursively.
  - Injects cleanly into Elementor canvas via `$e.run('document/elements/create', ...)`.

---

## 4. Verification & Testing Plan
1. **Video Preview Test:** Verify candidate cards with video URLs render smoothly with autoplay and muted looping.
2. **LLM Adapt-Copy Route Test:** Test endpoint with cURL using both symmetrical (6 items across 2 cols) and asymmetric inputs to ensure JSON response schema is valid.
3. **Multi-Column Repeater Insertion Test:** Import a 2-column feature component with 6 items on the local WordPress site (`http://localhost:8890`), verifying that both columns have exactly 3 cards and the layout does not break.
4. **Extra Copy Generation Test:** Select a component with an eyebrow badge and secondary text; verify AI generates fitting context instead of placeholder strings.
