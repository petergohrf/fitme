# Phase 2 — 3D Mannequin Preview: Design Spec

**Date:** 2026-07-22
**Scope:** Mannequin-only (no garments). Garment sourcing and draping are deferred to a later phase.

---

## 1. Goal

Add a page to FitMe that reads the user's saved measurements from `localStorage` and renders a 3D mannequin scaled to those proportions, so the user can see a body shape that reflects their own. Garments are not part of this phase.

---

## 2. Constraints

- Static GitHub Pages — no server, no build step, no npm
- Plain HTML, CSS, JavaScript only (no frameworks)
- Three.js loaded from CDN via ES module import map — no install required
- $0 budget — CDN only, no paid services
- Must work on mobile (touch drag to rotate)

---

## 3. New Files

| File | Purpose |
|---|---|
| `mannequin.html` | The 3D preview page |
| `scripts/mannequin.js` | All Three.js logic: scene, camera, lights, geometry, controls |

**Modified files:**
- `index.html` — add "Preview your mannequin →" link
- `styles/main.css` — add mannequin-page styles (canvas sizing, measurements panel)

---

## 4. Loading Three.js

An import map in `mannequin.html`'s `<head>` points the browser at the CDN URLs for Three.js and its OrbitControls addon. `mannequin.js` then uses standard ES `import` statements. No command-line tools, no bundler.

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.167.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.167.0/examples/jsm/"
  }
}
</script>
<script type="module" src="../scripts/mannequin.js"></script>
```

---

## 5. Measurement Mapping

All Phase 1 measurement pages already write values to `localStorage` in centimetres. `mannequin.js` reads these keys on load. Missing keys use adult-average defaults so the mannequin is always visible regardless of how many measurements the user has taken.

Body widths/depths are derived from circumferences using the circle formula: `radius = circumference / (2π)`. In Three.js, **1 unit = 1 cm**.

| Measurement | Key | Drives | Default (cm) |
|---|---|---|---|
| Chest / bust | `fitme_chest` | Upper torso radius | 95 |
| Waist | `fitme_waist` | Mid-torso radius | 80 |
| Hips | `fitme_hips` | Lower torso + hip radius | 97 |
| Inseam | `fitme_inseam` | Total leg length | 76 |
| Shoulder width | `fitme_shoulder` | Distance between arm attachment points | 44 |
| Sleeve length | `fitme_sleeve` | Total arm length (upper + forearm) | 63 |
| Neck | `fitme_neck` | Neck radius | 37 |
| Thigh | `fitme_thigh` | Upper leg radius | 58 |

Body segment **heights** (head, torso, neck) are fixed proportions — only widths and limb lengths vary with measurements.

---

## 6. Body Geometry

The mannequin is built from standard Three.js primitives stacked vertically. Feet sit at Y = 0; head is at the top. Each piece is a separate `Mesh`.

| Part | Geometry | Key dimensions |
|---|---|---|
| Head | `SphereGeometry` | Fixed radius ~11 cm |
| Neck | `CylinderGeometry` | Radius from neck measurement; height fixed ~10 cm |
| Upper torso | `CylinderGeometry` | Top radius = chest radius, bottom radius = waist radius; height fixed ~30 cm |
| Lower torso | `CylinderGeometry` | Top radius = waist radius, bottom radius = hips radius; height fixed ~20 cm |
| Shoulder joints | `SphereGeometry` × 2 | Fixed small radius; X position = shoulder width / 2 |
| Upper arms | `CylinderGeometry` × 2 | Length = sleeve × 0.55; default radius ~4 cm |
| Forearms | `CylinderGeometry` × 2 | Length = sleeve × 0.45; slightly narrower |
| Hands | `SphereGeometry` × 2 | Fixed small radius |
| Upper legs (thighs) | `CylinderGeometry` × 2 | Radius from thigh measurement; length = inseam × 0.5 |
| Lower legs (calves) | `CylinderGeometry` × 2 | Fixed narrower radius; length = inseam × 0.5 |
| Feet | Flattened `SphereGeometry` × 2 | Fixed size |

**Total pieces: ~18 meshes.** All parented to a single `Group` so they rotate together.

---

## 7. Visual Style

Consistent with the Phase 1 SVG mannequins.

- **Body material:** `MeshPhongMaterial`, colour `#F0EDE4` (warm sand) — responds to light, shows subtle shading
- **Joint material:** `MeshPhongMaterial`, colour `#C4BEB2` (slightly darker warm grey)
- **Background:** `#EDEAE2` (site's `--color-muslin`) — matches the page background so the canvas blends in
- **No textures**

**Lighting:**
- `AmbientLight` — soft fill, same implied warmth as Phase 1
- `DirectionalLight` — from slightly above-left, matching the implied light direction in the Phase 1 SVG gradients

---

## 8. Interaction

`OrbitControls` from Three.js addons:
- **Desktop:** click-and-drag to rotate
- **Mobile:** one-finger swipe to rotate
- Zoom and pan are disabled — rotation only, to keep the experience focused
- A small "Drag to rotate" hint appears below the canvas; it fades out on first interaction

---

## 9. Page Layout (`mannequin.html`)

Top to bottom, mobile-first:

1. **Header** — same as guide pages: "← FitMe" back link + FitMe wordmark
2. **Canvas** — full-width, ~65% of viewport height; the Three.js render target
3. **"Drag to rotate" hint** — small grey text, fades on first drag
4. **Measurements panel** — compact list of all 8 measurements:
   - Saved value → shows the number in cm (Phase 1 always stores in cm; the mannequin page always displays in cm with a "(cm)" label — no unit toggle needed here)
   - Not yet measured → shows a "default" badge + a link back to that measurement's guide page

---

## 10. `index.html` Change

A new entry is added below the 8 measurement links:

```
Preview your mannequin →
```

- **If zero measurements saved:** link is visually disabled (grey, `aria-disabled="true"`) with a tooltip/note: "Save at least one measurement to unlock"
- **If at least one measurement saved:** link is active and navigates to `mannequin.html`

The check runs with a small inline `<script>` on the homepage that reads `localStorage` and toggles the link state on load.

---

## 11. Out of Scope (this phase)

- Garment sourcing (Sketchfab download script)
- Garment rendering / draping on the mannequin
- Saving the preferred display unit to localStorage
- Accounts or cloud sync (Phase 3+)
- The 3D mannequin appearing on individual measurement pages
