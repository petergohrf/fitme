# Phase 2 — 3D Mannequin Preview: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `mannequin.html` page that reads the user's saved measurements from `localStorage` and renders a 3D geometric figure scaled to their proportions using Three.js.

**Architecture:** Four files change: `styles/main.css` gets new rules, `mannequin.html` is created as the new page, `scripts/mannequin.js` is created with all the Three.js logic, and `index.html` gets a preview link. The JS reads all eight measurement keys from localStorage, applies adult-average defaults for any that are missing, converts circumferences to radii, then builds a Three.js group of ~18 cylinder/sphere meshes stacked from feet (Y=0) to head.

**Tech Stack:** Plain HTML, CSS, JavaScript. Three.js 0.167.0 + OrbitControls via CDN import map (no npm, no build step).

## Global Constraints

- Static GitHub Pages — no server, no npm, no build step
- Plain HTML/CSS/JS only — no frameworks
- Three.js 0.167.0 from `https://cdn.jsdelivr.net/npm/three@0.167.0/build/three.module.js`
- OrbitControls from `https://cdn.jsdelivr.net/npm/three@0.167.0/examples/jsm/controls/OrbitControls.js`
- 1 Three.js unit = 1 cm throughout `mannequin.js`
- Must work on mobile (touch drag to rotate)
- $0 budget — CDN only

## File Map

| File | Change | Responsibility |
|---|---|---|
| `styles/main.css` | Modify | Canvas wrap, drag hint, measurements panel, homepage mannequin link |
| `mannequin.html` | Create | Page scaffold: header, canvas, drag hint, measurements panel HTML, import map |
| `scripts/mannequin.js` | Create | localStorage reading, panel population, Three.js scene + geometry + OrbitControls |
| `index.html` | Modify | "Preview your mannequin" link + inline activation script |

---

### Task 1: CSS additions + `mannequin.html` scaffold

**Files:**
- Modify: `styles/main.css` (append at end of file)
- Create: `mannequin.html`

**Interfaces:**
- Produces: DOM structure that `scripts/mannequin.js` targets — `#mannequinCanvas`, `#dragHint`, `#measurementList`

- [ ] **Step 1: Append mannequin CSS to `styles/main.css`**

Add the following block at the very end of `styles/main.css`:

```css
/* ─── Mannequin page ─────────────────────────────────────── */

.mannequin-canvas-wrap {
  width: 100%;
  line-height: 0;
}

#mannequinCanvas {
  display: block;
  width: 100%;
}

.drag-hint {
  text-align: center;
  font-size: 0.85rem;
  color: var(--color-tick-charcoal);
  opacity: 0.7;
  padding: 0.4rem 0 1rem;
  transition: opacity 0.6s ease;
}

.measurements-panel {
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  padding-top: 1rem;
  padding-bottom: 2rem;
}

.measurements-panel h2 {
  font-size: 1rem;
  margin-bottom: 0.75rem;
}

.measurement-panel-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.measurement-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  font-size: 0.9rem;
}

.measurement-row:last-child {
  border-bottom: none;
}

.measurement-label {
  color: var(--color-ink);
}

.measurement-value {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-tick-charcoal);
}

.measurement-value.saved {
  color: var(--color-ink);
  font-variant-numeric: tabular-nums;
}

.default-badge {
  background: rgba(0, 0, 0, 0.07);
  border-radius: 4px;
  padding: 0.1rem 0.4rem;
  font-size: 0.75rem;
  color: var(--color-tick-charcoal);
}

.measure-link {
  color: var(--color-thread-berry);
  text-decoration: none;
  font-size: 0.8rem;
}

.measure-link:hover {
  text-decoration: underline;
}

/* ─── Homepage mannequin preview link ────────────────────── */

.mannequin-preview-wrap {
  margin-top: 1.25rem;
}

.mannequin-link {
  display: block;
  text-align: center;
  padding: 0.85rem 1.5rem;
  background-color: var(--color-thread-berry);
  color: var(--color-tape-ivory);
  text-decoration: none;
  border-radius: 999px;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1rem;
}

.mannequin-link[aria-disabled="true"] {
  background-color: transparent;
  color: var(--color-tick-charcoal);
  border: 2px dashed rgba(74, 70, 64, 0.4);
  opacity: 0.6;
  pointer-events: none;
}

.mannequin-link:not([aria-disabled]):focus-visible {
  outline: 3px solid var(--color-ink);
  outline-offset: 2px;
}

.mannequin-link-note {
  text-align: center;
  font-size: 0.8rem;
  color: var(--color-tick-charcoal);
  margin-top: 0.4rem;
}
```

- [ ] **Step 2: Create `mannequin.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Mannequin — FitMe</title>
  <link rel="stylesheet" href="styles/main.css">
  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.167.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.167.0/examples/jsm/"
    }
  }
  </script>
</head>
<body>
  <header class="guide-header">
    <div class="container">
      <a class="back-link" href="index.html">&larr; FitMe</a>
      <h1>Your Mannequin</h1>
    </div>
  </header>

  <main>
    <div class="mannequin-canvas-wrap">
      <canvas id="mannequinCanvas"></canvas>
    </div>
    <p class="drag-hint" id="dragHint">Drag to rotate</p>

    <section class="measurements-panel container" aria-label="Your measurements">
      <h2>Your measurements</h2>
      <ul class="measurement-panel-list" id="measurementList">
        <!-- populated by mannequin.js -->
      </ul>
    </section>
  </main>

  <script type="module" src="scripts/mannequin.js"></script>
</body>
</html>
```

- [ ] **Step 3: Open `mannequin.html` in a browser and verify**

Expected:
- Header shows "← FitMe" link and "Your Mannequin" heading
- A blank area (canvas, 0px tall since JS hasn't run yet) is present — this is fine for now
- "Drag to rotate" text appears below the blank area
- "Your measurements" heading and an empty list are visible
- No console errors about missing elements

- [ ] **Step 4: Commit**

```bash
git add styles/main.css mannequin.html
git commit -m "feat: add mannequin page scaffold and CSS"
```

---

### Task 2: `scripts/mannequin.js` — measurement reading + panel population

**Files:**
- Create: `scripts/mannequin.js`

**Interfaces:**
- Consumes: `localStorage` keys `fitme_chest`, `fitme_waist`, `fitme_hips`, `fitme_inseam`, `fitme_shoulder`, `fitme_sleeve`, `fitme_neck`, `fitme_thigh` (all stored in cm as strings)
- Consumes: DOM elements `#measurementList` (from Task 1)
- Produces: `getMeasurements()` → `{ [key]: { value: number, isDefault: boolean } }` — consumed by `buildMannequin()` and `populatePanel()` in Task 3
- Produces: `populatePanel(measurements)` — called in Task 3's `initScene()`

- [ ] **Step 1: Create `scripts/mannequin.js`** (no Three.js yet — just measurement reading + panel)

```javascript
// No imports in this task — Three.js added in Task 3

const DEFAULTS = {
  fitme_chest:    95,
  fitme_waist:    80,
  fitme_hips:     97,
  fitme_inseam:   76,
  fitme_shoulder: 44,
  fitme_sleeve:   63,
  fitme_neck:     37,
  fitme_thigh:    58,
};

const MEASUREMENT_META = [
  { key: 'fitme_chest',    label: 'Chest / bust',   href: 'guide/chest.html' },
  { key: 'fitme_waist',    label: 'Waist',           href: 'guide/waist.html' },
  { key: 'fitme_hips',     label: 'Hips',            href: 'guide/hips.html' },
  { key: 'fitme_inseam',   label: 'Inseam',          href: 'guide/inseam.html' },
  { key: 'fitme_shoulder', label: 'Shoulder width',  href: 'guide/shoulder.html' },
  { key: 'fitme_sleeve',   label: 'Sleeve length',   href: 'guide/sleeve.html' },
  { key: 'fitme_neck',     label: 'Neck',            href: 'guide/neck.html' },
  { key: 'fitme_thigh',    label: 'Thigh',           href: 'guide/thigh.html' },
];

function getMeasurements() {
  const result = {};
  for (const [key, defaultVal] of Object.entries(DEFAULTS)) {
    const raw = localStorage.getItem(key);
    const parsed = raw !== null ? parseFloat(raw) : NaN;
    const isDefault = raw === null || Number.isNaN(parsed);
    result[key] = { value: isDefault ? defaultVal : parsed, isDefault };
  }
  return result;
}

function populatePanel(measurements) {
  const list = document.getElementById('measurementList');
  list.innerHTML = '';
  for (const { key, label, href } of MEASUREMENT_META) {
    const { value, isDefault } = measurements[key];
    const li = document.createElement('li');
    li.className = 'measurement-row';
    if (isDefault) {
      li.innerHTML =
        `<span class="measurement-label">${label}</span>` +
        `<span class="measurement-value">` +
        `<span class="default-badge">default</span>` +
        `<a class="measure-link" href="${href}">Measure →</a>` +
        `</span>`;
    } else {
      li.innerHTML =
        `<span class="measurement-label">${label}</span>` +
        `<span class="measurement-value saved">` +
        `${Math.round(value * 10) / 10} cm ` +
        `<a class="measure-link" href="${href}">Edit →</a>` +
        `</span>`;
    }
    list.appendChild(li);
  }
}

// Entry point for this task (replaced in Task 3)
const measurements = getMeasurements();
populatePanel(measurements);
```

- [ ] **Step 2: Open `mannequin.html` in a browser — verify with no localStorage entries**

Expected (no measurements saved):
- All 8 rows appear in the panel
- Every row shows a grey "default" badge and a "Measure →" link
- No console errors

- [ ] **Step 3: Verify with a saved measurement**

In the browser DevTools console, run:
```javascript
localStorage.setItem('fitme_chest', '88');
location.reload();
```

Expected after reload:
- Chest / bust row shows "88 cm" and an "Edit →" link
- All other rows still show "default" badge

Clean up after testing:
```javascript
localStorage.removeItem('fitme_chest');
location.reload();
```

- [ ] **Step 4: Commit**

```bash
git add scripts/mannequin.js
git commit -m "feat: add measurement reading and panel population to mannequin page"
```

---

### Task 3: Three.js scene, geometry, and OrbitControls

**Files:**
- Modify: `scripts/mannequin.js` (replace the Task 2 file entirely)

**Interfaces:**
- Consumes: `getMeasurements()` and `populatePanel()` defined in this same file (same signatures as Task 2)
- Consumes: DOM `#mannequinCanvas`, `#dragHint` (from Task 1)
- Produces: rendered Three.js scene in `#mannequinCanvas`; `OrbitControls` wired to canvas

**Key geometry facts:**
- All body widths are derived from circumferences: `radius = circumference / (2 * Math.PI)`
- Body is centered vertically at Y=0: feet extend below, head above
- Fixed segment heights: head radius = 11 cm, neck = 10 cm, upper torso = 30 cm, lower torso = 20 cm, foot = 6 cm
- Variable lengths: upper leg = inseam × 0.5, lower leg = inseam × 0.5, upper arm = sleeve × 0.55, forearm = sleeve × 0.45

- [ ] **Step 1: Replace `scripts/mannequin.js` with the full Three.js version**

```javascript
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ─── Measurement data ────────────────────────────────────────

const DEFAULTS = {
  fitme_chest:    95,
  fitme_waist:    80,
  fitme_hips:     97,
  fitme_inseam:   76,
  fitme_shoulder: 44,
  fitme_sleeve:   63,
  fitme_neck:     37,
  fitme_thigh:    58,
};

const MEASUREMENT_META = [
  { key: 'fitme_chest',    label: 'Chest / bust',   href: 'guide/chest.html' },
  { key: 'fitme_waist',    label: 'Waist',           href: 'guide/waist.html' },
  { key: 'fitme_hips',     label: 'Hips',            href: 'guide/hips.html' },
  { key: 'fitme_inseam',   label: 'Inseam',          href: 'guide/inseam.html' },
  { key: 'fitme_shoulder', label: 'Shoulder width',  href: 'guide/shoulder.html' },
  { key: 'fitme_sleeve',   label: 'Sleeve length',   href: 'guide/sleeve.html' },
  { key: 'fitme_neck',     label: 'Neck',            href: 'guide/neck.html' },
  { key: 'fitme_thigh',    label: 'Thigh',           href: 'guide/thigh.html' },
];

function getMeasurements() {
  const result = {};
  for (const [key, defaultVal] of Object.entries(DEFAULTS)) {
    const raw = localStorage.getItem(key);
    const parsed = raw !== null ? parseFloat(raw) : NaN;
    const isDefault = raw === null || Number.isNaN(parsed);
    result[key] = { value: isDefault ? defaultVal : parsed, isDefault };
  }
  return result;
}

function populatePanel(measurements) {
  const list = document.getElementById('measurementList');
  list.innerHTML = '';
  for (const { key, label, href } of MEASUREMENT_META) {
    const { value, isDefault } = measurements[key];
    const li = document.createElement('li');
    li.className = 'measurement-row';
    if (isDefault) {
      li.innerHTML =
        `<span class="measurement-label">${label}</span>` +
        `<span class="measurement-value">` +
        `<span class="default-badge">default</span>` +
        `<a class="measure-link" href="${href}">Measure →</a>` +
        `</span>`;
    } else {
      li.innerHTML =
        `<span class="measurement-label">${label}</span>` +
        `<span class="measurement-value saved">` +
        `${Math.round(value * 10) / 10} cm ` +
        `<a class="measure-link" href="${href}">Edit →</a>` +
        `</span>`;
    }
    list.appendChild(li);
  }
}

// ─── Geometry helpers ────────────────────────────────────────

function cr(circumference) {
  return circumference / (2 * Math.PI);
}

function makeCyl(rTop, rBot, height, mat) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, height, 16), mat);
}

function makeSphere(radius, mat) {
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16), mat);
}

// ─── Mannequin builder ───────────────────────────────────────

function buildMannequin(measurements) {
  const chest    = measurements.fitme_chest.value;
  const waist    = measurements.fitme_waist.value;
  const hips     = measurements.fitme_hips.value;
  const inseam   = measurements.fitme_inseam.value;
  const shoulder = measurements.fitme_shoulder.value;
  const sleeve   = measurements.fitme_sleeve.value;
  const neck     = measurements.fitme_neck.value;
  const thigh    = measurements.fitme_thigh.value;

  // Radii from circumferences (1 unit = 1 cm)
  const chestR    = cr(chest);
  const waistR    = cr(waist);
  const hipsR     = cr(hips);
  const neckR     = cr(neck);
  const thighR    = cr(thigh);
  const calfR     = thighR * 0.68;
  const upperArmR = 4.0;   // fixed: ~25 cm circumference
  const forearmR  = 3.2;

  // Fixed segment heights (cm)
  const HEAD_R        = 11;
  const NECK_H        = 10;
  const UPPER_TORSO_H = 30;
  const LOWER_TORSO_H = 20;
  const FOOT_H        = 6;

  // Variable lengths
  const upperLegH = inseam * 0.5;
  const lowerLegH = inseam * 0.5;
  const upperArmH = sleeve * 0.55;
  const forearmH  = sleeve * 0.45;

  // Y positions from feet bottom = 0, building upward
  const yAnkle    = FOOT_H;
  const yKnee     = FOOT_H + lowerLegH;
  const yHip      = FOOT_H + inseam;
  const yWaist    = yHip + LOWER_TORSO_H;
  const yShoulder = yWaist + UPPER_TORSO_H;
  const yNeckTop  = yShoulder + NECK_H;
  const yHeadCtr  = yNeckTop + HEAD_R;
  const totalH    = yHeadCtr + HEAD_R;

  // Center the whole figure vertically at Y=0
  const yOff = -totalH / 2;

  const bodyMat  = new THREE.MeshPhongMaterial({ color: 0xF0EDE4 });
  const jointMat = new THREE.MeshPhongMaterial({ color: 0xC4BEB2 });

  const group = new THREE.Group();

  function add(mesh, x, y, z) {
    mesh.position.set(x, yOff + y, z);
    group.add(mesh);
  }

  // Head
  add(makeSphere(HEAD_R, bodyMat), 0, yHeadCtr, 0);

  // Neck
  add(makeCyl(neckR, neckR, NECK_H, bodyMat), 0, yShoulder + NECK_H / 2, 0);

  // Neck-shoulder joint ring
  const neckRing = makeSphere(neckR * 1.2, jointMat);
  neckRing.scale.y = 0.4;
  add(neckRing, 0, yShoulder, 0);

  // Upper torso: chest radius at top, narrows to waist at bottom
  add(makeCyl(chestR, waistR, UPPER_TORSO_H, bodyMat), 0, yWaist + UPPER_TORSO_H / 2, 0);

  // Lower torso: waist at top, widens to hips at bottom
  add(makeCyl(waistR, hipsR, LOWER_TORSO_H, bodyMat), 0, yHip + LOWER_TORSO_H / 2, 0);

  // Hip joint ring (flattened sphere stretched wide)
  const hipRing = makeSphere(hipsR * 0.55, jointMat);
  hipRing.scale.set(2.5, 0.28, 1.0);
  add(hipRing, 0, yHip, 0);

  // Legs (mirrored left/right)
  for (const side of [-1, 1]) {
    const legX = hipsR * 0.52 * side;

    // Upper leg (thigh)
    add(makeCyl(thighR, calfR * 1.05, upperLegH, bodyMat), legX, yKnee + upperLegH / 2, 0);

    // Knee joint
    const knee = makeSphere(calfR * 1.1, jointMat);
    knee.scale.y = 0.6;
    add(knee, legX, yKnee, 0);

    // Lower leg (calf)
    add(makeCyl(calfR, calfR * 0.82, lowerLegH, bodyMat), legX, yAnkle + lowerLegH / 2, 0);

    // Ankle joint
    const ankle = makeSphere(calfR * 0.82, jointMat);
    ankle.scale.y = 0.5;
    add(ankle, legX, yAnkle, 0);

    // Foot (flattened sphere, offset slightly forward and outward)
    const foot = makeSphere(FOOT_H * 0.85, bodyMat);
    foot.scale.set(1.3, 0.55, 2.0);
    add(foot, legX + side * 1.5, FOOT_H * 0.5, FOOT_H * 0.6);
  }

  // Arms (mirrored left/right)
  const armX = shoulder / 2;
  for (const side of [-1, 1]) {
    const sX = armX * side;

    // Shoulder joint
    add(makeSphere(upperArmR * 1.35, jointMat), sX, yShoulder, 0);

    // Upper arm (hangs down from shoulder joint)
    add(makeCyl(upperArmR, upperArmR * 0.88, upperArmH, bodyMat), sX, yShoulder - upperArmH / 2, 0);

    // Elbow joint
    add(makeSphere(upperArmR * 0.9, jointMat), sX, yShoulder - upperArmH, 0);

    // Forearm
    add(makeCyl(forearmR, forearmR * 0.82, forearmH, bodyMat), sX, yShoulder - upperArmH - forearmH / 2, 0);

    // Wrist joint
    add(makeSphere(forearmR * 0.82, jointMat), sX, yShoulder - upperArmH - forearmH, 0);

    // Hand
    const hand = makeSphere(forearmR * 1.05, bodyMat);
    hand.scale.set(1.1, 0.75, 0.65);
    add(hand, sX, yShoulder - upperArmH - forearmH - forearmR * 1.05, 0);
  }

  return group;
}

// ─── Scene setup ────────────────────────────────────────────

function initScene() {
  const canvas = document.getElementById('mannequinCanvas');
  const hint   = document.getElementById('dragHint');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0xEDEAE2);  // --color-muslin

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);
  camera.position.set(0, 10, 220);

  // Lighting: ambient fill + directional from above-left (mirrors Phase 1 SVG gradients)
  scene.add(new THREE.AmbientLight(0xfff8f0, 0.7));
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(-60, 120, 80);
  scene.add(dir);

  // Build and add mannequin
  const measurements = getMeasurements();
  const mannequin = buildMannequin(measurements);
  scene.add(mannequin);

  // OrbitControls — rotation only, no zoom or pan
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false;
  controls.enablePan  = false;
  controls.target.set(0, 0, 0);
  controls.update();

  // Fade out "Drag to rotate" hint on first interaction
  controls.addEventListener('start', () => {
    hint.style.opacity = '0';
  });

  // Resize canvas to fill its wrapper at 65% of viewport height
  function resize() {
    const w = canvas.parentElement.clientWidth;
    const h = Math.round(window.innerHeight * 0.65);
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // Render loop
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  // Populate measurements panel
  populatePanel(measurements);
}

initScene();
```

- [ ] **Step 2: Open `mannequin.html` in a browser — verify the 3D figure appears**

Expected:
- The canvas fills the top portion of the page (~65% viewport height)
- A jointed geometric figure is visible, centered in the canvas
- Figure has warm sand-coloured body and slightly darker joint rings
- Background matches the rest of the page (same muslin tone)
- "Drag to rotate" hint text appears below the canvas

- [ ] **Step 3: Verify rotation on desktop**

Click and drag on the canvas. Expected:
- Figure rotates smoothly in any direction
- After dragging, "Drag to rotate" text fades out
- Scrolling the mouse wheel does nothing (zoom is disabled)

- [ ] **Step 4: Verify measurements drive the figure shape**

In DevTools console:
```javascript
// Set a narrow waist to see the taper change
localStorage.setItem('fitme_waist', '60');
localStorage.setItem('fitme_chest', '100');
location.reload();
```
Expected: torso has a visible hourglass taper (wide at chest, narrow at waist).

Then set a tall inseam:
```javascript
localStorage.setItem('fitme_inseam', '95');
location.reload();
```
Expected: legs are noticeably longer.

Clean up:
```javascript
['fitme_waist','fitme_chest','fitme_inseam'].forEach(k => localStorage.removeItem(k));
location.reload();
```

- [ ] **Step 5: Verify panel still shows correct data**

With no localStorage entries: all 8 rows show "default" badge.
With some entries set: those rows show the saved value; others show "default".

- [ ] **Step 6: Commit**

```bash
git add scripts/mannequin.js
git commit -m "feat: add Three.js 3D mannequin with measurement-driven geometry"
```

---

### Task 4: Homepage mannequin link

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `localStorage` keys (same 8 keys as mannequin.js) — checked inline, no external script needed
- Produces: active link to `mannequin.html` when at least one measurement is saved; disabled state when none

- [ ] **Step 1: Add the mannequin preview link to `index.html`**

Inside `index.html`, find the measurements section. It looks like:

```html
    <section class="measurements container" aria-label="Choose a measurement">
      <h2>Choose a measurement to start</h2>
      <ul class="measurement-list">
        ...
      </ul>
    </section>
```

Add the mannequin link div immediately **after** the closing `</ul>` tag, still inside the `<section>`:

```html
      <div class="mannequin-preview-wrap">
        <a class="mannequin-link" href="mannequin.html" id="mannequinLink" aria-disabled="true">
          Preview your mannequin &rarr;
        </a>
        <p class="mannequin-link-note" id="mannequinLinkNote">Save at least one measurement to unlock</p>
      </div>
```

- [ ] **Step 2: Add the activation script to `index.html`**

Add this block immediately **before** the closing `</body>` tag:

```html
  <script>
    (function () {
      var keys = [
        'fitme_chest', 'fitme_waist', 'fitme_hips', 'fitme_inseam',
        'fitme_shoulder', 'fitme_sleeve', 'fitme_neck', 'fitme_thigh'
      ];
      var hasMeasurement = keys.some(function (k) {
        return localStorage.getItem(k) !== null;
      });
      if (hasMeasurement) {
        document.getElementById('mannequinLink').removeAttribute('aria-disabled');
        document.getElementById('mannequinLinkNote').hidden = true;
      }
    })();
  </script>
```

- [ ] **Step 3: Verify disabled state**

Open `index.html` in a browser with no localStorage entries (or clear them all first in DevTools → Application → Clear storage).

Expected:
- "Preview your mannequin →" button appears below the 8 measurement links
- Button is visually muted (dashed border, grey text)
- Text "Save at least one measurement to unlock" appears beneath it
- Clicking the button does nothing (pointer-events: none)

- [ ] **Step 4: Verify active state**

In DevTools console:
```javascript
localStorage.setItem('fitme_chest', '92');
location.reload();
```

Expected:
- Button is now fully styled (berry red background, ivory text)
- "Save at least one measurement to unlock" note is hidden
- Clicking navigates to `mannequin.html`
- On `mannequin.html`, the panel shows "92 cm" for Chest / bust

- [ ] **Step 5: Navigate the full flow end to end**

1. Open `index.html` (no measurements) — button disabled
2. Click "Chest / Bust →" — goes to `guide/chest.html`
3. Enter a chest measurement, click "Save measurement" — value saved to localStorage
4. Click "← FitMe" — back to homepage
5. Button is now active (page re-ran the inline script on load)
6. Click "Preview your mannequin →" — goes to `mannequin.html`
7. Panel shows the saved chest value; other 7 rows show "default"
8. Drag to rotate the 3D figure

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: add mannequin preview link to homepage with activation logic"
```
