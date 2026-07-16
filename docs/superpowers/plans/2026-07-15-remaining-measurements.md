# Remaining 7 Measurement Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per explicit user instruction, run with automated (subagent) review only — no manual checkpoint pauses between tasks.

**Goal:** Generalize `scripts/guide.js` into genuinely shared logic, turn
`index.html` into a hub linking all 8 measurements, and build the 7
remaining measurement pages (waist, hips, inseam, shoulder width, sleeve
length, neck, thigh) using the already-approved chest/bust pattern.

**Architecture:** Same plain static HTML/CSS/JS as chest/bust. One shared
`styles/main.css` (no changes needed after Task 1 — every new page reuses
existing classes). One shared `scripts/guide.js`, now driven by a small
per-page `window.FITME_CONFIG` object instead of hardcoded chest-specific
values.

**Tech Stack:** HTML5, CSS custom properties, vanilla JavaScript,
`localStorage`. No test framework — every task's test step is a manual
browser check (or automated-subagent-executed equivalent).

## Global Constraints

- No frameworks, no build step, no npm dependencies, $0 budget
- Reuse `styles/main.css`'s existing design tokens exactly — no new colors
  or fonts. Colors: Muslin `#EDEAE2`, Ink `#2B2A28`, Thread Berry
  `#A8324A`, Tape Ivory `#F2E9D8`, Tick Charcoal `#4A4640`, Success Moss
  `#5C7A5E`. Fonts: display `ui-rounded, "Segoe UI Rounded", "Hiragino Maru Gothic ProN", Verdana, sans-serif`;
  body `-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
  mono `ui-monospace, "SF Mono", "Cascadia Code", "Segoe UI Mono", Consolas, monospace`
- Every measurement page: header with "← FitMe" back link to `../index.html`,
  unit toggle (cm/in), mannequin SVG, 5 step cards (generic body, no
  chest-vs-bust-style branching), result section (input + Save + inline
  error/confirmation/last-saved, all with the existing ARIA pattern:
  `role="alert"` on the error, `aria-live="polite"` on the confirmation,
  `aria-describedby`/`aria-invalid` wiring on the input)
- `scripts/guide.js` reads `window.FITME_CONFIG = { measurementName,
  storageKey, minCm, maxCm }` — do not hardcode per-measurement values in
  the shared script after Task 1
- No accounts, no Firestore, no Three.js/3D — out of scope

---

### Task 1: Generalize guide.js and chest.html to the config-driven pattern

**Files:**
- Modify: `scripts/guide.js`
- Modify: `guide/chest.html`

**Interfaces:**
- Produces: the `window.FITME_CONFIG` contract (`measurementName`,
  `storageKey`, `minCm`, `maxCm`) and the generic element IDs
  `#measurementInput`, `#measurementInputLabel`, `#measurementError` —
  every later task's page must use exactly these IDs and provide exactly
  this config shape for `guide.js` to work.

- [ ] **Step 1: Rewrite scripts/guide.js to read from window.FITME_CONFIG**

Replace the entire contents of `scripts/guide.js` with:

```js
const config = window.FITME_CONFIG;
const CM_PER_INCH = 2.54;

const unitButtons = document.querySelectorAll(".unit-button");
const measurementInput = document.getElementById("measurementInput");
const measurementInputLabel = document.getElementById("measurementInputLabel");

let currentUnit = "cm";

function setUnit(unit) {
  const previousUnit = currentUnit;
  currentUnit = unit;

  unitButtons.forEach((button) => {
    const isSelected = button.dataset.unit === unit;
    button.setAttribute("aria-pressed", String(isSelected));
  });

  measurementInputLabel.textContent = `${config.measurementName} (${unit})`;

  const currentValue = parseFloat(measurementInput.value);
  if (!Number.isNaN(currentValue)) {
    let converted = currentValue;
    if (unit === "in" && previousUnit === "cm") {
      converted = currentValue / CM_PER_INCH;
    } else if (unit === "cm" && previousUnit === "in") {
      converted = currentValue * CM_PER_INCH;
    }
    measurementInput.value = Math.round(converted * 10) / 10;
  }
}

unitButtons.forEach((button) => {
  button.addEventListener("click", () => setUnit(button.dataset.unit));
});

const measurementError = document.getElementById("measurementError");
const saveButton = document.getElementById("saveButton");
const saveConfirmation = document.getElementById("saveConfirmation");
const lastSaved = document.getElementById("lastSaved");

function getRangeForUnit(unit) {
  if (unit === "cm") {
    return { min: config.minCm, max: config.maxCm };
  }
  return {
    min: Math.round((config.minCm / CM_PER_INCH) * 10) / 10,
    max: Math.round((config.maxCm / CM_PER_INCH) * 10) / 10,
  };
}

function showError(message) {
  measurementError.textContent = message;
  measurementError.hidden = false;
  measurementInput.setAttribute("aria-invalid", "true");
}

function clearError() {
  measurementError.hidden = true;
  measurementError.textContent = "";
  measurementInput.removeAttribute("aria-invalid");
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

  const value = parseFloat(measurementInput.value);
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
  try {
    localStorage.setItem(config.storageKey, String(valueInCm));
  } catch (error) {
    showError("Couldn't save — your browser may be blocking storage.");
    return;
  }

  saveConfirmation.hidden = false;
  updateLastSaved(valueInCm);
}

saveButton.addEventListener("click", saveMeasurement);

function loadSavedMeasurement() {
  let stored;
  try {
    stored = localStorage.getItem(config.storageKey);
  } catch (error) {
    return;
  }
  if (stored === null) {
    return;
  }

  const valueInCm = parseFloat(stored);
  if (Number.isNaN(valueInCm)) {
    return;
  }

  measurementInput.value = cmToDisplayValue(valueInCm);
  updateLastSaved(valueInCm);
}

loadSavedMeasurement();
```

- [ ] **Step 2: Update guide/chest.html — add the config block and rename the 3 chest-specific IDs**

In `guide/chest.html`, immediately before the existing `<script src="../scripts/guide.js"></script>` line, insert:

```html
  <script>
    window.FITME_CONFIG = {
      measurementName: "Chest/bust measurement",
      storageKey: "fitme_chest",
      minCm: 30,
      maxCm: 200,
    };
  </script>
```

Then, in the same file's result section, replace this block:

```html
      <div class="result-field">
        <label for="chestInput" id="chestInputLabel">Chest/bust measurement (cm)</label>
        <input type="number" id="chestInput" inputmode="decimal" step="0.1" placeholder="e.g. 92" aria-describedby="chestError">
      </div>
      <p class="field-error" id="chestError" role="alert" hidden></p>
```

with:

```html
      <div class="result-field">
        <label for="measurementInput" id="measurementInputLabel">Chest/bust measurement (cm)</label>
        <input type="number" id="measurementInput" inputmode="decimal" step="0.1" placeholder="e.g. 92" aria-describedby="measurementError">
      </div>
      <p class="field-error" id="measurementError" role="alert" hidden></p>
```

(Only the 3 IDs change: `chestInput`→`measurementInput`,
`chestInputLabel`→`measurementInputLabel`, `chestError`→`measurementError`,
plus the matching `for`/`aria-describedby` references. Nothing else in the
file changes.)

- [ ] **Step 3: Regression-test chest.html manually in a browser**

Clear `localStorage.fitme_chest` first, then open `guide/chest.html` and
verify, exactly as before:
1. Toggle cm→in→cm with no value — no errors, label updates each time
2. Enter 92, toggle to in (~36.2), toggle back to cm (~91.9, rounding is
   expected)
3. Enter 0, click Save — inline error, `aria-invalid="true"` on the input
4. Enter 92, click Save — "Saved!", "Last saved: 92 cm",
   `localStorage.fitme_chest` = `"92"`, `aria-invalid` removed from the
   input
5. Reload — input pre-fills with 92, "Last saved" shows immediately

- [ ] **Step 4: Commit**

```bash
git add scripts/guide.js guide/chest.html
git commit -m "refactor: generalize guide.js to a config-driven shared script"
```

---

### Task 2: Turn index.html into a hub linking all 8 measurements

**Files:**
- Modify: `index.html`
- Modify: `styles/main.css`

**Interfaces:**
- Consumes: `.container`, existing color/font tokens
- Produces: `.measurement-list`, `.measurement-link` CSS classes (not
  consumed by later tasks — this is a self-contained addition)

- [ ] **Step 1: Replace the hero's single CTA with a list of all 8 measurements**

In `index.html`, replace this block:

```html
    <section class="hero container">
      <h1>Know your size before you buy — no fitting room required</h1>
      <p class="hero-sub">A tape measure and five minutes is all you need. We'll guide you through it, one measurement at a time.</p>
      <a class="cta-button" href="guide/chest.html">Measure your chest/bust &rarr;</a>
    </section>
```

with:

```html
    <section class="hero container">
      <h1>Know your size before you buy — no fitting room required</h1>
      <p class="hero-sub">A tape measure and five minutes is all you need. We'll guide you through it, one measurement at a time.</p>
    </section>

    <section class="measurements container" aria-label="Choose a measurement">
      <h2>Choose a measurement to start</h2>
      <ul class="measurement-list">
        <li><a class="measurement-link" href="guide/chest.html">Chest / Bust &rarr;</a></li>
        <li><a class="measurement-link" href="guide/waist.html">Waist &rarr;</a></li>
        <li><a class="measurement-link" href="guide/hips.html">Hips &rarr;</a></li>
        <li><a class="measurement-link" href="guide/inseam.html">Inseam &rarr;</a></li>
        <li><a class="measurement-link" href="guide/shoulder.html">Shoulder width &rarr;</a></li>
        <li><a class="measurement-link" href="guide/sleeve.html">Sleeve length &rarr;</a></li>
        <li><a class="measurement-link" href="guide/neck.html">Neck &rarr;</a></li>
        <li><a class="measurement-link" href="guide/thigh.html">Thigh &rarr;</a></li>
      </ul>
    </section>
```

(Links to pages not yet built in this plan — waist.html through
thigh.html — will 404 until their own tasks complete later in this plan.
This is expected, the same way chest.html's link 404'd before it existed.)

- [ ] **Step 2: Add the matching styles**

Append to `styles/main.css`:

```css
.measurements {
  padding-bottom: 2rem;
}

.measurement-list {
  list-style: none;
  padding: 0;
  margin: 1rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.measurement-link {
  display: block;
  padding: 0.85rem 1.1rem;
  background-color: var(--color-tape-ivory);
  color: var(--color-ink);
  text-decoration: none;
  border-radius: 10px;
  font-weight: 600;
}

.measurement-link:focus-visible {
  outline: 3px solid var(--color-thread-berry);
  outline-offset: 2px;
}
```

- [ ] **Step 3: Manually verify in browser**

Open `index.html`. Expected: hero heading/subhead unchanged, no single big
CTA button anymore, instead a "Choose a measurement to start" heading
followed by 8 stacked rows, each a Tape-Ivory rounded block reading e.g.
"Chest / Bust →". Clicking "Chest / Bust →" navigates correctly (already
built). Clicking any other row 404s for now — expected until its task
completes.

- [ ] **Step 4: Commit**

```bash
git add index.html styles/main.css
git commit -m "feat: turn index.html into a hub linking all 8 measurements"
```

---

### Task 3: Build guide/waist.html

**Files:**
- Create: `guide/waist.html`

**Interfaces:**
- Consumes: `window.FITME_CONFIG` contract and `#measurementInput` /
  `#measurementInputLabel` / `#measurementError` IDs from Task 1; all CSS
  classes from `styles/main.css` (no new CSS)

- [ ] **Step 1: Create guide/waist.html**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Waist — FitMe</title>
  <link rel="stylesheet" href="../styles/main.css">
</head>
<body>
  <header class="guide-header">
    <div class="container">
      <a class="back-link" href="../index.html">&larr; FitMe</a>
      <h1>Waist</h1>
    </div>
  </header>

  <main class="container">
    <div class="unit-toggle" role="group" aria-label="Measurement unit">
      <button type="button" class="unit-button" data-unit="cm" aria-pressed="true">cm</button>
      <button type="button" class="unit-button" data-unit="in" aria-pressed="false">in</button>
    </div>
    <section class="mannequin-section" aria-label="Where to measure">
      <svg class="mannequin" viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="mannequinTitle">
        <title id="mannequinTitle">Diagram of a torso showing the tape measure wrapped around the natural waist</title>
        <circle class="mannequin-body" cx="100" cy="28" r="20" />
        <rect class="mannequin-body" x="90" y="46" width="20" height="14" />
        <path class="mannequin-body" d="M60 60 Q40 60 38 100 L34 230 Q100 245 166 230 L162 100 Q160 60 140 60 Z" />
        <rect class="mannequin-band" x="34" y="140" width="132" height="24" />
        <path class="mannequin-tape" d="M34 152 Q100 168 166 152" />
        <g class="mannequin-ticks">
          <line x1="55" y1="147" x2="55" y2="155" />
          <line x1="80" y1="155" x2="80" y2="163" />
          <line x1="100" y1="158" x2="100" y2="166" />
          <line x1="120" y1="155" x2="120" y2="163" />
          <line x1="145" y1="147" x2="145" y2="155" />
        </g>
        <circle class="mannequin-zero" cx="34" cy="152" r="5" />
      </svg>
      <p class="mannequin-caption">The tape wraps around your natural waist, level all the way around.</p>
    </section>
    <ol class="step-list">
      <li class="step-card">
        <p class="step-number">Step 1</p>
        <p class="step-text">Stand naturally, relaxed — don't hold your stomach in or push it out.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
      <li class="step-card">
        <p class="step-number">Step 2</p>
        <p class="step-text">Find your natural waist — usually the narrowest point above your belly button and below your ribs. If you're not sure, bend gently to one side; the crease that forms is your waist.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
      <li class="step-card">
        <p class="step-number">Step 3</p>
        <p class="step-text">Wrap the tape around that point, keeping it parallel to the floor all the way around.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
      <li class="step-card">
        <p class="step-number">Step 4</p>
        <p class="step-text">Pull the tape snug against your body — not tight enough to squeeze or leave a mark.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
      <li class="step-card">
        <p class="step-number">Step 5</p>
        <p class="step-text">Breathe out normally and read the number where the tape meets the zero end.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
    </ol>
    <section class="result-section" aria-label="Your result">
      <h2>Your result</h2>
      <div class="result-field">
        <label for="measurementInput" id="measurementInputLabel">Waist measurement (cm)</label>
        <input type="number" id="measurementInput" inputmode="decimal" step="0.1" placeholder="e.g. 80" aria-describedby="measurementError">
      </div>
      <p class="field-error" id="measurementError" role="alert" hidden></p>
      <button type="button" class="save-button" id="saveButton">Save measurement</button>
      <p class="save-confirmation" id="saveConfirmation" aria-live="polite" hidden>Saved!</p>
      <p class="last-saved" id="lastSaved" hidden></p>
    </section>
  </main>

  <script>
    window.FITME_CONFIG = {
      measurementName: "Waist measurement",
      storageKey: "fitme_waist",
      minCm: 50,
      maxCm: 160,
    };
  </script>
  <script src="../scripts/guide.js"></script>
</body>
</html>
```

- [ ] **Step 2: Manually verify in browser**

Open `guide/waist.html`. Expected: same layout pattern as chest.html, with
the highlighted band lower on the torso (waist level) and step text about
finding the natural waist. Toggle cm/in, save 80, confirm "Saved!" and
`localStorage.fitme_waist` = `"80"`. Reload — pre-fills with 80.

- [ ] **Step 3: Commit**

```bash
git add guide/waist.html
git commit -m "feat: add waist measurement page"
```

---

### Task 4: Build guide/hips.html

**Files:**
- Create: `guide/hips.html`

**Interfaces:**
- Consumes: same as Task 3

- [ ] **Step 1: Create guide/hips.html**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hips — FitMe</title>
  <link rel="stylesheet" href="../styles/main.css">
</head>
<body>
  <header class="guide-header">
    <div class="container">
      <a class="back-link" href="../index.html">&larr; FitMe</a>
      <h1>Hips</h1>
    </div>
  </header>

  <main class="container">
    <div class="unit-toggle" role="group" aria-label="Measurement unit">
      <button type="button" class="unit-button" data-unit="cm" aria-pressed="true">cm</button>
      <button type="button" class="unit-button" data-unit="in" aria-pressed="false">in</button>
    </div>
    <section class="mannequin-section" aria-label="Where to measure">
      <svg class="mannequin" viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="mannequinTitle">
        <title id="mannequinTitle">Diagram of a torso showing the tape measure wrapped around the fullest part of the hips</title>
        <circle class="mannequin-body" cx="100" cy="28" r="20" />
        <rect class="mannequin-body" x="90" y="46" width="20" height="14" />
        <path class="mannequin-body" d="M60 60 Q40 60 38 100 L34 230 Q100 245 166 230 L162 100 Q160 60 140 60 Z" />
        <rect class="mannequin-band" x="34" y="192" width="132" height="26" />
        <path class="mannequin-tape" d="M34 205 Q100 222 166 205" />
        <g class="mannequin-ticks">
          <line x1="55" y1="200" x2="55" y2="208" />
          <line x1="80" y1="209" x2="80" y2="217" />
          <line x1="100" y1="212" x2="100" y2="220" />
          <line x1="120" y1="209" x2="120" y2="217" />
          <line x1="145" y1="200" x2="145" y2="208" />
        </g>
        <circle class="mannequin-zero" cx="34" cy="205" r="5" />
      </svg>
      <p class="mannequin-caption">The tape wraps around the fullest part of your hips, level all the way around.</p>
    </section>
    <ol class="step-list">
      <li class="step-card">
        <p class="step-number">Step 1</p>
        <p class="step-text">Stand with your feet together and weight even on both feet.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
      <li class="step-card">
        <p class="step-number">Step 2</p>
        <p class="step-text">Find the fullest part of your hips and rear — usually about 20cm (8in) below your waist.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
      <li class="step-card">
        <p class="step-number">Step 3</p>
        <p class="step-text">Wrap the tape around that point, keeping it parallel to the floor all the way around. Check in a mirror, or ask someone to check the back for you.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
      <li class="step-card">
        <p class="step-number">Step 4</p>
        <p class="step-text">Pull the tape snug against your body — not tight enough to squeeze or leave a mark.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
      <li class="step-card">
        <p class="step-number">Step 5</p>
        <p class="step-text">Read the number where the tape meets the zero end.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
    </ol>
    <section class="result-section" aria-label="Your result">
      <h2>Your result</h2>
      <div class="result-field">
        <label for="measurementInput" id="measurementInputLabel">Hips measurement (cm)</label>
        <input type="number" id="measurementInput" inputmode="decimal" step="0.1" placeholder="e.g. 100" aria-describedby="measurementError">
      </div>
      <p class="field-error" id="measurementError" role="alert" hidden></p>
      <button type="button" class="save-button" id="saveButton">Save measurement</button>
      <p class="save-confirmation" id="saveConfirmation" aria-live="polite" hidden>Saved!</p>
      <p class="last-saved" id="lastSaved" hidden></p>
    </section>
  </main>

  <script>
    window.FITME_CONFIG = {
      measurementName: "Hips measurement",
      storageKey: "fitme_hips",
      minCm: 60,
      maxCm: 170,
    };
  </script>
  <script src="../scripts/guide.js"></script>
</body>
</html>
```

- [ ] **Step 2: Manually verify in browser**

Open `guide/hips.html`. Same checks as Task 3, adapted: save 100, confirm
`localStorage.fitme_hips` = `"100"`, reload pre-fills.

- [ ] **Step 3: Commit**

```bash
git add guide/hips.html
git commit -m "feat: add hips measurement page"
```

---

### Task 5: Build guide/inseam.html (introduces the new leg mannequin shape)

**Files:**
- Create: `guide/inseam.html`

**Interfaces:**
- Consumes: same config/ID contract as Task 3. Introduces the leg-shape SVG
  markup pattern (two rounded-rect legs + a rounded-rect hip block) reused
  by Task 9 (thigh) — no new CSS classes, only new coordinates reusing
  `.mannequin-body`/`.mannequin-tape`/`.mannequin-ticks`/`.mannequin-zero`.

- [ ] **Step 1: Create guide/inseam.html**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inseam — FitMe</title>
  <link rel="stylesheet" href="../styles/main.css">
</head>
<body>
  <header class="guide-header">
    <div class="container">
      <a class="back-link" href="../index.html">&larr; FitMe</a>
      <h1>Inseam</h1>
    </div>
  </header>

  <main class="container">
    <div class="unit-toggle" role="group" aria-label="Measurement unit">
      <button type="button" class="unit-button" data-unit="cm" aria-pressed="true">cm</button>
      <button type="button" class="unit-button" data-unit="in" aria-pressed="false">in</button>
    </div>
    <section class="mannequin-section" aria-label="Where to measure">
      <svg class="mannequin" viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="mannequinTitle">
        <title id="mannequinTitle">Diagram of legs showing the tape measure running from the crotch straight down to the floor</title>
        <rect class="mannequin-body" x="50" y="20" width="100" height="70" rx="20" />
        <rect class="mannequin-body" x="55" y="85" width="40" height="155" rx="18" />
        <rect class="mannequin-body" x="105" y="85" width="40" height="155" rx="18" />
        <path class="mannequin-tape" d="M75 90 L75 235" />
        <g class="mannequin-ticks">
          <line x1="68" y1="120" x2="82" y2="120" />
          <line x1="68" y1="150" x2="82" y2="150" />
          <line x1="68" y1="180" x2="82" y2="180" />
          <line x1="68" y1="210" x2="82" y2="210" />
        </g>
        <circle class="mannequin-zero" cx="75" cy="90" r="5" />
      </svg>
      <p class="mannequin-caption">The tape runs from your crotch straight down the inside of your leg to the floor.</p>
    </section>
    <ol class="step-list">
      <li class="step-card">
        <p class="step-number">Step 1</p>
        <p class="step-text">Wear the shoes you'd normally wear with these pants, or measure barefoot for the most accurate number.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
      <li class="step-card">
        <p class="step-number">Step 2</p>
        <p class="step-text">Stand up straight with your feet slightly apart.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
      <li class="step-card">
        <p class="step-number">Step 3</p>
        <p class="step-text">Measure from your crotch straight down the inside of your leg to the floor (or to wherever you want your pants to end).</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
      <li class="step-card">
        <p class="step-number">Step 4</p>
        <p class="step-text">Keep the tape straight and taut — don't let it follow the curve of your leg.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
      <li class="step-card">
        <p class="step-number">Step 5</p>
        <p class="step-text">Read the number at the bottom, at the floor.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
    </ol>
    <section class="result-section" aria-label="Your result">
      <h2>Your result</h2>
      <div class="result-field">
        <label for="measurementInput" id="measurementInputLabel">Inseam measurement (cm)</label>
        <input type="number" id="measurementInput" inputmode="decimal" step="0.1" placeholder="e.g. 78" aria-describedby="measurementError">
      </div>
      <p class="field-error" id="measurementError" role="alert" hidden></p>
      <button type="button" class="save-button" id="saveButton">Save measurement</button>
      <p class="save-confirmation" id="saveConfirmation" aria-live="polite" hidden>Saved!</p>
      <p class="last-saved" id="lastSaved" hidden></p>
    </section>
  </main>

  <script>
    window.FITME_CONFIG = {
      measurementName: "Inseam measurement",
      storageKey: "fitme_inseam",
      minCm: 50,
      maxCm: 100,
    };
  </script>
  <script src="../scripts/guide.js"></script>
</body>
</html>
```

- [ ] **Step 2: Manually verify in browser**

Open `guide/inseam.html`. Expected: a two-legged silhouette (not a torso),
with a vertical dashed line down the left leg and 4 tick marks. Save 78,
confirm `localStorage.fitme_inseam` = `"78"`, reload pre-fills.

- [ ] **Step 3: Commit**

```bash
git add guide/inseam.html
git commit -m "feat: add inseam measurement page with new leg mannequin shape"
```

---

### Task 6: Build guide/shoulder.html

**Files:**
- Create: `guide/shoulder.html`

**Interfaces:**
- Consumes: same config/ID contract as Task 3

- [ ] **Step 1: Create guide/shoulder.html**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shoulder width — FitMe</title>
  <link rel="stylesheet" href="../styles/main.css">
</head>
<body>
  <header class="guide-header">
    <div class="container">
      <a class="back-link" href="../index.html">&larr; FitMe</a>
      <h1>Shoulder width</h1>
    </div>
  </header>

  <main class="container">
    <div class="unit-toggle" role="group" aria-label="Measurement unit">
      <button type="button" class="unit-button" data-unit="cm" aria-pressed="true">cm</button>
      <button type="button" class="unit-button" data-unit="in" aria-pressed="false">in</button>
    </div>
    <section class="mannequin-section" aria-label="Where to measure">
      <svg class="mannequin" viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="mannequinTitle">
        <title id="mannequinTitle">Diagram of a torso showing the tape measure running straight across the back from shoulder edge to shoulder edge</title>
        <circle class="mannequin-body" cx="100" cy="28" r="20" />
        <rect class="mannequin-body" x="90" y="46" width="20" height="14" />
        <path class="mannequin-body" d="M60 60 Q40 60 38 100 L34 230 Q100 245 166 230 L162 100 Q160 60 140 60 Z" />
        <path class="mannequin-tape" d="M40 92 L160 92" />
        <g class="mannequin-ticks">
          <line x1="60" y1="87" x2="60" y2="97" />
          <line x1="100" y1="87" x2="100" y2="97" />
          <line x1="140" y1="87" x2="140" y2="97" />
        </g>
        <circle class="mannequin-zero" cx="40" cy="92" r="5" />
      </svg>
      <p class="mannequin-caption">The tape runs straight across your back, from the edge of one shoulder to the edge of the other.</p>
    </section>
    <ol class="step-list">
      <li class="step-card">
        <p class="step-number">Step 1</p>
        <p class="step-text">Stand naturally with your arms relaxed at your sides.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
      <li class="step-card">
        <p class="step-number">Step 2</p>
        <p class="step-text">This one's tricky to do alone — ask someone to help if you can.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
      <li class="step-card">
        <p class="step-number">Step 3</p>
        <p class="step-text">Measure straight across your back, from the edge of one shoulder (where your arm meets your shoulder) to the edge of the other.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
      <li class="step-card">
        <p class="step-number">Step 4</p>
        <p class="step-text">Keep the tape flat and straight — don't let it follow the curve of your neck or back.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
      <li class="step-card">
        <p class="step-number">Step 5</p>
        <p class="step-text">Read the number where the tape reaches the far shoulder.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
    </ol>
    <section class="result-section" aria-label="Your result">
      <h2>Your result</h2>
      <div class="result-field">
        <label for="measurementInput" id="measurementInputLabel">Shoulder width measurement (cm)</label>
        <input type="number" id="measurementInput" inputmode="decimal" step="0.1" placeholder="e.g. 42" aria-describedby="measurementError">
      </div>
      <p class="field-error" id="measurementError" role="alert" hidden></p>
      <button type="button" class="save-button" id="saveButton">Save measurement</button>
      <p class="save-confirmation" id="saveConfirmation" aria-live="polite" hidden>Saved!</p>
      <p class="last-saved" id="lastSaved" hidden></p>
    </section>
  </main>

  <script>
    window.FITME_CONFIG = {
      measurementName: "Shoulder width measurement",
      storageKey: "fitme_shoulder",
      minCm: 30,
      maxCm: 60,
    };
  </script>
  <script src="../scripts/guide.js"></script>
</body>
</html>
```

- [ ] **Step 2: Manually verify in browser**

Open `guide/shoulder.html`. Expected: torso shape with a straight
(non-curved) dashed line across the top near the shoulders, 3 tick marks.
Save 42, confirm `localStorage.fitme_shoulder` = `"42"`, reload pre-fills.

- [ ] **Step 3: Commit**

```bash
git add guide/shoulder.html
git commit -m "feat: add shoulder width measurement page"
```

---

### Task 7: Build guide/sleeve.html (introduces the new arm mannequin shape)

**Files:**
- Create: `guide/sleeve.html`

**Interfaces:**
- Consumes: same config/ID contract as Task 3. Introduces the arm-shape SVG
  markup pattern (shoulder circle + two offset rounded rects suggesting an
  elbow bend) — no new CSS classes, only new coordinates reusing the same
  mannequin classes as every other page.

- [ ] **Step 1: Create guide/sleeve.html**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sleeve length — FitMe</title>
  <link rel="stylesheet" href="../styles/main.css">
</head>
<body>
  <header class="guide-header">
    <div class="container">
      <a class="back-link" href="../index.html">&larr; FitMe</a>
      <h1>Sleeve length</h1>
    </div>
  </header>

  <main class="container">
    <div class="unit-toggle" role="group" aria-label="Measurement unit">
      <button type="button" class="unit-button" data-unit="cm" aria-pressed="true">cm</button>
      <button type="button" class="unit-button" data-unit="in" aria-pressed="false">in</button>
    </div>
    <section class="mannequin-section" aria-label="Where to measure">
      <svg class="mannequin" viewBox="0 0 160 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="mannequinTitle">
        <title id="mannequinTitle">Diagram of an arm showing the tape measure running from the shoulder, over the elbow, to the wrist</title>
        <circle class="mannequin-body" cx="40" cy="25" r="18" />
        <rect class="mannequin-body" x="25" y="40" width="30" height="70" rx="15" />
        <rect class="mannequin-body" x="20" y="105" width="28" height="75" rx="14" />
        <path class="mannequin-tape" d="M40 25 L40 100 L34 180" />
        <g class="mannequin-ticks">
          <line x1="33" y1="55" x2="47" y2="55" />
          <line x1="32" y1="90" x2="46" y2="90" />
          <line x1="27" y1="125" x2="41" y2="125" />
          <line x1="26" y1="155" x2="40" y2="155" />
        </g>
        <circle class="mannequin-zero" cx="40" cy="25" r="5" />
      </svg>
      <p class="mannequin-caption">The tape runs from your shoulder edge, over your elbow, to your wrist bone.</p>
    </section>
    <ol class="step-list">
      <li class="step-card">
        <p class="step-number">Step 1</p>
        <p class="step-text">Stand naturally with your arm relaxed at your side, elbow very slightly bent.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
      <li class="step-card">
        <p class="step-number">Step 2</p>
        <p class="step-text">Start at the edge of your shoulder — where a shoulder seam would sit.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
      <li class="step-card">
        <p class="step-number">Step 3</p>
        <p class="step-text">Run the tape down the outside of your arm, over your elbow, to your wrist bone.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
      <li class="step-card">
        <p class="step-number">Step 4</p>
        <p class="step-text">Keep the tape snug along your arm rather than pulled straight past the elbow bend.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
      <li class="step-card">
        <p class="step-number">Step 5</p>
        <p class="step-text">Read the number at your wrist.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
    </ol>
    <section class="result-section" aria-label="Your result">
      <h2>Your result</h2>
      <div class="result-field">
        <label for="measurementInput" id="measurementInputLabel">Sleeve length measurement (cm)</label>
        <input type="number" id="measurementInput" inputmode="decimal" step="0.1" placeholder="e.g. 62" aria-describedby="measurementError">
      </div>
      <p class="field-error" id="measurementError" role="alert" hidden></p>
      <button type="button" class="save-button" id="saveButton">Save measurement</button>
      <p class="save-confirmation" id="saveConfirmation" aria-live="polite" hidden>Saved!</p>
      <p class="last-saved" id="lastSaved" hidden></p>
    </section>
  </main>

  <script>
    window.FITME_CONFIG = {
      measurementName: "Sleeve length measurement",
      storageKey: "fitme_sleeve",
      minCm: 40,
      maxCm: 90,
    };
  </script>
  <script src="../scripts/guide.js"></script>
</body>
</html>
```

- [ ] **Step 2: Manually verify in browser**

Open `guide/sleeve.html`. Expected: an arm silhouette (shoulder circle,
upper arm, forearm offset to suggest a bend), dashed line following
shoulder→elbow→wrist, 4 tick marks. Save 62, confirm
`localStorage.fitme_sleeve` = `"62"`, reload pre-fills.

- [ ] **Step 3: Commit**

```bash
git add guide/sleeve.html
git commit -m "feat: add sleeve length measurement page with new arm mannequin shape"
```

---

### Task 8: Build guide/neck.html

**Files:**
- Create: `guide/neck.html`

**Interfaces:**
- Consumes: same config/ID contract as Task 3

- [ ] **Step 1: Create guide/neck.html**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Neck — FitMe</title>
  <link rel="stylesheet" href="../styles/main.css">
</head>
<body>
  <header class="guide-header">
    <div class="container">
      <a class="back-link" href="../index.html">&larr; FitMe</a>
      <h1>Neck</h1>
    </div>
  </header>

  <main class="container">
    <div class="unit-toggle" role="group" aria-label="Measurement unit">
      <button type="button" class="unit-button" data-unit="cm" aria-pressed="true">cm</button>
      <button type="button" class="unit-button" data-unit="in" aria-pressed="false">in</button>
    </div>
    <section class="mannequin-section" aria-label="Where to measure">
      <svg class="mannequin" viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="mannequinTitle">
        <title id="mannequinTitle">Diagram of a head and neck showing the tape measure wrapped around the base of the neck</title>
        <circle class="mannequin-body" cx="100" cy="28" r="20" />
        <rect class="mannequin-body" x="90" y="46" width="20" height="14" />
        <path class="mannequin-body" d="M60 60 Q40 60 38 100 L34 230 Q100 245 166 230 L162 100 Q160 60 140 60 Z" />
        <rect class="mannequin-band" x="86" y="47" width="28" height="12" rx="6" />
        <path class="mannequin-tape" d="M86 53 Q100 60 114 53" />
        <g class="mannequin-ticks">
          <line x1="92" y1="49" x2="92" y2="57" />
          <line x1="100" y1="52" x2="100" y2="60" />
          <line x1="108" y1="49" x2="108" y2="57" />
        </g>
        <circle class="mannequin-zero" cx="86" cy="53" r="4" />
      </svg>
      <p class="mannequin-caption">The tape wraps around the base of your neck, where a collar would sit.</p>
    </section>
    <ol class="step-list">
      <li class="step-card">
        <p class="step-number">Step 1</p>
        <p class="step-text">Stand naturally with your chin level — not tilted up or down.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
      <li class="step-card">
        <p class="step-number">Step 2</p>
        <p class="step-text">Wrap the tape around the base of your neck, where a shirt collar would sit.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
      <li class="step-card">
        <p class="step-number">Step 3</p>
        <p class="step-text">Keep the tape level all the way around.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
      <li class="step-card">
        <p class="step-number">Step 4</p>
        <p class="step-text">Pull it snug, but leave enough room to fit a finger between the tape and your neck.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
      <li class="step-card">
        <p class="step-number">Step 5</p>
        <p class="step-text">Read the number where the tape meets the zero end.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
    </ol>
    <section class="result-section" aria-label="Your result">
      <h2>Your result</h2>
      <div class="result-field">
        <label for="measurementInput" id="measurementInputLabel">Neck measurement (cm)</label>
        <input type="number" id="measurementInput" inputmode="decimal" step="0.1" placeholder="e.g. 38" aria-describedby="measurementError">
      </div>
      <p class="field-error" id="measurementError" role="alert" hidden></p>
      <button type="button" class="save-button" id="saveButton">Save measurement</button>
      <p class="save-confirmation" id="saveConfirmation" aria-live="polite" hidden>Saved!</p>
      <p class="last-saved" id="lastSaved" hidden></p>
    </section>
  </main>

  <script>
    window.FITME_CONFIG = {
      measurementName: "Neck measurement",
      storageKey: "fitme_neck",
      minCm: 25,
      maxCm: 55,
    };
  </script>
  <script src="../scripts/guide.js"></script>
</body>
</html>
```

- [ ] **Step 2: Manually verify in browser**

Open `guide/neck.html`. Expected: torso shape with a small highlighted
band right at the neck, 3 tick marks. Save 38, confirm
`localStorage.fitme_neck` = `"38"`, reload pre-fills.

- [ ] **Step 3: Commit**

```bash
git add guide/neck.html
git commit -m "feat: add neck measurement page"
```

---

### Task 9: Build guide/thigh.html

**Files:**
- Create: `guide/thigh.html`

**Interfaces:**
- Consumes: same config/ID contract as Task 3, and the leg-shape SVG
  pattern introduced in Task 5

- [ ] **Step 1: Create guide/thigh.html**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thigh — FitMe</title>
  <link rel="stylesheet" href="../styles/main.css">
</head>
<body>
  <header class="guide-header">
    <div class="container">
      <a class="back-link" href="../index.html">&larr; FitMe</a>
      <h1>Thigh</h1>
    </div>
  </header>

  <main class="container">
    <div class="unit-toggle" role="group" aria-label="Measurement unit">
      <button type="button" class="unit-button" data-unit="cm" aria-pressed="true">cm</button>
      <button type="button" class="unit-button" data-unit="in" aria-pressed="false">in</button>
    </div>
    <section class="mannequin-section" aria-label="Where to measure">
      <svg class="mannequin" viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="mannequinTitle">
        <title id="mannequinTitle">Diagram of legs showing the tape measure wrapped around the fullest part of the upper thigh</title>
        <rect class="mannequin-body" x="50" y="20" width="100" height="70" rx="20" />
        <rect class="mannequin-body" x="55" y="85" width="40" height="155" rx="18" />
        <rect class="mannequin-body" x="105" y="85" width="40" height="155" rx="18" />
        <rect class="mannequin-band" x="55" y="106" width="40" height="20" rx="6" />
        <path class="mannequin-tape" d="M55 116 Q75 124 95 116" />
        <g class="mannequin-ticks">
          <line x1="63" y1="112" x2="63" y2="120" />
          <line x1="75" y1="117" x2="75" y2="125" />
          <line x1="87" y1="112" x2="87" y2="120" />
        </g>
        <circle class="mannequin-zero" cx="55" cy="116" r="5" />
      </svg>
      <p class="mannequin-caption">The tape wraps around the fullest part of your upper thigh, level all the way around.</p>
    </section>
    <ol class="step-list">
      <li class="step-card">
        <p class="step-number">Step 1</p>
        <p class="step-text">Stand with your weight even on both feet.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
      <li class="step-card">
        <p class="step-number">Step 2</p>
        <p class="step-text">Find the fullest part of your thigh — usually near the top, just below your hip.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
      <li class="step-card">
        <p class="step-number">Step 3</p>
        <p class="step-text">Wrap the tape around that point, keeping it level all the way around.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
      <li class="step-card">
        <p class="step-number">Step 4</p>
        <p class="step-text">Pull the tape snug against your skin — not tight enough to squeeze or leave a mark.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
      <li class="step-card">
        <p class="step-number">Step 5</p>
        <p class="step-text">Read the number where the tape meets the zero end.</p>
        <div class="illustration-placeholder">Illustration coming soon</div>
      </li>
    </ol>
    <section class="result-section" aria-label="Your result">
      <h2>Your result</h2>
      <div class="result-field">
        <label for="measurementInput" id="measurementInputLabel">Thigh measurement (cm)</label>
        <input type="number" id="measurementInput" inputmode="decimal" step="0.1" placeholder="e.g. 55" aria-describedby="measurementError">
      </div>
      <p class="field-error" id="measurementError" role="alert" hidden></p>
      <button type="button" class="save-button" id="saveButton">Save measurement</button>
      <p class="save-confirmation" id="saveConfirmation" aria-live="polite" hidden>Saved!</p>
      <p class="last-saved" id="lastSaved" hidden></p>
    </section>
  </main>

  <script>
    window.FITME_CONFIG = {
      measurementName: "Thigh measurement",
      storageKey: "fitme_thigh",
      minCm: 30,
      maxCm: 90,
    };
  </script>
  <script src="../scripts/guide.js"></script>
</body>
</html>
```

- [ ] **Step 2: Manually verify in browser**

Open `guide/thigh.html`. Expected: same two-legged silhouette as inseam,
with a horizontal highlighted band around the upper-left leg instead of a
vertical line. Save 55, confirm `localStorage.fitme_thigh` = `"55"`,
reload pre-fills.

- [ ] **Step 3: Commit**

```bash
git add guide/thigh.html
git commit -m "feat: add thigh measurement page"
```

---

### Task 10: Final cross-page check

**Files:**
- None (verification only)

- [ ] **Step 1: Verify the hub links all resolve**

Open `index.html`. Click each of the 8 measurement rows in turn; confirm
each navigates to its page with no 404s (all 7 new pages plus chest now
exist).

- [ ] **Step 2: Spot-check unit conversion math on 2 of the new pages**

Pick 2 pages with different ranges (e.g. inseam and shoulder). Enter a
valid cm value, toggle to in, confirm the converted number looks correct
for that value (divide by 2.54, round to 1 decimal), toggle back.

- [ ] **Step 3: Confirm independent storage keys**

With DevTools open on any measurement page: `Object.keys(localStorage)`
after saving a value on 2-3 different pages should show separate keys
(`fitme_chest`, `fitme_waist`, etc.) — confirms pages don't overwrite each
other's saved values.

- [ ] **Step 4: Fix anything found, then final commit**

If any check fails, fix the specific file, re-verify, then:

```bash
git add -A
git commit -m "fix: address issues found in final cross-page check"
```

If everything passes, skip the commit.
