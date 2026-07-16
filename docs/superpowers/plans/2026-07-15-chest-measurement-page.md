# Chest/Bust Measurement Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build FitMe's landing page (`index.html`) and first measurement
walkthrough (`guide/chest.html`), with supporting `styles/main.css` and
`scripts/guide.js`, per the approved design spec.

**Architecture:** Plain static HTML/CSS/JS, no build step, no frameworks, no
npm dependencies. One shared stylesheet and one shared script serve both
pages. `guide.js` reads/writes a single `localStorage` key for the chest
measurement — no backend, no accounts.

**Tech Stack:** HTML5, CSS (custom properties for the design tokens),
vanilla JavaScript (ES6+), browser `localStorage`. No test framework — this
project has no automated tests yet, so every task's "test" step is a manual
check in a browser, per CLAUDE.md's "no dependencies yet" rule.

## Global Constraints

These apply to every task below; copied verbatim from the approved spec at
`docs/superpowers/specs/2026-07-15-chest-measurement-page-design.md`.

- Folder structure must exactly match CLAUDE.md: `index.html`,
  `guide/chest.html`, `assets/illustrations/`, `styles/main.css`,
  `scripts/guide.js`
- No frameworks, no build step, no npm dependencies, $0 budget
- No Clerk accounts, no Firestore, no Three.js/3D mannequin — out of scope
  for this plan
- Mobile-first, single column, generous spacing
- Colors: Muslin `#EDEAE2` (background), Ink `#2B2A28` (text), Thread Berry
  `#A8324A` (accent/buttons), Tape Ivory `#F2E9D8` (card backgrounds), Tick
  Charcoal `#4A4640` (small text/ticks), Success Moss `#5C7A5E`
  (confirmation state)
- Fonts (system stacks only, no external font requests): display
  `ui-rounded, "Segoe UI Rounded", "Hiragino Maru Gothic ProN", Verdana, sans-serif`;
  body `-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
  numbers `ui-monospace, "SF Mono", "Cascadia Code", "Segoe UI Mono", Consolas, monospace`
- Chest measurement valid range: 30–200 cm (≈11.8–78.7 in)
- `localStorage` key for the saved measurement: `fitme_chest` (always
  stores the raw cm value)
- Step instructions are generic (not split by chest vs. bust)
- Result save button must show an inline error or confirmation — never a
  browser `alert()`

---

### Task 1: Project scaffold and git setup

**Files:**
- Create: `guide/` (folder)
- Create: `assets/illustrations/.gitkeep`
- Create: `styles/main.css` (empty)
- Create: `scripts/guide.js` (empty)

**Interfaces:**
- Produces: the folder/file skeleton every later task writes into.

- [ ] **Step 1: Initialize git**

```bash
cd "C:/Users/pgoh/projects/Online_Shop_Agent"
git init
```

Expected: `Initialized empty Git repository in .../Online_Shop_Agent/.git/`

- [ ] **Step 2: Create the folder structure and empty files**

```bash
mkdir -p guide assets/illustrations styles scripts
touch assets/illustrations/.gitkeep styles/main.css scripts/guide.js
```

`.gitkeep` is a convention — git doesn't track empty folders, so this empty
file exists only to make `assets/illustrations/` show up in the repo until
real illustrations are added.

- [ ] **Step 3: Verify the structure**

```bash
find . -not -path './.git*'
```

Expected output includes: `./CLAUDE.md`, `./guide`,
`./assets/illustrations/.gitkeep`, `./styles/main.css`,
`./scripts/guide.js`

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md guide assets styles scripts docs
git commit -m "chore: scaffold FitMe project structure"
```

---

### Task 2: CSS design tokens and base styles

**Files:**
- Modify: `styles/main.css`
- Create: `index.html` (minimal shell, fleshed out in Task 3)

**Interfaces:**
- Produces: CSS custom properties (`--color-muslin`, `--color-ink`,
  `--color-thread-berry`, `--color-tape-ivory`, `--color-tick-charcoal`,
  `--color-success-moss`, `--font-display`, `--font-body`, `--font-mono`)
  and a `.container` class (max-width 480px, centered, padded) that every
  later task relies on.

- [ ] **Step 1: Write the design tokens and base reset**

`styles/main.css`:
```css
:root {
  --color-muslin: #EDEAE2;
  --color-ink: #2B2A28;
  --color-thread-berry: #A8324A;
  --color-tape-ivory: #F2E9D8;
  --color-tick-charcoal: #4A4640;
  --color-success-moss: #5C7A5E;

  --font-display: ui-rounded, "Segoe UI Rounded", "Hiragino Maru Gothic ProN", Verdana, sans-serif;
  --font-body: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --font-mono: ui-monospace, "SF Mono", "Cascadia Code", "Segoe UI Mono", Consolas, monospace;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background-color: var(--color-muslin);
  color: var(--color-ink);
  font-family: var(--font-body);
  line-height: 1.5;
}

h1, h2, h3 {
  font-family: var(--font-display);
  margin-top: 0;
}

.container {
  max-width: 480px;
  margin: 0 auto;
  padding: 1.5rem;
}
```

- [ ] **Step 2: Create a minimal index.html shell to prove the stylesheet loads**

`index.html`:
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FitMe — know your size before you buy</title>
  <link rel="stylesheet" href="styles/main.css">
</head>
<body>
  <div class="container">
    <h1>FitMe</h1>
  </div>
</body>
</html>
```

- [ ] **Step 3: Manually verify in browser**

Open `index.html` (double-click the file, or right-click → Open with →
your browser).

Expected: page background is a warm off-white (Muslin), the "FitMe"
heading text is dark (Ink), content is centered in a narrow column rather
than stretched full-width.

- [ ] **Step 4: Commit**

```bash
git add index.html styles/main.css
git commit -m "feat: add CSS design tokens and base styles"
```

---

### Task 3: Build index.html landing page content

**Files:**
- Modify: `index.html`
- Modify: `styles/main.css`

**Interfaces:**
- Consumes: `.container`, color/font tokens from Task 2
- Produces: `.site-header`, `.wordmark`, `.hero`, `.hero-sub`,
  `.cta-button`, `.trust-list` CSS classes (not reused elsewhere, but kept
  consistent in case a future measurement page reuses the same hero
  pattern)

- [ ] **Step 1: Replace index.html with the full landing page content**

`index.html`:
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FitMe — know your size before you buy</title>
  <link rel="stylesheet" href="styles/main.css">
</head>
<body>
  <header class="site-header">
    <div class="container">
      <span class="wordmark">FitMe</span>
    </div>
  </header>

  <main>
    <section class="hero container">
      <h1>Know your size before you buy — no fitting room required</h1>
      <p class="hero-sub">A tape measure and five minutes is all you need. We'll guide you through it, one measurement at a time.</p>
      <a class="cta-button" href="guide/chest.html">Measure your chest/bust &rarr;</a>
    </section>

    <section class="trust container">
      <ul class="trust-list">
        <li>No account needed to start</li>
        <li>Takes about 5 minutes</li>
        <li>Works with any soft tape measure</li>
      </ul>
    </section>
  </main>
</body>
</html>
```

- [ ] **Step 2: Add the matching styles**

Append to `styles/main.css`:
```css
.site-header {
  padding: 1rem 0;
}

.wordmark {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--color-thread-berry);
}

.hero {
  padding-top: 2rem;
  padding-bottom: 2rem;
}

.hero h1 {
  font-size: 1.75rem;
  line-height: 1.25;
}

.hero-sub {
  font-size: 1.05rem;
  color: var(--color-tick-charcoal);
}

.cta-button {
  display: inline-block;
  margin-top: 1rem;
  padding: 0.85rem 1.5rem;
  background-color: var(--color-thread-berry);
  color: var(--color-tape-ivory);
  text-decoration: none;
  border-radius: 999px;
  font-weight: 600;
  font-size: 1rem;
}

.cta-button:focus-visible {
  outline: 3px solid var(--color-ink);
  outline-offset: 2px;
}

.trust {
  padding-bottom: 2rem;
}

.trust-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--color-tick-charcoal);
}

.trust-list li::before {
  content: "✓ ";
  color: var(--color-success-moss);
  font-weight: 700;
}
```

- [ ] **Step 3: Manually verify in browser**

Reload `index.html`.

Expected: wordmark top-left in Thread Berry, headline and subhead render,
a pill-shaped Thread Berry button reads "Measure your chest/bust →", three
checkmarked trust lines below it. Clicking the button attempts to navigate
to `guide/chest.html` — a 404/file-not-found is expected right now since
that page doesn't exist until Task 4.

- [ ] **Step 4: Commit**

```bash
git add index.html styles/main.css
git commit -m "feat: build FitMe landing page content"
```

---

### Task 4: Build guide/chest.html page shell and unit toggle (static)

**Files:**
- Create: `guide/chest.html`
- Modify: `styles/main.css`

**Interfaces:**
- Consumes: `.container`, color/font tokens from Task 2
- Produces: element IDs `#chestInputLabel` is NOT yet created here (comes
  in Task 7) — this task produces `.unit-button` elements with a
  `data-unit` attribute (`"cm"` or `"in"`) and `aria-pressed` state, which
  Task 8's JavaScript reads and toggles. Also produces the `<script>` tag
  loading `../scripts/guide.js`, which every JS task (8-10) appends to.

- [ ] **Step 1: Create the page shell with header and unit toggle**

`guide/chest.html`:
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chest / Bust — FitMe</title>
  <link rel="stylesheet" href="../styles/main.css">
</head>
<body>
  <header class="guide-header">
    <div class="container">
      <a class="back-link" href="../index.html">&larr; FitMe</a>
      <h1>Chest / Bust</h1>
    </div>
  </header>

  <main class="container">
    <div class="unit-toggle" role="group" aria-label="Measurement unit">
      <button type="button" class="unit-button" data-unit="cm" aria-pressed="true">cm</button>
      <button type="button" class="unit-button" data-unit="in" aria-pressed="false">in</button>
    </div>
  </main>

  <script src="../scripts/guide.js"></script>
</body>
</html>
```

- [ ] **Step 2: Add the matching styles**

Append to `styles/main.css`:
```css
.guide-header {
  padding: 1rem 0;
}

.back-link {
  display: inline-block;
  color: var(--color-thread-berry);
  text-decoration: none;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.guide-header h1 {
  font-size: 1.5rem;
  margin: 0;
}

.unit-toggle {
  display: flex;
  gap: 0.5rem;
  margin: 1rem 0 1.5rem;
}

.unit-button {
  flex: 1;
  padding: 0.6rem 1rem;
  border: 2px solid var(--color-thread-berry);
  background-color: transparent;
  color: var(--color-thread-berry);
  border-radius: 999px;
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

.unit-button[aria-pressed="true"] {
  background-color: var(--color-thread-berry);
  color: var(--color-tape-ivory);
}

.unit-button:focus-visible {
  outline: 3px solid var(--color-ink);
  outline-offset: 2px;
}
```

- [ ] **Step 3: Manually verify in browser**

Open `guide/chest.html` directly, and also click through from
`index.html`'s CTA button (should now work).

Expected: back link + "Chest / Bust" title at top, two pill buttons ("cm"
filled in Thread Berry since it's selected by default, "in" outlined).
Clicking "in" does nothing yet — that's expected, the click behavior is
built in Task 8.

- [ ] **Step 4: Commit**

```bash
git add guide/chest.html styles/main.css
git commit -m "feat: add chest/bust page shell and unit toggle"
```

---

### Task 5: Build the mannequin diagram

**Files:**
- Modify: `guide/chest.html`
- Modify: `styles/main.css`

**Interfaces:**
- Consumes: color tokens from Task 2
- Produces: nothing later tasks depend on programmatically — this is a
  static illustration, not interactive.

- [ ] **Step 1: Insert the mannequin SVG into the page**

In `guide/chest.html`, add this section immediately after the closing
`</div>` of `.unit-toggle` (still inside `<main class="container">`):

```html
    <section class="mannequin-section" aria-label="Where to measure">
      <svg class="mannequin" viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="mannequinTitle">
        <title id="mannequinTitle">Diagram of a torso showing the tape measure wrapped around the fullest part of the chest</title>
        <circle class="mannequin-body" cx="100" cy="28" r="20" />
        <rect class="mannequin-body" x="90" y="46" width="20" height="14" />
        <path class="mannequin-body" d="M60 60 Q40 60 38 100 L34 230 Q100 245 166 230 L162 100 Q160 60 140 60 Z" />
        <rect class="mannequin-band" x="34" y="88" width="132" height="26" />
        <path class="mannequin-tape" d="M34 101 Q100 118 166 101" />
        <g class="mannequin-ticks">
          <line x1="55" y1="96" x2="55" y2="104" />
          <line x1="80" y1="105" x2="80" y2="113" />
          <line x1="100" y1="108" x2="100" y2="116" />
          <line x1="120" y1="105" x2="120" y2="113" />
          <line x1="145" y1="96" x2="145" y2="104" />
        </g>
        <circle class="mannequin-zero" cx="34" cy="101" r="5" />
      </svg>
      <p class="mannequin-caption">The tape wraps around the fullest part of your chest/bust, level all the way around.</p>
    </section>
```

- [ ] **Step 2: Add the matching styles**

Append to `styles/main.css`:
```css
.mannequin-section {
  padding-bottom: 1.5rem;
  text-align: center;
}

.mannequin {
  width: 100%;
  max-width: 220px;
  height: auto;
}

.mannequin-body {
  fill: var(--color-tape-ivory);
  stroke: var(--color-ink);
  stroke-width: 2;
}

.mannequin-band {
  fill: var(--color-thread-berry);
  opacity: 0.18;
  stroke: none;
}

.mannequin-tape {
  fill: none;
  stroke: var(--color-thread-berry);
  stroke-width: 3;
  stroke-dasharray: 6 5;
}

.mannequin-ticks {
  stroke: var(--color-tick-charcoal);
  stroke-width: 1.5;
}

.mannequin-zero {
  fill: var(--color-thread-berry);
  stroke: var(--color-tape-ivory);
  stroke-width: 1.5;
}

.mannequin-caption {
  font-size: 0.85rem;
  color: var(--color-tick-charcoal);
  margin-top: 0.5rem;
}
```

- [ ] **Step 3: Manually verify in browser**

Reload `guide/chest.html`.

Expected: below the unit toggle, a simple torso outline appears, centered,
with a soft Thread-Berry-tinted band across the chest, a dashed tape line
with small tick marks running across the band, and a small solid dot
(tape's "zero end") at the left side of the band. A caption sentence sits
below it.

- [ ] **Step 4: Commit**

```bash
git add guide/chest.html styles/main.css
git commit -m "feat: add mannequin diagram showing chest measurement point"
```

---

### Task 6: Build the 5 step cards

**Files:**
- Modify: `guide/chest.html`
- Modify: `styles/main.css`

**Interfaces:**
- Consumes: color/font tokens from Task 2
- Produces: `.illustration-placeholder` class, reused identically in each
  of the 5 cards (and intended to be reused by future measurement pages).

- [ ] **Step 1: Insert the step list into the page**

In `guide/chest.html`, add this immediately after the `.mannequin-section`
closing `</section>` tag (still inside `<main class="container">`):

```html
    <ol class="step-list">
      <li class="step-card">
        <p class="step-number">Step 1</p>
        <p class="step-text">Stand naturally — arms relaxed at your sides. Don't puff your chest out or suck it in.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
      <li class="step-card">
        <p class="step-number">Step 2</p>
        <p class="step-text">Wrap the tape measure around the fullest part of your chest/bust — usually right at nipple level.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
      <li class="step-card">
        <p class="step-number">Step 3</p>
        <p class="step-text">Keep the tape parallel to the floor all the way around. Check in a mirror, or ask someone to check the back for you.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
      <li class="step-card">
        <p class="step-number">Step 4</p>
        <p class="step-text">Pull the tape snug against your body — snug enough that it stays in place, but not tight enough to squeeze or leave a mark.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
      <li class="step-card">
        <p class="step-number">Step 5</p>
        <p class="step-text">Breathe normally and read the number where the tape meets the zero end.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
    </ol>
```

- [ ] **Step 2: Add the matching styles**

Append to `styles/main.css`:
```css
.step-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.step-card {
  position: relative;
  background-color: var(--color-tape-ivory);
  border-radius: 12px;
  padding: 1.25rem 1.25rem 1.25rem 2rem;
  margin-bottom: 1.25rem;
}

.step-card::before {
  content: "";
  position: absolute;
  left: 0.6rem;
  top: 0.75rem;
  bottom: 0.75rem;
  width: 6px;
  background-color: var(--color-tick-charcoal);
  background-image: repeating-linear-gradient(
    to bottom,
    var(--color-tape-ivory) 0,
    var(--color-tape-ivory) 2px,
    transparent 2px,
    transparent 10px
  );
  border-radius: 3px;
}

.step-number {
  font-family: var(--font-display);
  color: var(--color-thread-berry);
  font-weight: 700;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 0.35rem;
}

.step-text {
  margin: 0 0 0.75rem;
}

.illustration-placeholder {
  background-color: var(--color-muslin);
  border: 1px dashed var(--color-tick-charcoal);
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  font-size: 0.8rem;
  color: var(--color-tick-charcoal);
}
```

- [ ] **Step 3: Manually verify in browser**

Reload `guide/chest.html`.

Expected: 5 stacked cards below the mannequin, each with a dashed
tick-marked rail down its left edge, a bold small-caps "Step N" label in
Thread Berry, the instruction text, and a dashed placeholder box below the
text reading "Illustration coming soon".

- [ ] **Step 4: Commit**

```bash
git add guide/chest.html styles/main.css
git commit -m "feat: add 5 chest measurement step cards"
```

---

### Task 7: Build the result section (static markup)

**Files:**
- Modify: `guide/chest.html`
- Modify: `styles/main.css`

**Interfaces:**
- Consumes: color/font tokens from Task 2
- Produces: element IDs `#chestInputLabel`, `#chestInput`, `#chestError`,
  `#saveButton`, `#saveConfirmation`, `#lastSaved` — Tasks 8-10's
  JavaScript looks up every one of these by exact ID.

- [ ] **Step 1: Insert the result section into the page**

In `guide/chest.html`, add this immediately after the `.step-list`
closing `</ol>` tag (still inside `<main class="container">`):

```html
    <section class="result-section" aria-label="Your result">
      <h2>Your result</h2>
      <div class="result-field">
        <label for="chestInput" id="chestInputLabel">Chest/bust measurement (cm)</label>
        <input type="number" id="chestInput" inputmode="decimal" step="0.1" placeholder="e.g. 92">
      </div>
      <p class="field-error" id="chestError" hidden></p>
      <button type="button" class="save-button" id="saveButton">Save measurement</button>
      <p class="save-confirmation" id="saveConfirmation" hidden>Saved!</p>
      <p class="last-saved" id="lastSaved" hidden></p>
    </section>
```

- [ ] **Step 2: Add the matching styles**

Append to `styles/main.css`:
```css
.result-section {
  padding-bottom: 3rem;
}

.result-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 0.75rem;
}

.result-field label {
  font-size: 0.9rem;
  font-weight: 600;
}

.result-field input {
  font-family: var(--font-mono);
  font-size: 1.5rem;
  padding: 0.6rem 0.8rem;
  border: 2px solid var(--color-tick-charcoal);
  border-radius: 8px;
  background-color: var(--color-tape-ivory);
  color: var(--color-ink);
}

.result-field input:focus-visible {
  outline: 3px solid var(--color-thread-berry);
  outline-offset: 1px;
}

.field-error {
  color: var(--color-thread-berry);
  font-size: 0.85rem;
  margin: 0 0 0.75rem;
}

.save-button {
  padding: 0.75rem 1.5rem;
  background-color: var(--color-thread-berry);
  color: var(--color-tape-ivory);
  border: none;
  border-radius: 999px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

.save-button:focus-visible {
  outline: 3px solid var(--color-ink);
  outline-offset: 2px;
}

.save-confirmation {
  color: var(--color-success-moss);
  font-weight: 600;
  margin-top: 0.75rem;
}

.last-saved {
  color: var(--color-tick-charcoal);
  font-size: 0.85rem;
  margin-top: 0.5rem;
}
```

- [ ] **Step 3: Manually verify in browser**

Reload `guide/chest.html`.

Expected: below the step cards, an "Your result" heading, a labeled number
input in monospace font, a Thread Berry "Save measurement" button. The
error, confirmation, and last-saved lines are all invisible (they're
`hidden` until JavaScript shows them in later tasks). Clicking Save does
nothing yet.

- [ ] **Step 4: Commit**

```bash
git add guide/chest.html styles/main.css
git commit -m "feat: add result section markup for chest measurement"
```

---

### Task 8: Wire up the unit toggle (cm ↔ in conversion)

**Files:**
- Modify: `scripts/guide.js`

**Interfaces:**
- Consumes: `.unit-button[data-unit]` / `aria-pressed` from Task 4,
  `#chestInputLabel` / `#chestInput` from Task 7
- Produces: module-level `currentUnit` variable (starts `"cm"`) and a
  `setUnit(unit)` function — Task 9 reads `currentUnit` to validate against
  the right range, and Task 10 reads it to display the pre-filled value in
  the right unit.

- [ ] **Step 1: Write the unit toggle logic**

`scripts/guide.js` (full file contents so far):
```js
const CM_PER_INCH = 2.54;
const STORAGE_KEY = "fitme_chest";
const MIN_CM = 30;
const MAX_CM = 200;

const unitButtons = document.querySelectorAll(".unit-button");
const chestInput = document.getElementById("chestInput");
const chestInputLabel = document.getElementById("chestInputLabel");

let currentUnit = "cm";

function setUnit(unit) {
  const previousUnit = currentUnit;
  currentUnit = unit;

  unitButtons.forEach((button) => {
    const isSelected = button.dataset.unit === unit;
    button.setAttribute("aria-pressed", String(isSelected));
  });

  chestInputLabel.textContent = `Chest/bust measurement (${unit})`;

  const currentValue = parseFloat(chestInput.value);
  if (!Number.isNaN(currentValue)) {
    let converted = currentValue;
    if (unit === "in" && previousUnit === "cm") {
      converted = currentValue / CM_PER_INCH;
    } else if (unit === "cm" && previousUnit === "in") {
      converted = currentValue * CM_PER_INCH;
    }
    chestInput.value = Math.round(converted * 10) / 10;
  }
}

unitButtons.forEach((button) => {
  button.addEventListener("click", () => setUnit(button.dataset.unit));
});
```

- [ ] **Step 2: Manually verify in browser**

Reload `guide/chest.html`. Type `90` into the measurement input (cm
selected by default). Click the "in" button.

Expected: the "in" button becomes filled in Thread Berry, the "cm" button
becomes outlined, the label above the input changes to "Chest/bust
measurement (in)", and the input value changes to approximately `35.4`.

Click "cm" again. Expected: value converts back to approximately `90`
(may be `90` or very close due to rounding).

- [ ] **Step 3: Commit**

```bash
git add scripts/guide.js
git commit -m "feat: wire up cm/in unit toggle with conversion"
```

---

### Task 9: Add validation and save-to-localStorage

**Files:**
- Modify: `scripts/guide.js`

**Interfaces:**
- Consumes: `currentUnit`, `CM_PER_INCH`, `STORAGE_KEY`, `MIN_CM`, `MAX_CM`,
  `chestInput` from Task 8; `#chestError`, `#saveButton`,
  `#saveConfirmation`, `#lastSaved` from Task 7
- Produces: `updateLastSaved(valueInCm)` and `cmToDisplayValue(valueInCm)`
  functions — Task 10 calls both directly on page load, so their names and
  single `valueInCm` parameter must match exactly.

- [ ] **Step 1: Add validation, save, and last-saved-display logic**

Append to `scripts/guide.js`:
```js
const chestError = document.getElementById("chestError");
const saveButton = document.getElementById("saveButton");
const saveConfirmation = document.getElementById("saveConfirmation");
const lastSaved = document.getElementById("lastSaved");

function getRangeForUnit(unit) {
  if (unit === "cm") {
    return { min: MIN_CM, max: MAX_CM };
  }
  return {
    min: Math.round((MIN_CM / CM_PER_INCH) * 10) / 10,
    max: Math.round((MAX_CM / CM_PER_INCH) * 10) / 10,
  };
}

function showError(message) {
  chestError.textContent = message;
  chestError.hidden = false;
}

function clearError() {
  chestError.hidden = true;
  chestError.textContent = "";
}

function cmToDisplayValue(valueInCm) {
  return currentUnit === "in"
    ? Math.round((valueInCm / CM_PER_INCH) * 10) / 10
    : Math.round(valueInCm * 10) / 10;
}

function updateLastSaved(valueInCm) {
  const displayValue = cmToDisplayValue(valueInCm);
  lastSaved.textContent = `Last saved: ${displayValue} ${currentUnit}`;
  lastSaved.hidden = false;
}

function saveMeasurement() {
  clearError();
  saveConfirmation.hidden = true;

  const value = parseFloat(chestInput.value);
  const range = getRangeForUnit(currentUnit);

  if (Number.isNaN(value)) {
    showError("Enter a number before saving.");
    return;
  }

  if (value < range.min || value > range.max) {
    showError(`Enter a value between ${range.min} and ${range.max} ${currentUnit}.`);
    return;
  }

  const valueInCm = currentUnit === "in" ? value * CM_PER_INCH : value;
  localStorage.setItem(STORAGE_KEY, String(valueInCm));

  saveConfirmation.hidden = false;
  updateLastSaved(valueInCm);
}

saveButton.addEventListener("click", saveMeasurement);
```

- [ ] **Step 2: Manually verify in browser**

Reload `guide/chest.html`.

Test invalid input: type `0`, click Save. Expected: an inline red error
"Enter a value between 30 and 200 cm." appears; no confirmation shows.

Test out-of-range: type `500`, click Save. Expected: same style of error,
mentioning the 30–200 range.

Test valid input: clear the field, type `90`, click Save. Expected: the
error disappears, "Saved!" appears in Success Moss green, and "Last saved:
90 cm" appears below it.

Open browser DevTools (F12) → Application/Storage tab → Local Storage →
your file's origin. Expected: a key `fitme_chest` with value `90`.

- [ ] **Step 3: Commit**

```bash
git add scripts/guide.js
git commit -m "feat: validate and save chest measurement to localStorage"
```

---

### Task 10: Pre-fill saved measurement on page load

**Files:**
- Modify: `scripts/guide.js`

**Interfaces:**
- Consumes: `STORAGE_KEY`, `currentUnit`, `chestInput`, `updateLastSaved()`,
  and `cmToDisplayValue()` from Task 9

- [ ] **Step 1: Add the load-on-startup logic**

Append to `scripts/guide.js`:
```js
function loadSavedMeasurement() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) {
    return;
  }

  const valueInCm = parseFloat(stored);
  if (Number.isNaN(valueInCm)) {
    return;
  }

  chestInput.value = cmToDisplayValue(valueInCm);
  updateLastSaved(valueInCm);
}

loadSavedMeasurement();
```

- [ ] **Step 2: Manually verify in browser**

With `90` already saved from Task 9's test, reload `guide/chest.html`
(without clicking anything first).

Expected: the input already shows `90`, and "Last saved: 90 cm" is
visible immediately, with no click needed.

Clear your saved value for a clean slate before the next task:
DevTools → Application → Local Storage → delete the `fitme_chest` entry.

- [ ] **Step 3: Commit**

```bash
git add scripts/guide.js
git commit -m "feat: pre-fill saved chest measurement on page load"
```

---

### Task 11: Full manual test pass and final review

**Files:**
- None (verification only)

**Interfaces:**
- Consumes: the finished `index.html`, `guide/chest.html`,
  `styles/main.css`, `scripts/guide.js`

- [ ] **Step 1: Run through the spec's testing checklist**

With `fitme_chest` cleared in DevTools beforehand:

1. Open `index.html`. Click "Measure your chest/bust →". Confirm it
   navigates to `guide/chest.html`.
2. On `guide/chest.html`, toggle cm → in → cm with no value entered.
   Confirm no errors appear and the label updates each time.
3. Type `92`, toggle to "in", confirm it shows about `36.2`, toggle back
   to "cm", confirm it returns to about `92`.
4. With "cm" selected, enter `0` and click Save — confirm inline error,
   no "Saved!" message.
5. Enter `-5` and click Save — confirm inline error.
6. Enter `500` and click Save — confirm inline error.
7. Enter `92` and click Save — confirm "Saved!" and "Last saved: 92 cm"
   appear, and DevTools shows `fitme_chest` = `92`.
8. Reload the page. Confirm the input pre-fills with `92` and "Last
   saved" shows immediately.
9. Resize the browser window to a wide desktop width. Confirm the layout
   stays centered in a readable column rather than stretching edge to
   edge, and nothing overlaps or breaks.

- [ ] **Step 2: Fix anything that doesn't match, re-test, then commit**

If any check fails, fix the specific file, re-run that check, then:

```bash
git add -A
git commit -m "fix: address issues found in manual test pass"
```

If everything already passes, skip the commit — there's nothing to commit.

- [ ] **Step 3: Final status check**

```bash
git status
git log --oneline
```

Expected: working tree clean, and a commit history showing each milestone
from Task 1 through this task.
