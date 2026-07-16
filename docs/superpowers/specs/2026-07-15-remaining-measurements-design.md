# FitMe — Remaining 7 Measurement Pages: Design Addendum

Date: 2026-07-15
Status: Approved by user (inline, abbreviated brainstorming — reuses the
already-approved chest/bust design system in full; only new decisions are
recorded here)

## Goal

Apply the chest/bust pattern (approved in
`2026-07-15-chest-measurement-page-design.md`) to the remaining 7
measurements from CLAUDE.md, in order: waist, hips, inseam, shoulder width,
sleeve length, neck, thigh. Speed up delivery by using subagent-driven
development with automated (subagent) review only — no manual
checkpoint-and-screenshot pauses per page, since the visual/interaction
pattern is already proven and approved on chest/bust.

## New decisions (beyond the existing design system)

**1. `scripts/guide.js` becomes genuinely shared**, per CLAUDE.md's folder
structure comment ("scripts/guide.js: shared interactive logic"). Currently
it hardcodes chest-specific IDs and constants. Refactor to read a small
per-page config object instead:

```html
<script>
  window.FITME_CONFIG = {
    measurementName: "Chest/bust measurement",
    storageKey: "fitme_chest",
    minCm: 30,
    maxCm: 200,
  };
</script>
<script src="../scripts/guide.js"></script>
```

Element IDs generalize: `#chestInput` → `#measurementInput`,
`#chestInputLabel` → `#measurementInputLabel`, `#chestError` →
`#measurementError`. `#saveButton`, `#saveConfirmation`, `#lastSaved` were
already generic. No other behavior changes — same validation, same
try/catch guards, same ARIA attributes already shipped for chest.

**2. Navigation: hub page, not linear next-links.** `index.html` becomes a
list of all 8 measurements (not just a single chest CTA), so users can
jump to any one directly. Individual pages keep their existing "← FitMe"
back link (already built) as the way back to the hub — no new "next
measurement" links between pages.

**3. Two new mannequin base shapes**, styled with the exact same CSS
classes already defined (`.mannequin-body`, `.mannequin-band`,
`.mannequin-tape`, `.mannequin-ticks`, `.mannequin-zero` — no new CSS
tokens or rules needed, only new inline SVG markup per page):

- **Torso** (existing, reused for waist/hips/neck/shoulder width — only the
  highlighted band's y-position and shape change per measurement)
- **Leg** (new — two rounded-rectangle legs below a rounded-rectangle hip
  block; used for inseam — a vertical dashed line — and thigh — a
  horizontal dashed band)
- **Arm** (new — a shoulder circle, upper-arm rounded rect, forearm rounded
  rect offset to suggest a bend at the elbow; used for sleeve length only —
  a dashed line from shoulder to wrist)

**4. Content for each measurement** (steps, valid cm range):

| Measurement | Range (cm) | Storage key |
|---|---|---|
| Waist | 50–160 | `fitme_waist` |
| Hips | 60–170 | `fitme_hips` |
| Inseam | 50–100 | `fitme_inseam` |
| Shoulder width | 30–60 | `fitme_shoulder` |
| Sleeve length | 40–90 | `fitme_sleeve` |
| Neck | 25–55 | `fitme_neck` |
| Thigh | 30–90 | `fitme_thigh` |

Full step text for each is written directly into the implementation plan
(`docs/superpowers/plans/2026-07-15-remaining-measurements.md`) rather than
duplicated here.

## Explicitly unchanged

Color palette, font stacks, `.container`/card/button/result-section CSS,
overall page structure (header → unit toggle → mannequin → 5 steps →
result section), validation UX, localStorage-only persistence (no
accounts/Firestore), $0 budget, no frameworks/build step.
