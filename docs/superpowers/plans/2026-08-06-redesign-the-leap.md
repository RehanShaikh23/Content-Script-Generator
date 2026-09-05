# "The Leap" UI/UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete end-to-end redesign of the Islamic Content AI web application according to "The Leap" design system specification (`src/DESIGN/DESIGN.md`), establishing a warm, editorial creator-economy aesthetic with espresso ink (`#482317`), cream canvas (`#fafafa`), lime spark CTA (`#ecf956`), serif display headlines (`Source Serif 4`), and pastel section washes.

**Architecture:** Centralized token system in `src/index.css` extending `src/DESIGN/cssvariables.css`, producing clean semantic CSS class utilities (`.btn-lime-cta`, `.card-leap`, `.heading-serif-display`, `.pastel-wash-*`). All React components, auth pages, modals, landing sections, and admin panel will consume these unified tokens and utility classes.

**Tech Stack:** React 19, Vite, Vanilla CSS custom properties (`:root`), Google Fonts (`Source Serif 4`, `Inter`).

## Global Constraints
- Primary background color must be Cream Canvas `#fafafa`.
- Primary text and borders must be Espresso Ink `#482317` (never pure `#000000`).
- Primary filled action buttons must use Lime Spark `#ecf956` fill with `#482317` text and `100px` pill border radius.
- Main cards must use `30px` border radius (`--radius-cards: 30px`) with `1px #e5e7eb` fog border.
- Display headlines must use `Source Serif 4` light 300 weight with tight line-height (`1.03`) and tight letter-spacing.
- Body text and UI elements must use `Inter` (`--font-favorit`).

---

### Task 1: Font Setup & Core Design Tokens CSS Integration

**Files:**
- Modify: `index.html:1-25`
- Modify: `src/index.css:1-120`

**Interfaces:**
- Consumes: Design tokens in `src/DESIGN/cssvariables.css` & `src/DESIGN/DESIGN.md`.
- Produces: Global `:root` CSS custom properties and core utility classes (`.btn-lime-cta`, `.btn-ghost-espresso`, `.btn-outline-espresso`, `.card-leap`, `.heading-serif-display`, `.heading-serif-lg`, `.pastel-wash-*`).

- [ ] **Step 1: Add Google Fonts link in index.html**
  Add preconnect and font stylesheet link for `Source Serif 4` (weights 300, 400, 600) and `Inter` (weights 300, 400, 500, 600, 700) in `index.html`.

- [ ] **Step 2: Define design tokens and global body styles in src/index.css**
  Update `:root` in `src/index.css` with exact values:
  `--color-espresso-ink: #482317;`
  `--color-fog-border: #e5e7eb;`
  `--color-cream-canvas: #fafafa;`
  `--color-lime-spark: #ecf956;`
  `--color-lilac-whisper: #efd8f0;`
  `--color-mint-tint: #c6e57d;`
  `--color-lemon-cream: #f3fb9a;`
  `--color-sky-hush: #b1dcfc;`
  `--font-tobias: 'Source Serif 4', Georgia, serif;`
  `--font-favorit: 'Inter', system-ui, sans-serif;`
  `--radius-buttons: 100px;`
  `--radius-cards: 30px;`
  `--radius-smallcards: 15px;`
  `--radius-nav: 20px;`
  `--radius-links: 9px;`

  Set body styling to `background: var(--color-cream-canvas); color: var(--color-espresso-ink); font-family: var(--font-favorit);`.

- [ ] **Step 3: Add semantic component utility classes in src/index.css**
  Add `.btn-lime-cta`, `.btn-ghost-espresso`, `.btn-outline-espresso`, `.card-leap`, `.heading-serif-display`, `.heading-serif-lg`, `.heading-serif-sm`, `.pastel-wash-lilac`, `.pastel-wash-mint`, `.pastel-wash-lemon`, and `.pastel-wash-sky`.

- [ ] **Step 4: Verify CSS compilation**
  Run `npm run build` or check dev server to verify zero CSS syntax errors.

- [ ] **Step 5: Commit changes**
  `git commit -am "feat: setup font loading and core design tokens in index.css"`

---

### Task 2: Redesign User Bar & App Header

**Files:**
- Modify: `src/App.jsx:70-100`
- Modify: `src/components/Header.jsx:1-25`
- Modify: `src/index.css:120-220`

**Interfaces:**
- Consumes: `:root` tokens and utility classes from Task 1.
- Produces: Redesigned user bar navigation header and application header component.

- [ ] **Step 1: Update User Bar layout & styling in App.jsx and index.css**
  Style `.user-bar` with `background: var(--color-cream-canvas); border: 1px solid var(--color-fog-border); border-radius: var(--radius-nav); box-shadow: var(--shadow-nav); color: var(--color-espresso-ink);`.
  Style `.user-bar__credits` badge as a Lime Spark pill tag (`background: var(--color-lime-spark); color: var(--color-espresso-ink); font-weight: 700; border-radius: 100px; padding: 4px 12px;`).
  Style `.user-bar__logout` and `.user-bar__report-btn` as ghost pill buttons (`100px` radius).

- [ ] **Step 2: Redesign Header.jsx with Tobias serif display font**
  In `src/components/Header.jsx`:
  Apply `.header__ornament` with `#482317` text.
  Apply `.header__title` with `font-family: var(--font-tobias); font-weight: 300; font-size: 54px; line-height: 1.03; letter-spacing: -1.08px; color: var(--color-espresso-ink);`.
  Apply `.header__subtitle` with `font-family: var(--font-favorit); font-size: 16px; font-weight: 350; color: var(--color-espresso-ink); opacity: 0.75;`.

- [ ] **Step 3: Verify rendering in browser**
  Check header title serif typography and user bar pill styling.

- [ ] **Step 4: Commit changes**
  `git commit -am "feat: redesign user bar and app header with Tobias display serif"`

---

### Task 3: Redesign Main Script Generator Form & Sub-components

**Files:**
- Modify: `src/components/ScriptForm.jsx:1-400`
- Modify: `src/components/OptionGrid.jsx:1-30`
- Modify: `src/components/OptionButton.jsx:1-30`
- Modify: `src/components/ChipGroup.jsx:1-25`
- Modify: `src/index.css:220-450`

**Interfaces:**
- Consumes: `:root` tokens and utility classes from Task 1.
- Produces: Redesigned core script form with `30px` card radius, Lime Spark active options, `100px` pill CTA button, AI shimmer loader, and pastel script output box.

- [ ] **Step 1: Update Card & Field labels in ScriptForm.jsx & index.css**
  Set `.card` to `background: var(--color-cream-canvas); border: 1px solid var(--color-fog-border); border-radius: var(--radius-cards); padding: 30px; box-shadow: none;`.
  Set `.field__label` to `font-family: var(--font-favorit); font-weight: 700; font-size: 13px; letter-spacing: 0.05em; color: var(--color-espresso-ink); text-transform: uppercase;`.
  Set `input, textarea` to `background: var(--color-cream-canvas); border: 1px solid var(--color-fog-border); border-radius: var(--radius-links); color: var(--color-espresso-ink);`.

- [ ] **Step 2: Redesign OptionButton & OptionGrid**
  In `src/components/OptionButton.jsx` and `index.css`:
  Set `.option-btn` to `border-radius: var(--radius-smallcards); border: 1px solid var(--color-fog-border); background: var(--color-cream-canvas); color: var(--color-espresso-ink);`.
  Set `.option-btn.active` to `background: var(--color-lime-spark); border-color: var(--color-espresso-ink); color: var(--color-espresso-ink); font-weight: 700;`.

- [ ] **Step 3: Redesign ChipGroup**
  In `src/components/ChipGroup.jsx` and `index.css`:
  Set `.chip` to `border-radius: var(--radius-buttons); border: 1px solid var(--color-fog-border); color: var(--color-espresso-ink);`.
  Set `.chip.active` to `background: var(--color-espresso-ink); color: #fff; font-weight: 600;`.

- [ ] **Step 4: Redesign Generate Button & AI Loader & Script Output Box**
  Set `.generate-btn` to `background: var(--color-lime-spark); color: var(--color-espresso-ink); border-radius: var(--radius-buttons); font-weight: 700; text-transform: uppercase; font-size: 15px; letter-spacing: 0.05em; padding: 14px 28px; border: none; cursor: pointer;`.
  Update `.ai-loading` dots animation with `#482317` pulse.
  Update script output result box to use Lilac Whisper `#efd8f0` pastel wash background or Cream Canvas with `30px` border-radius and `#482317` typography.

- [ ] **Step 5: Verify Script Form UI in browser**
  Ensure form inputs, option active states, generate button, and script output box render cleanly.

- [ ] **Step 6: Commit changes**
  `git commit -am "feat: redesign script generator form and subcomponents with The Leap tokens"`

---

### Task 4: Redesign History Sidebar & Navigation Drawer

**Files:**
- Modify: `src/components/HistorySidebar.jsx:1-250`
- Modify: `src/index.css:450-550`

**Interfaces:**
- Consumes: `:root` tokens from Task 1.
- Produces: Redesigned off-white history sidebar drawer with Lime Spark upgrade callout and fog-bordered script list items.

- [ ] **Step 1: Redesign Sidebar drawer surface & header**
  In `src/components/HistorySidebar.jsx` and `index.css`:
  Set sidebar overlay background and drawer container to `background: var(--color-cream-canvas); color: var(--color-espresso-ink); border-left: 1px solid var(--color-fog-border);`.
  Set drawer title to `font-family: var(--font-tobias); font-weight: 300; font-size: 27px; color: var(--color-espresso-ink);`.

- [ ] **Step 2: Style Upgrade Banner & History list items**
  Style Upgrade callout card with `background: var(--color-lime-spark); border-radius: var(--radius-smallcards); color: var(--color-espresso-ink); padding: 16px; font-weight: 700;`.
  Style history items with `border: 1px solid var(--color-fog-border); border-radius: var(--radius-smallcards); background: var(--color-cream-canvas); color: var(--color-espresso-ink);`.

- [ ] **Step 3: Verify sidebar drawer in browser**
  Click history button in user bar, verify drawer slide-in and styling.

- [ ] **Step 4: Commit changes**
  `git commit -am "feat: redesign history sidebar drawer with The Leap styling"`

---

### Task 5: Redesign Creator Tips & Content Calendar Planner

**Files:**
- Modify: `src/components/CreatorTips.jsx:1-180`
- Modify: `src/components/ContentCalendarPlanner.jsx:1-500`
- Modify: `src/index.css:550-700`

**Interfaces:**
- Consumes: `:root` tokens and pastel washes from Task 1.
- Produces: Redesigned Creator Tips cards with pastel section washes and Content Calendar monthly view.

- [ ] **Step 1: Redesign CreatorTips cards with pastel washes**
  In `src/components/CreatorTips.jsx` and `index.css`:
  Apply 3-column card grid with `30px` radius cards (`--radius-cards: 30px`).
  Card 1 background: `#efd8f0` (Lilac Whisper).
  Card 2 background: `#c6e57d` (Mint Tint).
  Card 3 background: `#f3fb9a` (Lemon Cream).
  Headings in `Source Serif 4` light 300 serif, body copy in Inter `#482317`.

- [ ] **Step 2: Redesign ContentCalendarPlanner component**
  In `src/components/ContentCalendarPlanner.jsx` and `index.css`:
  Set container background to `#fafafa`, `30px` radius card, fog border.
  Calendar grid headers and day cards with `15px` radius and fog borders.
  Pill action buttons in Lime Spark `#ecf956` fill.

- [ ] **Step 3: Verify Creator Tips & Content Calendar in browser**
  Check pastel wash backgrounds and monthly planner grid layout.

- [ ] **Step 4: Commit changes**
  `git commit -am "feat: redesign creator tips and content calendar with pastel washes"`

---

### Task 6: Redesign Auth Pages & Auth Card Component

**Files:**
- Modify: `src/components/landing/AuthCard.jsx:1-200`
- Modify: `src/pages/LoginPage.jsx:1-50`
- Modify: `src/pages/SignupPage.jsx:1-50`
- Modify: `src/pages/ForgotPasswordPage.jsx:1-120`
- Modify: `src/pages/ResetPasswordPage.jsx:1-200`
- Modify: `src/index.css:700-850`

**Interfaces:**
- Consumes: `:root` tokens from Task 1.
- Produces: Redesigned authentication screens (Login, Signup, Forgot/Reset Password) centered on Cream Canvas with Tobias serif headlines and Lime Spark pill CTA buttons.

- [ ] **Step 1: Redesign AuthCard and container wrapper**
  Set `.auth-wrapper` to `background: var(--color-cream-canvas); color: var(--color-espresso-ink);`.
  Set `.auth-card` to `background: var(--color-cream-canvas); border: 1px solid var(--color-fog-border); border-radius: var(--radius-cards); padding: 40px; shadow: none;`.

- [ ] **Step 2: Update Auth Typography, Inputs, and Action Buttons**
  Set Auth Title to `font-family: var(--font-tobias); font-weight: 300; font-size: 36px; line-height: 1.05; color: var(--color-espresso-ink);`.
  Set Auth Inputs to `border: 1px solid var(--color-fog-border); border-radius: var(--radius-links); background: var(--color-cream-canvas); color: var(--color-espresso-ink);`.
  Set Auth Submit Button to `background: var(--color-lime-spark); color: var(--color-espresso-ink); border-radius: var(--radius-buttons); font-weight: 700; text-transform: uppercase; font-size: 14px; padding: 14px; border: none;`.

- [ ] **Step 3: Verify all auth pages (/login, /signup, /forgot-password, /reset-password) in browser**
  Navigate to `/login` and `/signup` to confirm responsive layout and button styles.

- [ ] **Step 4: Commit changes**
  `git commit -am "feat: redesign auth pages and AuthCard component"`

---

### Task 7: Redesign App Modals (Subscription, Cancel, Daily Reminder, Report Issue)

**Files:**
- Modify: `src/components/SubscriptionModal.jsx:1-300`
- Modify: `src/components/CancelSubscriptionModal.jsx:1-250`
- Modify: `src/components/DailyReminderModal.jsx:1-150`
- Modify: `src/components/ReportIssueModal.jsx:1-200`
- Modify: `src/index.css:850-1050`

**Interfaces:**
- Consumes: `:root` tokens and pastel washes from Task 1.
- Produces: Redesigned popups and modals with `30px` card radii, pastel pricing washes, and Lime Spark CTA buttons.

- [ ] **Step 1: Update Modal Overlay & Dialog Card in index.css**
  Set modal overlay background to `rgba(72, 35, 23, 0.4)` (espresso backdrop).
  Set modal content box to `background: var(--color-cream-canvas); border: 1px solid var(--color-fog-border); border-radius: var(--radius-cards); padding: 32px; color: var(--color-espresso-ink);`.

- [ ] **Step 2: Redesign SubscriptionModal pricing cards**
  In `src/components/SubscriptionModal.jsx`:
  Free Tier card: `#fafafa` background, `1px #e5e7eb` fog border, `30px` radius.
  Creator/Pro Tier cards: Highlighted with `#ecf956` Lime Spark fill or `#efd8f0` Lilac Whisper wash.
  Action CTA buttons: `100px` pill radius Lime Spark buttons.

- [ ] **Step 3: Redesign CancelSubscriptionModal, DailyReminderModal, and ReportIssueModal**
  Update cancel, reminder, and report issue modals to use `30px` card radius, espresso headlines (`Source Serif 4`), fog borders, and pill buttons.

- [ ] **Step 4: Verify modals in browser**
  Trigger pricing modal, cancel modal, and report issue modal to verify styling.

- [ ] **Step 5: Commit changes**
  `git commit -am "feat: redesign modals with 30px card radii and Lime Spark CTAs"`

---

### Task 8: Redesign Landing Page Components

**Files:**
- Modify: `src/components/landing/LandingNavbar.jsx:1-120`
- Modify: `src/components/landing/HeroSection.jsx:1-150`
- Modify: `src/components/landing/FeaturesSection.jsx:1-100`
- Modify: `src/components/landing/HowItWorksSection.jsx:1-100`
- Modify: `src/components/landing/AudienceSection.jsx:1-100`
- Modify: `src/components/landing/FAQSection.jsx:1-100`
- Modify: `src/components/landing/CTASection.jsx:1-60`
- Modify: `src/components/landing/LandingFooter.jsx:1-100`
- Modify: `src/landing-base.css` & `src/landing-sections.css`

**Interfaces:**
- Consumes: `:root` tokens from Task 1.
- Produces: Redesigned landing page with Tobias serif hero, pill navbar, 3-column feature cards, and pastel section washes.

- [ ] **Step 1: Redesign LandingNavbar & HeroSection**
  Set `LandingNavbar` to transparent background over canvas with centered uppercase nav links in Inter weight 350 `#482317`, ghost 'SIGN IN' button, and Lime Spark 'SIGN UP FREE' pill button (`100px` radius).
  Set `HeroSection` headline to `Source Serif 4` light 300 (60px size, line-height 1.03, tracking -1.2px, `#482317`). Set subhead to Inter 20px `#482317`.
  Right hero visual: floating product card mockup with 5° rotation and pastel gradient background (`linear-gradient(129deg, #efd8f0 to #c6e57d)`), `30px` border radius.

- [ ] **Step 2: Redesign Features, How It Works, Audience, FAQ, and CTA Sections**
  Alternate section backgrounds between `#fafafa` canvas and soft pastel section washes (`#efd8f0` Lilac Whisper, `#c6e57d` Mint Tint, `#f3fb9a` Lemon Cream).
  Style feature and audience cards with `30px` border-radius and `1px #e5e7eb` fog border.
  Style FAQ accordion items with fog border dividers and espresso headings.

- [ ] **Step 3: Redesign LandingFooter**
  Set `LandingFooter` background to `#fafafa` with `1px #e5e7eb` top border, espresso typography, and social icon links.

- [ ] **Step 4: Verify Landing Page layout in browser**
  Scroll through landing page components to confirm full visual harmony.

- [ ] **Step 5: Commit changes**
  `git commit -am "feat: redesign landing page components with The Leap editorial style"`

---

### Task 9: Admin Panel Token Alignment & Comprehensive Verification

**Files:**
- Modify: `src/admin/admin.css:1-500`

**Interfaces:**
- Consumes: `:root` tokens from Task 1.
- Produces: Aligned Admin Panel styling using `--color-espresso-ink`, `--color-cream-canvas`, `--color-lime-spark`, and `--radius-cards: 30px` tokens.

- [ ] **Step 1: Align admin.css with design tokens**
  In `src/admin/admin.css`:
  Update primary text color references to `var(--color-espresso-ink)`.
  Update card border radii to `var(--radius-cards)` (`30px`) and `var(--radius-smallcards)` (`15px`).
  Update primary action buttons to `background: var(--color-lime-spark); color: var(--color-espresso-ink); border-radius: var(--radius-buttons);`.

- [ ] **Step 2: Perform full application build verification**
  Run `npm run build` to verify zero TypeScript/JSX/CSS errors.

- [ ] **Step 3: Perform multi-viewport responsive testing**
  Test key views (Main App, Auth, Landing, Admin) across Desktop (1200px+), Tablet (768px), and Mobile (375px) breakpoints.

- [ ] **Step 4: Commit changes**
  `git commit -am "feat: align admin panel tokens and complete full redesign verification"`
