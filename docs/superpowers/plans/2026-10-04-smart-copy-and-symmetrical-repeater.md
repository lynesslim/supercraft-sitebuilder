# AI Smart Copy Adaptation, Symmetrical Repeater & Video Previews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement video thumbnail previews in the Elementor modal, an intelligent LLM copy adaptation backend endpoint in Superapp, and a client-side symmetrical repeater expansion engine that maintains balanced multi-column layouts.

**Architecture:** A client-side blueprint extractor parses the selected Elementor component's text slots and container structure, sends it along with the source copy to `POST /api/sitebuilder/adapt-copy`, and uses the AI's symmetrical layout plan and adapted copy to clone card archetypes and inject copy before adding elements to the Elementor canvas.

**Tech Stack:** JavaScript (jQuery, Elementor JS API), CSS, Next.js (TypeScript, Vercel AI SDK `@ai-sdk/openai`), WordPress PHP.

## Global Constraints
- Target WordPress Local URL: `http://localhost:8890`
- Superapp API Endpoint: `http://host.docker.internal:3000/api/sitebuilder` (or `http://localhost:3000/api/sitebuilder`)
- AI Model: `gpt-5.4-nano-2026-03-17` (configured in Superapp AI SDK)
- 100% Canvas Safety: Elementor styling, margins, and flex container attributes must not be corrupted by raw JSON generation.

---

### Task 1: Video Thumbnail Support in Elementor Modal

**Files:**
- Modify: `assets/js/elementor-builder-modal.js:205-228`
- Modify: `assets/css/elementor-builder-modal.css`

**Interfaces:**
- Consumes: Component objects from candidate list (`comp.thumbnail_url`, `comp.video_url`, `comp.thumbnail`)
- Produces: Responsive `<video>` or `<img>` thumbnail markup inside `.supercraft-card`

- [x] **Step 1: Update `renderCandidateCards` in `assets/js/elementor-builder-modal.js`**
- [x] **Step 2: Add CSS rules for card video in `assets/css/elementor-builder-modal.css`**
- [x] **Step 3: Verification**

---

### Task 2: Backend LLM Copy Adaptation & Layout Balancing API

- [x] **Step 1: Create the API route in `supercraft-superapp`**
- [x] **Step 2: Test API with cURL**

---

### Task 3: Client-side Blueprint Extractor & Symmetrical Layout Transformer

- [x] **Step 1: Implement `extractComponentBlueprint(elementorElements)`**
- [x] **Step 2: Implement `applySymmetricalLayout(processedElements, layoutPlan, archetypes, adaptedSlots)`**
- [x] **Step 3: Connect "Select & Import Section" flow to the AI pipeline**

---

### Task 4: End-to-End Verification

- [x] **Step 1: Test Video Thumbnail Rendering in Candidate Grid**
- [x] **Step 2: Test Symmetrical 2-Column Expansion with 6 Items**
- [x] **Step 3: Test Extra Slot Generation**
