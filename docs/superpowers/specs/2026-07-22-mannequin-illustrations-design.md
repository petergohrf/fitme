# FitMe — Articulated Mannequin + Step Illustrations Design Spec

Date: 2026-07-22
Status: Approved by user

## Goal

Replace the abstract geometric SVG mannequins on all 8 measurement guide pages with
a realistic articulated mannequin (egg-shaped head, visible joint rings, gradient
shading suggesting 3D form). Also replace all 40 "Illustration coming soon"
placeholders with inline SVG step illustrations — zoomed body closeups specific
to each step's action.

## Files affected

- `guide/chest.html`
- `guide/waist.html`
- `guide/hips.html`
- `guide/inseam.html`
- `guide/shoulder.html`
- `guide/sleeve.html`
- `guide/neck.html`
- `guide/thigh.html`
- `styles/main.css` — add one new rule: `.step-illustration`

## Color palette (unchanged from existing brand)

| Token | Hex | Use |
|---|---|---|
| Muslin | `#EDEAE2` | page background |
| Ink | `#2B2A28` | text |
| Thread Berry | `#A8324A` | measurement bands, highlights |
| Tape Ivory | `#F2E9D8` | tape widget fill |
| Tick Charcoal | `#4A4640` | body stroke, joint rings |
| Success Moss | `#5C7A5E` | (not used in SVGs) |

## Canonical mannequin SVG — body coordinates

All mannequin SVGs share this coordinate system. The full body fits in
`viewBox="0 0 200 430"`. Individual pages use a cropped viewBox to focus on the
relevant area. All coordinates below are in this coordinate space.

### Head
```
ellipse cx=100 cy=42 rx=29 ry=34
```

### Neck
```
Head-neck joint ring: ellipse cx=100 cy=74 rx=13 ry=5
Neck body:           rect x=90 y=72 width=20 height=20 rx=8
Neck-shoulder ring:  ellipse cx=100 cy=93 rx=13 ry=5
```

### Torso (path, shoulder-to-hip)
```svg
<path d="
  M 100 90
  Q 78 90 63 96
  Q 48 103 46 116
  Q 44 130 48 145
  Q 44 160 46 178
  Q 48 196 58 207
  Q 68 216 82 219
  Q 90 221 100 221
  Q 110 221 118 219
  Q 132 216 142 207
  Q 152 196 154 178
  Q 156 160 152 145
  Q 156 130 154 116
  Q 152 103 137 96
  Q 122 90 100 90 Z
"/>
```

Key torso y-levels:
- Shoulder-top edge: y ≈ 96
- Chest (fullest): y ≈ 120
- Waist (narrowest): y ≈ 165  (torso width ≈ 96px here)
- Hip (fullest): y ≈ 205      (torso width ≈ 104px here)
- Hip bottom: y ≈ 221

### Shoulder joints
```
Left:  ellipse cx=52  cy=102 rx=15 ry=11
Right: ellipse cx=148 cy=102 rx=15 ry=11
```

### Left arm
```
Upper arm:  rect x=38  y=106 width=26 height=72 rx=13
Elbow ring: ellipse cx=51  cy=180 rx=14 ry=8
Forearm:    rect x=41  y=182 width=22 height=62 rx=11
Wrist ring: ellipse cx=52  cy=246 rx=11 ry=5
Hand/fist:  ellipse cx=52  cy=256 rx=12 ry=10
```

### Right arm (mirror of left)
```
Upper arm:  rect x=136 y=106 width=26 height=72 rx=13
Elbow ring: ellipse cx=149 cy=180 rx=14 ry=8
Forearm:    rect x=137 y=182 width=22 height=62 rx=11
Wrist ring: ellipse cx=148 cy=246 rx=11 ry=5
Hand/fist:  ellipse cx=148 cy=256 rx=12 ry=10
```

### Pelvis joint
```
ellipse cx=100 cy=219 rx=47 ry=10
```

### Left leg
```
Thigh:      rect x=56  y=222 width=38 height=94 rx=18
Knee ring:  ellipse cx=75  cy=318 rx=20 ry=10
Shin:       rect x=61  y=321 width=28 height=78 rx=14
Ankle ring: ellipse cx=75  cy=401 rx=14 ry=6
Foot:       ellipse cx=75  cy=412 rx=16 ry=9
```

### Right leg (mirror of left)
```
Thigh:      rect x=106 y=222 width=38 height=94 rx=18
Knee ring:  ellipse cx=125 cy=318 rx=20 ry=10
Shin:       rect x=111 y=321 width=28 height=78 rx=14
Ankle ring: ellipse cx=125 cy=401 rx=14 ry=6
Foot:       ellipse cx=125 cy=412 rx=16 ry=9
```

## SVG gradient definitions

Every SVG (both main mannequin and step illustrations) must include these gradient
defs. Use unique IDs if multiple SVGs appear on the same page (e.g., `headG-s1`,
`armG-s2`) to avoid collisions, since all inline SVGs share the same DOM.

```svg
<defs>
  <radialGradient id="headG" cx="38%" cy="32%" r="62%">
    <stop offset="0%" stop-color="#F4F0E8"/>
    <stop offset="100%" stop-color="#C8C3B6"/>
  </radialGradient>
  <radialGradient id="torsoG" cx="40%" cy="30%" r="70%">
    <stop offset="0%" stop-color="#F0EDE4"/>
    <stop offset="100%" stop-color="#C4BEB2"/>
  </radialGradient>
  <linearGradient id="armG" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%"   stop-color="#BEB9AE"/>
    <stop offset="28%"  stop-color="#EDE9E0"/>
    <stop offset="72%"  stop-color="#EDE9E0"/>
    <stop offset="100%" stop-color="#B8B4A8"/>
  </linearGradient>
  <linearGradient id="legG" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%"   stop-color="#BEB9AE"/>
    <stop offset="28%"  stop-color="#EDE9E0"/>
    <stop offset="72%"  stop-color="#EDE9E0"/>
    <stop offset="100%" stop-color="#B8B4A8"/>
  </linearGradient>
  <linearGradient id="neckG" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%"   stop-color="#C4BEB2"/>
    <stop offset="40%"  stop-color="#EDE9E0"/>
    <stop offset="60%"  stop-color="#EDE9E0"/>
    <stop offset="100%" stop-color="#C0BBB0"/>
  </linearGradient>
</defs>
```

## Stroke and joint ring style

- All body parts: `stroke="#C0BBB0" stroke-width="1.2"` (or 1.0 for smaller elements)
- Joint rings: `fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"`
- Head-neck and neck-shoulder rings: `fill="#C4BEB2" opacity="0.85"` (no stroke)

## Gradient fill mapping

| Body part | Fill gradient |
|---|---|
| Head | `url(#headG)` |
| Neck rect | `url(#neckG)` |
| Torso | `url(#torsoG)` |
| Upper arm, forearm, hand | `url(#armG)` |
| Thigh, shin, foot | `url(#legG)` |

## Measurement highlights (Thread Berry #A8324A)

For circumference measurements (chest, waist, hips, neck, thigh):
```svg
<!-- Shaded zone -->
<ellipse cx="..." cy="[band_cy]" rx="[rx]" ry="[ry+4]" fill="#A8324A" opacity="0.08"/>
<!-- Dashed tape band -->
<ellipse cx="..." cy="[band_cy]" rx="[rx]" ry="[ry]"   fill="none" stroke="#A8324A" stroke-width="3" stroke-dasharray="7 4"/>
<!-- Zero-point dot (left edge) -->
<circle cx="[left_x]" cy="[band_cy]" r="7" fill="#A8324A"/>
<circle cx="[left_x]" cy="[band_cy]" r="3.5" fill="white"/>
<!-- Tape measure widget (centre of band) -->
<rect x="86" y="[band_cy-7]" width="28" height="14" rx="4" fill="#F2E9D8" stroke="#A8324A" stroke-width="1.5"/>
```

For linear measurements (shoulder width, sleeve length, inseam):
```svg
<!-- Measurement line -->
<line x1="..." y1="..." x2="..." y2="..." stroke="#A8324A" stroke-width="3" stroke-dasharray="7 4"/>
<!-- Start dot -->
<circle cx="..." cy="..." r="7" fill="#A8324A"/>
<circle cx="..." cy="..." r="3.5" fill="white"/>
<!-- End arrow or dot -->
<circle cx="..." cy="..." r="5" fill="#A8324A"/>
```

## Per-page main mannequin specifications

Each page replaces its existing `<svg class="mannequin" ...>` with a new SVG using
the canonical body above plus the measurement highlight for that page.

The `class="mannequin"` attribute must be kept so the existing CSS
(`width: 100%; max-width: 220px; height: auto`) applies.

| Page | viewBox | Measurement type | Band/line position |
|---|---|---|---|
| chest.html | `"0 0 200 430"` | circumference | cy=126, rx=55, ry=11; left_x=45 |
| waist.html | `"0 0 200 430"` | circumference | cy=170, rx=46, ry=9; left_x=54 |
| hips.html | `"0 0 200 430"` | circumference | cy=208, rx=52, ry=10; left_x=48 |
| neck.html | `"20 10 160 110"` | circumference | cy=83, rx=13, ry=5; left_x=87 (no tape widget — too small) |
| shoulder.html | `"0 60 200 170"` | linear | line y1=y2=102, x1=38 x2=162 |
| sleeve.html | `"10 60 120 220"` | linear (path) | path from shoulder (52,102) along left arm to wrist (52,246) |
| inseam.html | `"20 195 160 240"` | linear | line from crotch (75,222) to foot (75,412) |
| thigh.html | `"20 195 160 200"` | circumference | cy=258, rx=20, ry=8 on left thigh; left_x=55 |

For chest/waist/hips/shoulder/inseam/thigh: draw BOTH legs in the viewBox.
For neck: draw head + neck + top of shoulders only.
For sleeve: draw left shoulder joint + left upper arm + left forearm + left hand, plus the top edge of the torso.

**Accessibility:** Every main mannequin SVG must keep `role="img"` and
`aria-labelledby="mannequinTitle"` with a `<title id="mannequinTitle">` describing
what it shows. Keep the `.mannequin-caption` paragraph underneath — do not remove it.

## Step illustration CSS (one new rule in styles/main.css)

Add this rule after `.illustration-placeholder`:

```css
.step-illustration {
  display: block;
  width: 100%;
  max-width: 200px;
  height: auto;
  margin: 0.5rem auto 0;
  border-radius: 8px;
  background-color: var(--color-muslin);
}
```

## Step illustration pattern

Replace each:
```html
<div class="illustration-placeholder">Illustration coming soon</div>
```
with:
```html
<svg class="step-illustration" viewBox="..." xmlns="http://www.w3.org/2000/svg" role="img" aria-label="...">
  <defs><!-- gradient defs with page+step unique IDs e.g. headG-c1 for chest step 1 --></defs>
  <!-- body parts relevant to this crop -->
  <!-- measurement highlight or action indicator for this step -->
</svg>
```

Use a tight viewBox crop that shows only the relevant body area — do not show the
full body in every step illustration. The crop must be appropriate to the step content.

Gradient IDs must be unique per SVG on the page. Use a suffix like `-c1` through
`-c5` for chest steps 1–5, `-w1` through `-w5` for waist, etc.

## Step illustration content per page

### Crop region reference

| Crop name | viewBox | Shows |
|---|---|---|
| FULL | `"20 0 160 430"` | full body |
| UPPER-BODY | `"10 0 180 260"` | head through hips |
| CHEST-ZONE | `"20 95 160 80"` | shoulder/chest area |
| WAIST-ZONE | `"20 140 160 80"` | waist area |
| HIP-ZONE | `"20 185 160 90"` | hip area |
| HEAD-NECK | `"45 5 110 105"` | head and neck |
| SHOULDER-LINE | `"10 70 180 80"` | shoulders crop |
| LEFT-ARM | `"15 85 110 190"` | left shoulder through hand |
| LEGS | `"20 200 160 235"` | hips through feet |
| THIGH-ZONE | `"30 210 140 140"` | hips through knees |

For each step below: draw the body parts visible in the specified crop, then add
the indicator described.

---

### chest.html — steps 1–5

**Step 1** — "Stand naturally — arms relaxed at your sides."
- Crop: UPPER-BODY
- Show: head, neck, torso, both upper arms (no forearms/hands needed)
- Indicator: none — just the relaxed standing figure

**Step 2** — "Wrap the tape measure around the fullest part of your chest/bust."
- Crop: CHEST-ZONE
- Show: top of torso, shoulder joints, top of upper arms
- Indicator: dashed ellipse band at cy=126, rx=55, ry=11; zero-dot at left edge

**Step 3** — "Keep the tape parallel to the floor all the way around."
- Crop: CHEST-ZONE
- Show: same torso crop
- Indicator: same dashed ellipse; add horizontal guide line in #A8324A opacity=0.4
  across the chest with small arrows at each end (←  →) to show "level"

**Step 4** — "Pull the tape snug against your body — not tight enough to squeeze."
- Crop: CHEST-ZONE
- Show: same torso crop
- Indicator: dashed ellipse closer to body surface (rx=52 ry=9); add a small
  check-mark or ✓ symbol in #5C7A5E (Success Moss) near the tape to suggest "right tension"

**Step 5** — "Breathe normally and read the number where the tape meets the zero end."
- Crop: viewBox "10 100 100 60" (tighter left-side chest crop)
- Show: left side of torso + left shoulder + left upper arm
- Indicator: zero-dot (large circle r=7) at cx=45 cy=126; tape end overlapping it;
  small "0" text label next to the dot

---

### waist.html — steps 1–5

**Step 1** — "Stand naturally, relaxed."
- Crop: UPPER-BODY
- Indicator: none

**Step 2** — "Find your natural waist — bend gently to one side; the crease that forms is your waist."
- Crop: WAIST-ZONE
- Show: torso midsection
- Indicator: horizontal dashed line at cy=165 (narrowest point) in #A8324A opacity=0.5;
  small arrowheads pointing inward from left and right to show "narrow here"

**Step 3** — "Wrap the tape around that point, keeping it parallel to the floor."
- Crop: WAIST-ZONE
- Indicator: dashed ellipse at cy=170, rx=46, ry=9; zero-dot at left

**Step 4** — "Pull the tape snug — not tight enough to squeeze or leave a mark."
- Crop: WAIST-ZONE
- Indicator: dashed ellipse same as step 3; small ✓ in Success Moss

**Step 5** — "Breathe out normally and read the number where the tape meets the zero end."
- Crop: viewBox "10 150 100 50" (left waist area)
- Indicator: zero-dot prominent; "read here" implied by dot position

---

### hips.html — steps 1–5

**Step 1** — "Stand with your feet together and weight even on both feet."
- Crop: LEGS (hips through feet)
- Show: pelvis joint, both thighs, knees, shins, feet — feet touching/together
  (draw right foot ellipse closer to left: shift right foot x slightly left, x=105)
- Indicator: none

**Step 2** — "Find the fullest part of your hips — usually about 20cm (8in) below your waist."
- Crop: HIP-ZONE
- Show: lower torso/hip area
- Indicator: small horizontal arrow line at cy=205 with arrowheads; small dot at the
  widest point on each side (cx=48 cx=152 cy=205)

**Step 3** — "Wrap the tape around that point, keeping it parallel to the floor."
- Crop: HIP-ZONE
- Indicator: dashed ellipse at cy=208, rx=52, ry=10; zero-dot at left

**Step 4** — "Pull the tape snug — not tight enough to squeeze or leave a mark."
- Crop: HIP-ZONE
- Indicator: same ellipse; ✓ in Success Moss

**Step 5** — "Read the number where the tape meets the zero end."
- Crop: viewBox "10 190 100 50" (left hip area)
- Indicator: zero-dot; tape end implied

---

### inseam.html — steps 1–5

**Step 1** — "Wear the shoes you'd normally wear, or measure barefoot."
- Crop: LEGS
- Show: both legs; draw feet with slight forward tilt to suggest shoes; or plain feet
- Indicator: none (just the standing leg figure)

**Step 2** — "Stand up straight with your feet slightly apart."
- Crop: LEGS
- Show: legs with feet slightly apart (standard leg position: left thigh at x=56, right at x=106)
- Indicator: none

**Step 3** — "Measure from your crotch straight down the inside of your leg to the floor."
- Crop: LEGS
- Indicator: vertical dashed line in #A8324A from crotch (75, 222) to foot level (75, 412);
  zero-dot at top (cx=75 cy=222 r=7); end-dot at bottom

**Step 4** — "Keep the tape straight and taut — don't let it follow the curve of your leg."
- Crop: LEGS
- Indicator: same vertical line; add a curved "wrong" line in gray opacity=0.3 that
  follows the inner leg curve, with an ✗ marker to show "not this"; straight line
  with ✓ in Success Moss

**Step 5** — "Read the number at the bottom, at the floor."
- Crop: viewBox "40 370 120 65" (ankle/foot area)
- Show: shins + ankles + feet
- Indicator: tape-end dot at floor level

---

### shoulder.html — steps 1–5

**Step 1** — "Stand naturally with your arms relaxed at your sides."
- Crop: UPPER-BODY
- Indicator: none

**Step 2** — "This one's tricky to do alone — ask someone to help if you can."
- Crop: SHOULDER-LINE
- Show: neck, shoulder joints, top of upper arms
- Indicator: two small dots at shoulder-edge points (cx=38 cy=102 and cx=162 cy=102)
  to show "these are the points to find"

**Step 3** — "Measure straight across your back, from the edge of one shoulder to the edge of the other."
- Crop: SHOULDER-LINE
- Indicator: horizontal line from (38, 102) to (162, 102) in #A8324A; zero-dot left; end-dot right;
  small dashes showing tape ticks

**Step 4** — "Keep the tape flat and straight — don't let it follow the curve of your neck or back."
- Crop: SHOULDER-LINE
- Indicator: same straight line; add a curved "wrong" arc in gray opacity=0.3 above
  the neck with ✗ to show what not to do; straight line with ✓

**Step 5** — "Read the number where the tape reaches the far shoulder."
- Crop: viewBox "110 70 100 60" (right shoulder area)
- Show: right shoulder joint, top of right upper arm
- Indicator: end-dot prominent at right shoulder edge

---

### sleeve.html — steps 1–5

For sleeve illustrations, show only the LEFT arm (shoulder joint + upper arm + forearm + hand).
The arm is relaxed at the side with a very slight elbow bend.

**Step 1** — "Stand naturally with your arm relaxed at your side, elbow very slightly bent."
- Crop: LEFT-ARM
- Show: left shoulder joint, upper arm, elbow joint, forearm, wrist, hand
- Indicator: none

**Step 2** — "Start at the edge of your shoulder — where a shoulder seam would sit."
- Crop: LEFT-ARM
- Indicator: prominent dot at shoulder edge (cx=38 cy=102 r=7 fill=#A8324A)

**Step 3** — "Run the tape down the outside of your arm, over your elbow, to your wrist bone."
- Crop: LEFT-ARM
- Indicator: path following the left edge of the arm: M 38 102 L 38 178 L 41 244
  in #A8324A stroke-width=3 stroke-dasharray="7 4"; zero-dot at shoulder; end-dot at wrist

**Step 4** — "Keep the tape snug along your arm rather than pulled straight past the elbow bend."
- Crop: LEFT-ARM
- Indicator: same curved path (following arm contour); add a "straight wrong" line
  in gray opacity=0.3 cutting straight past the elbow with ✗; curved line with ✓

**Step 5** — "Read the number at your wrist."
- Crop: viewBox "25 230 80 50" (wrist/hand area)
- Show: bottom of forearm + wrist ring + hand
- Indicator: tape-end dot at wrist

---

### neck.html — steps 1–5

For neck illustrations, use the HEAD-NECK crop showing head + neck + top of shoulders.

**Step 1** — "Stand naturally with your chin level — not tilted up or down."
- Crop: HEAD-NECK
- Indicator: horizontal guide line at chin level (cy ≈ 56) in #A8324A opacity=0.4,
  short (x=70 to x=130) to suggest "keep chin here — level"

**Step 2** — "Wrap the tape around the base of your neck, where a shirt collar would sit."
- Crop: HEAD-NECK
- Indicator: dashed ellipse at neck base cy=83, rx=13, ry=5; zero-dot at left (cx=87)

**Step 3** — "Keep the tape level all the way around."
- Crop: HEAD-NECK
- Indicator: same ellipse; horizontal guide extending beyond the neck with arrows (←→)

**Step 4** — "Pull it snug, but leave enough room to fit a finger between the tape and your neck."
- Crop: HEAD-NECK
- Indicator: same ellipse; small oval (rx=4 ry=2) inside the tape ring to represent
  a finger gap, colored #A8324A opacity=0.5

**Step 5** — "Read the number where the tape meets the zero end."
- Crop: HEAD-NECK
- Indicator: zero-dot prominent at left of neck; tape end implied; label "read here"
  as tiny text (font-size=6) in #A8324A below the dot

---

### thigh.html — steps 1–5

For thigh illustrations, use the THIGH-ZONE crop (hips through knees, focusing on left thigh).

**Step 1** — "Stand with your weight even on both feet."
- Crop: LEGS
- Indicator: none

**Step 2** — "Find the fullest part of your thigh — usually near the top, just below your hip."
- Crop: THIGH-ZONE
- Indicator: horizontal dashed line at cy=258 across the left thigh; two small dots
  at the thigh edges (cx=56 cy=258 and cx=94 cy=258) to show "fullest point here"

**Step 3** — "Wrap the tape around that point, keeping it level all the way around."
- Crop: THIGH-ZONE
- Indicator: dashed ellipse at cy=258, rx=20, ry=8 on the left thigh; zero-dot at left (cx=55)

**Step 4** — "Pull the tape snug against your skin — not tight enough to squeeze or leave a mark."
- Crop: THIGH-ZONE
- Indicator: same ellipse; ✓ in Success Moss

**Step 5** — "Read the number where the tape meets the zero end."
- Crop: viewBox "30 240 90 50" (left thigh, upper area)
- Indicator: zero-dot prominent; tape end implied

---

## CSS change

Add to `styles/main.css` after the `.illustration-placeholder` rule block:

```css
.step-illustration {
  display: block;
  width: 100%;
  max-width: 200px;
  height: auto;
  margin: 0.5rem auto 0;
  border-radius: 8px;
  background-color: var(--color-muslin);
}
```

The existing `.illustration-placeholder` rule can remain in CSS (no harm in keeping
it) — it simply won't match any elements once all placeholders are replaced.

## Implementation pattern per HTML file

For each `guide/*.html` file:

1. Locate the `<svg class="mannequin" ...>` block and replace it entirely with the
   new articulated mannequin SVG using the coordinates and measurement highlight
   from the per-page table above.

2. Update the `aria-labelledby` target `<title>` text to describe the new diagram
   accurately (keep the same `id="mannequinTitle"`).

3. For each of the 5 `<div class="illustration-placeholder">Illustration coming soon</div>`:
   replace with `<svg class="step-illustration" viewBox="..." ...>...</svg>` per the
   step content spec above.

4. Do NOT change: the `<header>`, unit toggle, step text, result section, FITME_CONFIG
   script, or the `<script src="../scripts/guide.js">` tag.

## Constraints

- No frameworks, no build step, no new external files
- All SVG inline in HTML
- All gradients defined inside `<defs>` within each SVG, with unique IDs per SVG
- No new colors beyond the palette above (plus the neutral grays defined in the gradient stops)
- Budget: $0 — no external resources
