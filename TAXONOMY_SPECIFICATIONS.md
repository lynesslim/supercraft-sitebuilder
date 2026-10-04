# Supercraft SiteBuilder: Taxonomy & Classification Specifications

This document defines the official **Component Categories** (`component-category`) and **Design Tags** (`design-tag`) used across the Supercraft design library (`library.supercraft.my`), the AI document parser (`supercraft-superapp`), and the child plugin builder (`supercraft-sitebuilder`).

---

## 1. Master Component Categories (`component-category`)

Categories represent the **semantic purpose and content intent** of each section.

| Category Name | Taxonomy Slug | Purpose & Scope | Common Copywriting Triggers | Typical Placements |
| :--- | :--- | :--- | :--- | :--- |
| **Hero** | `hero` | Main above-the-fold banner for top-level landing pages. Large H1, value proposition, primary CTA. | *"Transform Your Business", "Main Headline", "Hero Banner"* | Home, Landing Pages |
| **Subpage Hero** | `subpage-hero` | Leaner header banner designed for interior subpages. Breadcrumbs, H1, concise intro. | *"About Us Banner", "Services Header", "Interior Page Title"* | Subpages, Inner Pages |
| **Authority Bar** | `authority-bar` | Numerical milestones, key metrics, and track record proof. Counters, big stats, impact numbers. | *"15+ Years Experience", "500+ Projects Completed", "99% Customer Retention"* | Home, About, Case Studies |
| **Logo Cloud** | `logo-cloud` | Displays brand logos, client partners, certificates, accreditations, or media features. | *"Our Clients", "Trusted Partners", "ISO 9001 Certified", "Featured On Forbes"* | Home, About, Trust Strips |
| **About** | `about` | Brand story, company narrative, mission, vision, and core philosophy. | *"Our Story", "Who We Are", "Our Mission & Values"* | Home, About Us |
| **Team** | `team` | Executive bios, leadership cards, department team members with photos and roles. | *"Meet the Leadership Team", "Key Executives", "Our People"* | About, Leadership, Careers |
| **Services** | `services` | Core business service offerings, capabilities, and professional solutions. | *"What We Do", "Our Capabilities", "Strategic Services"* | Home, Services, Solutions |
| **Features** | `features` | Specific feature highlights, benefits, modular functional breakdown, or technical USPs. | *"Key Features", "Why Choose Us", "Built Without Compromise"* | Home, Product, Services |
| **Process** | `process` | Step-by-step engagement roadmap, working methodology, or customer journey stages. | *"Our 4-Stage Framework", "How It Works", "The Engagement Process"* | Services, About, Landing Pages |
| **Portfolio** | `portfolio` | Showcase grid of past projects, client deliverables, visual work previews. | *"Featured Work", "Recent Projects", "Our Portfolio"* | Home, Portfolio, Work |
| **Case Study** | `case-study` | In-depth project breakdown detailing challenge, strategic solution, impact, and results. | *"Case Study: Project Overview", "The Challenge & Outcome"* | Work, Case Studies |
| **Timeline** | `timeline` | Chronological milestones, company history, roadmaps, or evolution over the years. | *"Company Milestones", "Our Journey (2015 - 2026)", "Roadmap"* | About, History |
| **Testimonials** | `testimonials` | Social proof, client quotes, customer feedback reviews, and rating stars. | *"What Clients Say", "Client Endorsements", "Customer Reviews"* | Home, About, Services |
| **Pricing** | `pricing` | Pricing tiers, service packages, feature comparison tables, monthly/annual toggles. | *"Pricing Plans", "Choose Your Package", "Investment Options"* | Services, Pricing, SaaS |
| **Blog & Insights** | `blog` | Recent news articles, thought leadership posts, case study articles, press releases. | *"Latest Insights", "From Our Blog", "Perspectives & News"* | Home, Blog, Resources |
| **Call To Action** | `cta` | Conversion section prompting user to contact, book a call, register, or request quote. | *"Ready to Build?", "Schedule a Consultation", "Get Started Today"* | Page Footers, Section Breaks |
| **Newsletter** | `newsletter` | Dedicated lead capture banner for email subscriptions, free resources, or whitepapers. | *"Subscribe to Our Newsletter", "Download Free Guide"* | Home, Blog, Pre-footer |
| **FAQ** | `faq` | Frequently asked questions, questions & answers, objection handling. | *"Frequently Asked Questions", "Common Inquiries", "Q&A"* | Services, Pricing, Contact |
| **Contact** | `contact` | Inquiry forms, office locations, addresses, phone numbers, Google Maps integration. | *"Get In Touch", "Contact Details", "Our Offices"* | Contact Us, Pre-footer |
| **Page Breaker** | `page-breaker` | Visual transition bands, divider quotes, full-width photo breaks, or separator ribbons. | *"Full-width Image Banner", "Quote Divider", "Visual Break"* | Between Content Sections |
| **Opening Loader** | `opening-loader` | Initial page load animations, preloader screens, entrance logo reveals. | *"Page Entrance Animation", "Preloader Screen"* | Global Site Entry |
| **Header** | `header` | Global site navigation bars, menus, logo placement, call-to-action buttons. | *"Main Navigation", "Global Header"* | Global Top |
| **Footer** | `footer` | Global site footer with links, copyright, secondary navigation, social links. | *"Global Footer", "Site Bottom Navigation"* | Global Bottom |

---

## 2. Master Design Tags (`design-tag`)

Design tags represent the **layout mechanic, structural count, or interactive behavior** of the section.

### A. Point Counts (Repeater Structure)
* **`1-point`**: Single centered focal statement, full-width focus box, or singular highlight card.
* **`2-points`**: 2-column comparison, dual-card layout, split side-by-side items.
* **`3-points`**: 3-column balanced card grid (e.g. 3 services, 3 core pillars).
* **`4-points`**: 4-column row or 2×2 grid (e.g. 4-step process, 4 features).
* **`6-points`**: 3×2 or 2×3 card matrix.
* **`multi`**: Dynamic repeater layout that cleanly expands from 2 to 10+ items without breaking styling.

### B. Layout Mechanics
* **`marquee`**: Infinite continuous scrolling ticker banner (e.g. scrolling logo ribbon, text marquee).
* **`carousel`**: Swipeable horizontal slider / carousel (e.g. testimonial carousel, portfolio swiper).
* **`bento-grid`**: Modern asymmetrical box layout with mixed container sizes (e.g. Apple/Linear style).
* **`split-screen`**: 50/50 two-column layout (copy on one side, imagery/visual on the other).
* **`accordion`**: Collapsible vertical accordion drawers (standard for FAQs or expandable features).
* **`tabbed`**: Interactive tabs switching between service categories, industries, or feature sets.
* **`masonry`**: Staggered, uneven height photo or card layout.

### C. Visual & Motion Effects
* **`sticky`**: Sticky pinned section that stays locked in viewport while sub-elements scroll.
* **`video-background`**: Full-bleed looping video background canvas.
* **`video-scroll-sequence`**: Canvas frame scrub driven by scroll depth.
* **`opening-animation`**: Staggered entrance motion (GSAP / CSS animation).
* **`loader`**: Interactive loading indicator.
* **`mobile`**: Layout variant specifically optimized for mobile-first interactions.

---

## 3. Practical Matching Examples

| Real Document Copy | Category (`component-category`) | Layout Tag (`design-tag`) | Rendered Outcome |
| :--- | :--- | :--- | :--- |
| *"Our Milestone Achievements: 14 Years, 250+ Campaigns, $20M Ad Spend"* | **`authority-bar`** | **`3-points`** | 3-column big number counters |
| *"Trusted By 50+ Global Brands (Scrolling Logo Banner)"* | **`logo-cloud`** | **`marquee`** | Infinite scrolling logo ticker |
| *"Accreditations: ISO 9001, AWS Partner, MDEC Approved, GMP Certified"* | **`logo-cloud`** | **`4-points`** | Clean static 4-logo badge grid |
| *"What Clients Say (Swipe to read quotes)"* | **`testimonials`** | **`carousel`** | Client review card slider |
| *"Meet Our Leadership: Adrian (MD), Amanda (Creative Director)"* | **`team`** | **`2-points`** | 2 executive profile cards with bios |
| *"Our 4-Stage Strategy Roadmap: Discover, Blueprint, Craft, Deploy"* | **`process`** | **`4-points`** | 4-step progressive timeline |
| *"Frequently Asked Questions (6 questions with expandable answers)"* | **`faq`** | **`accordion`** | Clean 6-item collapsible accordion |
