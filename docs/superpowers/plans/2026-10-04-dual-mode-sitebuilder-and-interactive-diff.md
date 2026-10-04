# Dual-Mode SiteBuilder & Interactive Before/After Copy Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide dual-mode upload ("Context Only" vs "Full Site Builder"), prompt-guided adaptation for manual pages, and an interactive Before/After review screen with per-slot and batch regeneration before applying copy to canvas.

**Architecture:** 
1. Next.js `/api/sitebuilder/parse-doc` extracts structured `business_context` (and sitemap in full mode).
2. `/api/sitebuilder/adapt-copy-flat` supports `user_prompt`, `business_context`, and revision comments.
3. `supercraft-sitebuilder.php` provides the mode toggle, stores `supercraft_business_context` site-wide, and enqueues the modal on all pages with context.
4. `elementor-builder-modal.js` renders a two-state interface: (1) Prompt/Section Config and (2) Before/After Review with per-slot and batch regeneration before canvas application.

**Tech Stack:** Next.js (TypeScript, AI SDK, OpenAI), WordPress / PHP, jQuery, Vanilla CSS, Elementor JS API.

## Global Constraints
- **NO AUTO-APPLY**: Adaptations must never write to Elementor canvas models until the user clicks "Apply Changes to Canvas".
- **INTRA-CARD COHERENCE**: All slots within Card X (heading, description, pills, CTA button) must describe the exact same service/item.
- **NO HARDCODING**: All copywriting is synthesized organically by LLM.
- **BACKWARDS COMPATIBILITY**: Existing pages with `_supercraft_section_copy` must continue functioning seamlessly.

---

### Task 1: Next.js API - `parse-doc` Dual Mode & Business Context Extraction

**Files:**
- Modify: `/Volumes/T7/Lyness/SAAS/Supercraft/supercraft-superapp/src/app/api/sitebuilder/parse-doc/route.ts`

- [x] **Step 1: Define `BusinessContext` schema and prompt**
  - Add schema for `business_name`, `summary`, `services` (`[{ title, description }]`), `target_audience`, `brand_voice`.
  - In `context_only` mode, invoke `generateObject` with the business context schema only (bypassing sitemap generation).
  - In `full` mode, extract both `sitemap` and `business_context`.

- [x] **Step 2: Test `/api/sitebuilder/parse-doc` in both modes**
  - Run node test script with `mode: "context_only"` and verify business context is returned without sitemap.
  - Run node test script with `mode: "full"` and verify both sitemap and business context are returned.

---

### Task 2: Next.js API - `adapt-copy-flat` Prompt & Regeneration Support

**Files:**
- Modify: `/Volumes/T7/Lyness/SAAS/Supercraft/supercraft-superapp/src/app/api/sitebuilder/adapt-copy-flat/route.ts`

- [x] **Step 1: Expand payload and prompt builder**
  - Parse `user_prompt`, `business_context`, `revision_instruction`, and `target_slot_id` from request body.
  - If `revision_instruction` is passed, instruct AI to update the previous text according to user comments while keeping card unity.
  - If `target_slot_id` is passed, generate updates only for that specific slot (or its parent card).
  - If `user_prompt` is passed without section copy, generate card copy directly fulfilling the prompt using `business_context`.

- [x] **Step 2: Test `/api/sitebuilder/adapt-copy-flat` with prompts and revisions**
  - Run node script testing prompt-only adaptation and verify intra-card coherence.
  - Run node script testing regeneration with revision comment ("make it more concise") and verify updated text.

---

### Task 3: WordPress Admin - Dual-Mode Upload & Context Persistence

**Files:**
- Modify: `/Volumes/T7/Lyness/SAAS/SuperDesign/supercraft-sitebuilder.php`

- [x] **Step 1: Add upload mode toggle in Stage 1 form**
  - Add radio buttons: `full` ("Full Site Generation") vs `context_only` ("Context Only / Manual Building").
  - Pass `mode` to `/api/sitebuilder/parse-doc`.

- [x] **Step 2: Handle `context_only` response**
  - If `context_only`:
    - Save `business_context` in `update_option('supercraft_business_context', $context)`.
    - Display an admin notice and summary card with company name, summary, and service badges.
    - Skip page creation.

- [x] **Step 3: Update Elementor editor script enqueue**
  - Enqueue `elementor-builder-modal.js` and CSS if `_supercraft_section_copy` is present OR `supercraft_business_context` exists.
  - Pass `businessContext: get_option('supercraft_business_context')` in `supercraftBuilderVars`.

---

### Task 4: Elementor Modal - Config UI (Sections vs Prompt & Context)

**Files:**
- Modify: `/Volumes/T7/Lyness/SAAS/SuperDesign/assets/js/elementor-builder-modal.js`
- Modify: `/Volumes/T7/Lyness/SAAS/SuperDesign/assets/css/elementor-builder-modal.css`

- [x] **Step 1: Add prompt input and context banner to modal dialog**
  - If structured sections exist: show section selector + optional prompt.
  - If no sections exist (context only / manual page): show active business context summary + required prompt textarea.

- [x] **Step 2: Style the context summary badge and prompt input**
  - Clean styling in `elementor-builder-modal.css`.

---

### Task 5: Elementor Modal - Before/After Review Screen & Regeneration

**Files:**
- Modify: `/Volumes/T7/Lyness/SAAS/SuperDesign/assets/js/elementor-builder-modal.js`
- Modify: `/Volumes/T7/Lyness/SAAS/SuperDesign/assets/css/elementor-builder-modal.css`

- [x] **Step 1: Create Review View container in modal**
  - Add review screen showing original vs proposed text per slot.
  - Allow inline editing of the proposed text.

- [x] **Step 2: Implement per-slot "🔄 Regenerate" with comment input**
  - Add button on each slot to expand comment input and trigger per-slot regeneration.

- [x] **Step 3: Implement "🔄 Regenerate All" with global comment**
  - Add button in review footer to re-run all slots with user's overall instructions.

- [x] **Step 4: Implement "✅ Apply Changes to Canvas"**
  - On click, execute `applyFlatCopyInPlace()` and close modal.

---

### Task 6: End-to-End Verification & Plugin Bump

**Files:**
- Modify: `/Volumes/T7/Lyness/SAAS/SuperDesign/supercraft-sitebuilder.php` (bump to `1.0.23`)

- [x] **Step 1: Verify syntax and end-to-end flow**
  - Check JS and PHP syntax.
  - Test context-only upload, prompt-guided adaptation, before/after diff review, and canvas apply.
