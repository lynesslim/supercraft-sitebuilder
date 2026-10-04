# Design Specification: Dual-Mode SiteBuilder & Interactive Before/After Copy Review

## 1. Overview
The Supercraft SiteBuilder plugin currently converts uploaded copy documents into a complete sitemap tree of WordPress pages. 
This enhancement delivers two major capabilities:
1. **Dual-Mode Upload Pipeline**:
   - **Mode A: Full Site Builder**: Parses sitemap, extracts structured section copy, reviews tree, generates WordPress draft pages, and saves site-wide business context.
   - **Mode B: Context Only / Manual Building**: Skips sitemap generation and page creation entirely. Extracts a structured business summary (overview, deliverables, target audience, brand voice) and saves it site-wide in `wp_options`.
2. **Interactive In-Place Adaptation with Review & Regeneration**:
   - In Elementor, users can adapt copy either from structured page sections OR via a custom user prompt guided by the global business context.
   - **Human-in-the-Loop Review Gate**: Adaptation results are NEVER auto-applied directly. Instead, a Before/After comparison view is presented.
   - **Per-Slot Regeneration**: Users can provide specific revision feedback/comments for an individual slot or card and re-run AI generation for that item.
   - **Batch Regeneration**: Users can supply overall revision comments to regenerate all slots.
   - **Explicit Apply**: Changes are only written to the Elementor canvas when the user confirms with "Apply Changes to Canvas".

---

## 2. Architecture & Data Flow

```
[WordPress Admin: Upload PDF/DOCX]
        │
        ├── Full Site Toggle ──────────► /api/sitebuilder/parse-doc (mode: full)
        │                                        │
        │                                        ▼
        │                               Sitemap Tree + Business Context
        │                                        │
        │                                        ▼
        │                               Create Draft Pages + Save _supercraft_section_copy
        │                               & Save supercraft_business_context in wp_options
        │
        └── Context Only Toggle ───────► /api/sitebuilder/parse-doc (mode: context_only)
                                                 │
                                                 ▼
                                        Business Context Only
                                                 │
                                                 ▼
                                        Save supercraft_business_context in wp_options
                                        (No pages created)

[Elementor Canvas: Right Click -> Adapt Copy]
        │
        ├── Post has _supercraft_section_copy ──► Shows Section Dropdown (+ optional prompt)
        │
        └── Manual Page / Context Only ─────────► Shows Business Context Badge + Prompt Input
        │
        ▼
[Click: ✨ Generate Adaptations]
        │
        ▼
[/api/sitebuilder/adapt-copy-flat]
        │
        ▼
[Interactive Before / After Review Screen]
        ├── Inline Slot "🔄 Regenerate" (with revision comments)
        ├── Global "🔄 Regenerate All" (with revision comments)
        └── "✅ Apply to Canvas" ──► Writes to Elementor models & re-renders canvas
```

---

## 3. Detailed Component Requirements

### 3.1 WordPress Admin Upload (`supercraft-sitebuilder.php`)
- Add segmented radio/toggle in Stage 1 form:
  - `full`: "Full Site Generation (Generate sitemap, page tree & draft pages)"
  - `context_only`: "Context Only (Extract business profile & services for in-place copy adaptation)"
- If `context_only`:
  - Calls `/api/sitebuilder/parse-doc` with `mode=context_only`.
  - Saves returned `business_context` into `update_option('supercraft_business_context', $context)`.
  - Renders a clean success dashboard displaying business name, summary write-up, and extracted services list with instructions on how to use Elementor in-place adaptation.
- If `full`:
  - Calls `/api/sitebuilder/parse-doc` with `mode=full`.
  - Saves `business_context` site-wide, and continues the existing page creation flow.
- Enqueue hook in Elementor editor:
  - Enqueue `elementor-builder-modal.js` and CSS if `_supercraft_section_copy` is present on the page OR if `supercraft_business_context` exists in WordPress options.
  - Pass `supercraftBuilderVars.businessContext` alongside `sectionCopy`.

### 3.2 Superapp Backend (`parse-doc` & `adapt-copy-flat`)
- **`/api/sitebuilder/parse-doc`**:
  - Accept `mode: "full" | "context_only"`.
  - When `context_only`:
    - Prompt LLM for structured schema:
      - `business_name: string`
      - `summary: string`
      - `services: Array<{ title: string, description: string }>`
      - `target_audience: string`
      - `brand_voice: string`
    - Returns `{ status: "success", business_context: { ... } }`.
  - When `full`:
    - Generates sitemap AND business context.
- **`/api/sitebuilder/adapt-copy-flat`**:
  - Accept `user_prompt?: string`, `business_context?: object`, `revision_instruction?: string`, `target_slot_id?: string`.
  - If `revision_instruction` is present:
    - Instruct LLM to revise previous generation according to the feedback while maintaining intra-card coherence.
  - If `target_slot_id` is present:
    - AI regenerates only the specified slot (or its parent card) using context and previous text.

### 3.3 Elementor Modal UI (`elementor-builder-modal.js` & `.css`)
- **State Machine in Modal**:
  - **State 1: Configuration**:
    - Mode A: Section selector dropdown + optional prompt.
    - Mode B: Business context summary + required section prompt textarea.
    - Grouped slots preview with checkboxes.
    - Button: "✨ Generate Adaptations".
  - **State 2: Before & After Review View**:
    - Banner: *"Review AI Adaptations before applying to canvas."*
    - Two-column or side-by-side card diff:
      - Left / Top: Original text.
      - Right / Bottom: New proposed text (editable inline!).
      - Per-slot action: "🔄 Regenerate" (expands a small comment input: *"Make shorter"*, *"Mention tax exemption"*, etc.).
    - Footer controls:
      - "← Back to Options"
      - "🔄 Regenerate All" (with modal comment popup / prompt input)
      - "✅ Apply Changes to Canvas" (executes `applyFlatCopyInPlace()`)
