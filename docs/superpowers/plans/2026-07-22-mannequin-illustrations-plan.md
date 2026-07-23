# FitMe — Articulated Mannequin + Step Illustrations Implementation Plan

Date: 2026-07-22
Spec: `docs/superpowers/specs/2026-07-22-mannequin-illustrations-design.md`
Status: Ready to implement

## How to use this plan

This plan has one section per measurement page (8 total). Each section contains:

- **(A)** The complete, copy-paste-ready `<svg class="mannequin" ...>` block that
  REPLACES the existing `<svg class="mannequin" ...>...</svg>` in that HTML file.
  Nothing else in the file changes except this block (and, separately, the 5 step
  illustrations in part B). Keep the `<p class="mannequin-caption">` line that
  follows it.
- **(B)** A step-illustration table. Each of the 5 `<div class="illustration-placeholder">Illustration coming soon</div>`
  blocks is replaced with an `<svg class="step-illustration" viewBox="..." xmlns="http://www.w3.org/2000/svg" role="img" aria-label="...">`
  built from the crop viewBox, body parts, and indicator listed.

### Shared conventions (apply everywhere)

Body-part styling (from spec):

- Body masses (head, neck rect, torso, arms, legs, hands, feet): `stroke="#C0BBB0" stroke-width="1.2"`
- Joint rings (shoulder, elbow, wrist, pelvis, knee, ankle): `fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"`
- Head-neck ring and neck-shoulder ring: `fill="#C4BEB2" opacity="0.85"` (no stroke)

Gradient fill mapping:

| Body part | Fill |
|---|---|
| Head | `url(#headG<suffix>)` |
| Neck rect | `url(#neckG<suffix>)` |
| Torso | `url(#torsoG<suffix>)` |
| Upper arm, forearm, hand | `url(#armG<suffix>)` |
| Thigh, shin, foot | `url(#legG<suffix>)` |

Gradient ID suffix per page: chest `-cm`, waist `-wm`, hips `-hm`, inseam `-im`,
shoulder `-shm`, sleeve `-slm`, neck `-nm`, thigh `-tm`. Step illustrations use
per-step suffixes (`-c1`…`-c5`, `-w1`…`-w5`, etc.) so IDs never collide in the
shared page DOM.

Drawing order for the main mannequin (back-to-front): head → head-neck ring →
neck rect → neck-shoulder ring → torso → arms → legs → all joint rings → measurement
highlight last (on top).

Palette: Thread Berry `#A8324A` (bands/highlights), Success Moss `#5C7A5E` (check
marks), Tape Ivory `#F2E9D8` (tape widget fill), gray `#999`/opacity for "wrong"
guides.

Each step illustration must include its own `<defs>` with whichever gradients the
drawn body parts need (suffixed per step). To keep this plan readable, the step
tables list the parts and indicators; reuse the exact part markup from part (A) of
the same page, re-suffixing the gradient IDs.

---

## 1. chest.html

Suffix: `-cm`. viewBox: `0 0 200 430` (full body). Measurement: circumference,
cy=126, rx=55, ry=11, left_x=45, tape widget centered on torso (x=86).

### (A) Main mannequin SVG

```html
<svg class="mannequin" viewBox="0 0 200 430" role="img" aria-labelledby="mannequinTitle" xmlns="http://www.w3.org/2000/svg">
  <title id="mannequinTitle">Diagram of a full articulated figure with a tape measure wrapped around the fullest part of the chest</title>
  <defs>
    <radialGradient id="headG-cm" cx="38%" cy="32%" r="62%">
      <stop offset="0%" stop-color="#F4F0E8"/>
      <stop offset="100%" stop-color="#C8C3B6"/>
    </radialGradient>
    <radialGradient id="torsoG-cm" cx="40%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#F0EDE4"/>
      <stop offset="100%" stop-color="#C4BEB2"/>
    </radialGradient>
    <linearGradient id="armG-cm" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#BEB9AE"/>
      <stop offset="28%" stop-color="#EDE9E0"/>
      <stop offset="72%" stop-color="#EDE9E0"/>
      <stop offset="100%" stop-color="#B8B4A8"/>
    </linearGradient>
    <linearGradient id="legG-cm" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#BEB9AE"/>
      <stop offset="28%" stop-color="#EDE9E0"/>
      <stop offset="72%" stop-color="#EDE9E0"/>
      <stop offset="100%" stop-color="#B8B4A8"/>
    </linearGradient>
    <linearGradient id="neckG-cm" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#C4BEB2"/>
      <stop offset="40%" stop-color="#EDE9E0"/>
      <stop offset="60%" stop-color="#EDE9E0"/>
      <stop offset="100%" stop-color="#C0BBB0"/>
    </linearGradient>
  </defs>

  <!-- Head + neck -->
  <ellipse cx="100" cy="42" rx="29" ry="34" fill="url(#headG-cm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <ellipse cx="100" cy="74" rx="13" ry="5" fill="#C4BEB2" opacity="0.85"/>
  <rect x="90" y="72" width="20" height="20" rx="8" fill="url(#neckG-cm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <ellipse cx="100" cy="93" rx="13" ry="5" fill="#C4BEB2" opacity="0.85"/>

  <!-- Torso -->
  <path d="M 100 90 Q 78 90 63 96 Q 48 103 46 116 Q 44 130 48 145 Q 44 160 46 178 Q 48 196 58 207 Q 68 216 82 219 Q 90 221 100 221 Q 110 221 118 219 Q 132 216 142 207 Q 152 196 154 178 Q 156 160 152 145 Q 156 130 154 116 Q 152 103 137 96 Q 122 90 100 90 Z" fill="url(#torsoG-cm)" stroke="#C0BBB0" stroke-width="1.2"/>

  <!-- Left arm -->
  <rect x="38" y="106" width="26" height="72" rx="13" fill="url(#armG-cm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <rect x="41" y="182" width="22" height="62" rx="11" fill="url(#armG-cm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <ellipse cx="52" cy="256" rx="12" ry="10" fill="url(#armG-cm)" stroke="#C0BBB0" stroke-width="1.2"/>

  <!-- Right arm -->
  <rect x="136" y="106" width="26" height="72" rx="13" fill="url(#armG-cm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <rect x="137" y="182" width="22" height="62" rx="11" fill="url(#armG-cm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <ellipse cx="148" cy="256" rx="12" ry="10" fill="url(#armG-cm)" stroke="#C0BBB0" stroke-width="1.2"/>

  <!-- Left leg -->
  <rect x="56" y="222" width="38" height="94" rx="18" fill="url(#legG-cm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <rect x="61" y="321" width="28" height="78" rx="14" fill="url(#legG-cm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <ellipse cx="75" cy="412" rx="16" ry="9" fill="url(#legG-cm)" stroke="#C0BBB0" stroke-width="1.2"/>

  <!-- Right leg -->
  <rect x="106" y="222" width="38" height="94" rx="18" fill="url(#legG-cm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <rect x="111" y="321" width="28" height="78" rx="14" fill="url(#legG-cm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <ellipse cx="125" cy="412" rx="16" ry="9" fill="url(#legG-cm)" stroke="#C0BBB0" stroke-width="1.2"/>

  <!-- Joint rings -->
  <ellipse cx="52" cy="102" rx="15" ry="11" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="148" cy="102" rx="15" ry="11" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="51" cy="180" rx="14" ry="8" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="149" cy="180" rx="14" ry="8" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="52" cy="246" rx="11" ry="5" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="148" cy="246" rx="11" ry="5" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="100" cy="219" rx="47" ry="10" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="75" cy="318" rx="20" ry="10" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="125" cy="318" rx="20" ry="10" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="75" cy="401" rx="14" ry="6" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="125" cy="401" rx="14" ry="6" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>

  <!-- Chest circumference highlight -->
  <ellipse cx="100" cy="126" rx="55" ry="15" fill="#A8324A" opacity="0.08"/>
  <ellipse cx="100" cy="126" rx="55" ry="11" fill="none" stroke="#A8324A" stroke-width="3" stroke-dasharray="7 4"/>
  <circle cx="45" cy="126" r="7" fill="#A8324A"/>
  <circle cx="45" cy="126" r="3.5" fill="white"/>
  <rect x="86" y="119" width="28" height="14" rx="4" fill="#F2E9D8" stroke="#A8324A" stroke-width="1.5"/>
</svg>
```

### (B) Step illustrations

| Step | Crop viewBox | Body parts to draw | Indicator to add |
|---|---|---|---|
| 1 | `10 0 180 260` (UPPER-BODY) | head, head-neck ring, neck rect, neck-shoulder ring, torso, both upper arms, both shoulder joint rings | None — relaxed standing figure |
| 2 | `20 95 160 80` (CHEST-ZONE) | top of torso, both shoulder joint rings, top of both upper arms | Dashed ellipse `cx=100 cy=126 rx=55 ry=11`; shaded ellipse `ry=15` opacity 0.08; zero-dot `cx=45 cy=126` (r=7 + r=3.5 white) |
| 3 | `20 95 160 80` (CHEST-ZONE) | same as step 2 | Same dashed ellipse; add horizontal guide line `x1=45 y1=126 x2=155 y2=126` stroke `#A8324A` opacity 0.4, with small arrowheads (←/→) at each end to show "level" |
| 4 | `20 95 160 80` (CHEST-ZONE) | same as step 2 | Dashed ellipse pulled to body `rx=52 ry=9`; small ✓ check mark (two `<line>` strokes) in `#5C7A5E` near the tape |
| 5 | `10 100 100 60` (tight left-side chest) | left side of torso, left shoulder joint ring, left upper arm | Zero-dot `cx=45 cy=126` (r=7 + r=3.5 white); short tape-end stub overlapping it; `<text x=53 y=130 font-size=8 fill="#A8324A">0</text>` |

---

## 2. waist.html

Suffix: `-wm`. viewBox: `0 0 200 430` (full body). Measurement: circumference,
cy=170, rx=46, ry=9, left_x=54, tape widget x=86.

### (A) Main mannequin SVG

```html
<svg class="mannequin" viewBox="0 0 200 430" role="img" aria-labelledby="mannequinTitle" xmlns="http://www.w3.org/2000/svg">
  <title id="mannequinTitle">Diagram of a full articulated figure with a tape measure wrapped around the natural waist</title>
  <defs>
    <radialGradient id="headG-wm" cx="38%" cy="32%" r="62%">
      <stop offset="0%" stop-color="#F4F0E8"/>
      <stop offset="100%" stop-color="#C8C3B6"/>
    </radialGradient>
    <radialGradient id="torsoG-wm" cx="40%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#F0EDE4"/>
      <stop offset="100%" stop-color="#C4BEB2"/>
    </radialGradient>
    <linearGradient id="armG-wm" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#BEB9AE"/>
      <stop offset="28%" stop-color="#EDE9E0"/>
      <stop offset="72%" stop-color="#EDE9E0"/>
      <stop offset="100%" stop-color="#B8B4A8"/>
    </linearGradient>
    <linearGradient id="legG-wm" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#BEB9AE"/>
      <stop offset="28%" stop-color="#EDE9E0"/>
      <stop offset="72%" stop-color="#EDE9E0"/>
      <stop offset="100%" stop-color="#B8B4A8"/>
    </linearGradient>
    <linearGradient id="neckG-wm" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#C4BEB2"/>
      <stop offset="40%" stop-color="#EDE9E0"/>
      <stop offset="60%" stop-color="#EDE9E0"/>
      <stop offset="100%" stop-color="#C0BBB0"/>
    </linearGradient>
  </defs>

  <ellipse cx="100" cy="42" rx="29" ry="34" fill="url(#headG-wm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <ellipse cx="100" cy="74" rx="13" ry="5" fill="#C4BEB2" opacity="0.85"/>
  <rect x="90" y="72" width="20" height="20" rx="8" fill="url(#neckG-wm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <ellipse cx="100" cy="93" rx="13" ry="5" fill="#C4BEB2" opacity="0.85"/>

  <path d="M 100 90 Q 78 90 63 96 Q 48 103 46 116 Q 44 130 48 145 Q 44 160 46 178 Q 48 196 58 207 Q 68 216 82 219 Q 90 221 100 221 Q 110 221 118 219 Q 132 216 142 207 Q 152 196 154 178 Q 156 160 152 145 Q 156 130 154 116 Q 152 103 137 96 Q 122 90 100 90 Z" fill="url(#torsoG-wm)" stroke="#C0BBB0" stroke-width="1.2"/>

  <rect x="38" y="106" width="26" height="72" rx="13" fill="url(#armG-wm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <rect x="41" y="182" width="22" height="62" rx="11" fill="url(#armG-wm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <ellipse cx="52" cy="256" rx="12" ry="10" fill="url(#armG-wm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <rect x="136" y="106" width="26" height="72" rx="13" fill="url(#armG-wm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <rect x="137" y="182" width="22" height="62" rx="11" fill="url(#armG-wm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <ellipse cx="148" cy="256" rx="12" ry="10" fill="url(#armG-wm)" stroke="#C0BBB0" stroke-width="1.2"/>

  <rect x="56" y="222" width="38" height="94" rx="18" fill="url(#legG-wm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <rect x="61" y="321" width="28" height="78" rx="14" fill="url(#legG-wm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <ellipse cx="75" cy="412" rx="16" ry="9" fill="url(#legG-wm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <rect x="106" y="222" width="38" height="94" rx="18" fill="url(#legG-wm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <rect x="111" y="321" width="28" height="78" rx="14" fill="url(#legG-wm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <ellipse cx="125" cy="412" rx="16" ry="9" fill="url(#legG-wm)" stroke="#C0BBB0" stroke-width="1.2"/>

  <ellipse cx="52" cy="102" rx="15" ry="11" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="148" cy="102" rx="15" ry="11" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="51" cy="180" rx="14" ry="8" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="149" cy="180" rx="14" ry="8" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="52" cy="246" rx="11" ry="5" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="148" cy="246" rx="11" ry="5" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="100" cy="219" rx="47" ry="10" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="75" cy="318" rx="20" ry="10" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="125" cy="318" rx="20" ry="10" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="75" cy="401" rx="14" ry="6" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="125" cy="401" rx="14" ry="6" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>

  <!-- Waist circumference highlight -->
  <ellipse cx="100" cy="170" rx="46" ry="13" fill="#A8324A" opacity="0.08"/>
  <ellipse cx="100" cy="170" rx="46" ry="9" fill="none" stroke="#A8324A" stroke-width="3" stroke-dasharray="7 4"/>
  <circle cx="54" cy="170" r="7" fill="#A8324A"/>
  <circle cx="54" cy="170" r="3.5" fill="white"/>
  <rect x="86" y="163" width="28" height="14" rx="4" fill="#F2E9D8" stroke="#A8324A" stroke-width="1.5"/>
</svg>
```

### (B) Step illustrations

| Step | Crop viewBox | Body parts to draw | Indicator to add |
|---|---|---|---|
| 1 | `10 0 180 260` (UPPER-BODY) | head, neck (3 pieces), torso, both upper arms, both shoulder joint rings | None |
| 2 | `20 140 160 80` (WAIST-ZONE) | torso midsection, elbow rings + forearms edges as they enter crop | Horizontal dashed line `x1=54 y1=165 x2=146 y2=165` stroke `#A8324A` opacity 0.5; small inward-pointing arrowheads at left and right ends to show "narrowest here" |
| 3 | `20 140 160 80` (WAIST-ZONE) | same as step 2 | Dashed ellipse `cx=100 cy=170 rx=46 ry=9`; shaded ellipse `ry=13` opacity 0.08; zero-dot `cx=54 cy=170` (r=7 + r=3.5 white) |
| 4 | `20 140 160 80` (WAIST-ZONE) | same as step 2 | Same dashed ellipse as step 3; small ✓ in `#5C7A5E` near the tape |
| 5 | `10 150 100 50` (left waist) | left side of torso midsection | Zero-dot prominent `cx=54 cy=170` (r=7 + r=3.5 white); short tape-end stub overlapping |

---

## 3. hips.html

Suffix: `-hm`. viewBox: `0 0 200 430` (full body). Measurement: circumference,
cy=208, rx=52, ry=10, left_x=48, tape widget x=86.

### (A) Main mannequin SVG

```html
<svg class="mannequin" viewBox="0 0 200 430" role="img" aria-labelledby="mannequinTitle" xmlns="http://www.w3.org/2000/svg">
  <title id="mannequinTitle">Diagram of a full articulated figure with a tape measure wrapped around the fullest part of the hips</title>
  <defs>
    <radialGradient id="headG-hm" cx="38%" cy="32%" r="62%">
      <stop offset="0%" stop-color="#F4F0E8"/>
      <stop offset="100%" stop-color="#C8C3B6"/>
    </radialGradient>
    <radialGradient id="torsoG-hm" cx="40%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#F0EDE4"/>
      <stop offset="100%" stop-color="#C4BEB2"/>
    </radialGradient>
    <linearGradient id="armG-hm" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#BEB9AE"/>
      <stop offset="28%" stop-color="#EDE9E0"/>
      <stop offset="72%" stop-color="#EDE9E0"/>
      <stop offset="100%" stop-color="#B8B4A8"/>
    </linearGradient>
    <linearGradient id="legG-hm" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#BEB9AE"/>
      <stop offset="28%" stop-color="#EDE9E0"/>
      <stop offset="72%" stop-color="#EDE9E0"/>
      <stop offset="100%" stop-color="#B8B4A8"/>
    </linearGradient>
    <linearGradient id="neckG-hm" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#C4BEB2"/>
      <stop offset="40%" stop-color="#EDE9E0"/>
      <stop offset="60%" stop-color="#EDE9E0"/>
      <stop offset="100%" stop-color="#C0BBB0"/>
    </linearGradient>
  </defs>

  <ellipse cx="100" cy="42" rx="29" ry="34" fill="url(#headG-hm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <ellipse cx="100" cy="74" rx="13" ry="5" fill="#C4BEB2" opacity="0.85"/>
  <rect x="90" y="72" width="20" height="20" rx="8" fill="url(#neckG-hm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <ellipse cx="100" cy="93" rx="13" ry="5" fill="#C4BEB2" opacity="0.85"/>

  <path d="M 100 90 Q 78 90 63 96 Q 48 103 46 116 Q 44 130 48 145 Q 44 160 46 178 Q 48 196 58 207 Q 68 216 82 219 Q 90 221 100 221 Q 110 221 118 219 Q 132 216 142 207 Q 152 196 154 178 Q 156 160 152 145 Q 156 130 154 116 Q 152 103 137 96 Q 122 90 100 90 Z" fill="url(#torsoG-hm)" stroke="#C0BBB0" stroke-width="1.2"/>

  <rect x="38" y="106" width="26" height="72" rx="13" fill="url(#armG-hm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <rect x="41" y="182" width="22" height="62" rx="11" fill="url(#armG-hm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <ellipse cx="52" cy="256" rx="12" ry="10" fill="url(#armG-hm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <rect x="136" y="106" width="26" height="72" rx="13" fill="url(#armG-hm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <rect x="137" y="182" width="22" height="62" rx="11" fill="url(#armG-hm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <ellipse cx="148" cy="256" rx="12" ry="10" fill="url(#armG-hm)" stroke="#C0BBB0" stroke-width="1.2"/>

  <rect x="56" y="222" width="38" height="94" rx="18" fill="url(#legG-hm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <rect x="61" y="321" width="28" height="78" rx="14" fill="url(#legG-hm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <ellipse cx="75" cy="412" rx="16" ry="9" fill="url(#legG-hm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <rect x="106" y="222" width="38" height="94" rx="18" fill="url(#legG-hm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <rect x="111" y="321" width="28" height="78" rx="14" fill="url(#legG-hm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <ellipse cx="125" cy="412" rx="16" ry="9" fill="url(#legG-hm)" stroke="#C0BBB0" stroke-width="1.2"/>

  <ellipse cx="52" cy="102" rx="15" ry="11" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="148" cy="102" rx="15" ry="11" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="51" cy="180" rx="14" ry="8" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="149" cy="180" rx="14" ry="8" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="52" cy="246" rx="11" ry="5" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="148" cy="246" rx="11" ry="5" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="100" cy="219" rx="47" ry="10" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="75" cy="318" rx="20" ry="10" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="125" cy="318" rx="20" ry="10" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="75" cy="401" rx="14" ry="6" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="125" cy="401" rx="14" ry="6" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>

  <!-- Hips circumference highlight -->
  <ellipse cx="100" cy="208" rx="52" ry="14" fill="#A8324A" opacity="0.08"/>
  <ellipse cx="100" cy="208" rx="52" ry="10" fill="none" stroke="#A8324A" stroke-width="3" stroke-dasharray="7 4"/>
  <circle cx="48" cy="208" r="7" fill="#A8324A"/>
  <circle cx="48" cy="208" r="3.5" fill="white"/>
  <rect x="86" y="201" width="28" height="14" rx="4" fill="#F2E9D8" stroke="#A8324A" stroke-width="1.5"/>
</svg>
```

### (B) Step illustrations

| Step | Crop viewBox | Body parts to draw | Indicator to add |
|---|---|---|---|
| 1 | `20 200 160 235` (LEGS) | pelvis ring, both thighs, both knee rings, both shins, both ankle rings, both feet — feet TOGETHER (shift right foot to `cx=105`; keep left foot `cx=75`) | None |
| 2 | `20 185 160 90` (HIP-ZONE) | lower torso, pelvis ring, tops of both thighs | Horizontal arrow line at `cy=205` (`x1=48 x2=152`) with arrowheads at both ends; small dot at widest point each side (`cx=48 cy=205` and `cx=152 cy=205`) |
| 3 | `20 185 160 90` (HIP-ZONE) | same as step 2 | Dashed ellipse `cx=100 cy=208 rx=52 ry=10`; shaded ellipse `ry=14` opacity 0.08; zero-dot `cx=48 cy=208` (r=7 + r=3.5 white) |
| 4 | `20 185 160 90` (HIP-ZONE) | same as step 2 | Same dashed ellipse; small ✓ in `#5C7A5E` |
| 5 | `10 190 100 50` (left hip) | left side of lower torso + left hip of pelvis ring | Zero-dot prominent `cx=48 cy=208` (r=7 + r=3.5 white); tape end implied by short stub |

---

## 4. inseam.html

Suffix: `-im`. viewBox: `20 195 160 240`. Measurement: linear, vertical line from
crotch `(75,222)` to foot `(75,412)`.
Show: bottom of torso + pelvis ring + both full legs (thighs, knees, shins, ankles, feet).

### (A) Main mannequin SVG

```html
<svg class="mannequin" viewBox="20 195 160 240" role="img" aria-labelledby="mannequinTitle" xmlns="http://www.w3.org/2000/svg">
  <title id="mannequinTitle">Diagram of both legs with a tape measure running from the crotch straight down the inside of the leg to the floor</title>
  <defs>
    <radialGradient id="headG-im" cx="38%" cy="32%" r="62%">
      <stop offset="0%" stop-color="#F4F0E8"/>
      <stop offset="100%" stop-color="#C8C3B6"/>
    </radialGradient>
    <radialGradient id="torsoG-im" cx="40%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#F0EDE4"/>
      <stop offset="100%" stop-color="#C4BEB2"/>
    </radialGradient>
    <linearGradient id="armG-im" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#BEB9AE"/>
      <stop offset="28%" stop-color="#EDE9E0"/>
      <stop offset="72%" stop-color="#EDE9E0"/>
      <stop offset="100%" stop-color="#B8B4A8"/>
    </linearGradient>
    <linearGradient id="legG-im" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#BEB9AE"/>
      <stop offset="28%" stop-color="#EDE9E0"/>
      <stop offset="72%" stop-color="#EDE9E0"/>
      <stop offset="100%" stop-color="#B8B4A8"/>
    </linearGradient>
    <linearGradient id="neckG-im" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#C4BEB2"/>
      <stop offset="40%" stop-color="#EDE9E0"/>
      <stop offset="60%" stop-color="#EDE9E0"/>
      <stop offset="100%" stop-color="#C0BBB0"/>
    </linearGradient>
  </defs>

  <!-- Bottom of torso (top edge only visible in crop) -->
  <path d="M 100 90 Q 78 90 63 96 Q 48 103 46 116 Q 44 130 48 145 Q 44 160 46 178 Q 48 196 58 207 Q 68 216 82 219 Q 90 221 100 221 Q 110 221 118 219 Q 132 216 142 207 Q 152 196 154 178 Q 156 160 152 145 Q 156 130 154 116 Q 152 103 137 96 Q 122 90 100 90 Z" fill="url(#torsoG-im)" stroke="#C0BBB0" stroke-width="1.2"/>

  <!-- Left leg -->
  <rect x="56" y="222" width="38" height="94" rx="18" fill="url(#legG-im)" stroke="#C0BBB0" stroke-width="1.2"/>
  <rect x="61" y="321" width="28" height="78" rx="14" fill="url(#legG-im)" stroke="#C0BBB0" stroke-width="1.2"/>
  <ellipse cx="75" cy="412" rx="16" ry="9" fill="url(#legG-im)" stroke="#C0BBB0" stroke-width="1.2"/>

  <!-- Right leg -->
  <rect x="106" y="222" width="38" height="94" rx="18" fill="url(#legG-im)" stroke="#C0BBB0" stroke-width="1.2"/>
  <rect x="111" y="321" width="28" height="78" rx="14" fill="url(#legG-im)" stroke="#C0BBB0" stroke-width="1.2"/>
  <ellipse cx="125" cy="412" rx="16" ry="9" fill="url(#legG-im)" stroke="#C0BBB0" stroke-width="1.2"/>

  <!-- Joint rings (pelvis, knees, ankles) -->
  <ellipse cx="100" cy="219" rx="47" ry="10" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="75" cy="318" rx="20" ry="10" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="125" cy="318" rx="20" ry="10" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="75" cy="401" rx="14" ry="6" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="125" cy="401" rx="14" ry="6" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>

  <!-- Inseam linear highlight -->
  <line x1="75" y1="222" x2="75" y2="412" stroke="#A8324A" stroke-width="3" stroke-dasharray="7 4"/>
  <circle cx="75" cy="222" r="7" fill="#A8324A"/>
  <circle cx="75" cy="222" r="3.5" fill="white"/>
  <circle cx="75" cy="412" r="5" fill="#A8324A"/>
</svg>
```

### (B) Step illustrations

| Step | Crop viewBox | Body parts to draw | Indicator to add |
|---|---|---|---|
| 1 | `20 200 160 235` (LEGS) | pelvis ring, both thighs, both knee rings, both shins, both ankle rings, both feet (feet tilted slightly forward to suggest shoes) | None |
| 2 | `20 200 160 235` (LEGS) | same, feet in standard position (left thigh `x=56`, right thigh `x=106`) | None |
| 3 | `20 200 160 235` (LEGS) | same | Vertical dashed line `x1=75 y1=222 x2=75 y2=412` stroke `#A8324A` sw=3 dash `7 4`; zero-dot `cx=75 cy=222` (r=7 + r=3.5 white); end-dot `cx=75 cy=412 r=5` |
| 4 | `20 200 160 235` (LEGS) | same | Same straight vertical line + ✓ in `#5C7A5E`; add a curved "wrong" line in gray (`#999` opacity 0.3) following the inner-leg curve with an ✗ marker near it |
| 5 | `40 370 120 65` (ankle/foot) | both shins (lower), both ankle rings, both feet | Tape-end dot at floor level `cx=75 cy=412 r=5` fill `#A8324A` |

---

## 5. shoulder.html

Suffix: `-shm`. viewBox: `0 60 200 170`. Measurement: linear, horizontal line
`y1=y2=102`, `x1=38 x2=162`. Draw full body; viewBox crops to shoulders/torso.

### (A) Main mannequin SVG

```html
<svg class="mannequin" viewBox="0 60 200 170" role="img" aria-labelledby="mannequinTitle" xmlns="http://www.w3.org/2000/svg">
  <title id="mannequinTitle">Diagram of the shoulders and torso with a tape measure running straight across from one shoulder edge to the other</title>
  <defs>
    <radialGradient id="headG-shm" cx="38%" cy="32%" r="62%">
      <stop offset="0%" stop-color="#F4F0E8"/>
      <stop offset="100%" stop-color="#C8C3B6"/>
    </radialGradient>
    <radialGradient id="torsoG-shm" cx="40%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#F0EDE4"/>
      <stop offset="100%" stop-color="#C4BEB2"/>
    </radialGradient>
    <linearGradient id="armG-shm" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#BEB9AE"/>
      <stop offset="28%" stop-color="#EDE9E0"/>
      <stop offset="72%" stop-color="#EDE9E0"/>
      <stop offset="100%" stop-color="#B8B4A8"/>
    </linearGradient>
    <linearGradient id="legG-shm" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#BEB9AE"/>
      <stop offset="28%" stop-color="#EDE9E0"/>
      <stop offset="72%" stop-color="#EDE9E0"/>
      <stop offset="100%" stop-color="#B8B4A8"/>
    </linearGradient>
    <linearGradient id="neckG-shm" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#C4BEB2"/>
      <stop offset="40%" stop-color="#EDE9E0"/>
      <stop offset="60%" stop-color="#EDE9E0"/>
      <stop offset="100%" stop-color="#C0BBB0"/>
    </linearGradient>
  </defs>

  <ellipse cx="100" cy="42" rx="29" ry="34" fill="url(#headG-shm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <ellipse cx="100" cy="74" rx="13" ry="5" fill="#C4BEB2" opacity="0.85"/>
  <rect x="90" y="72" width="20" height="20" rx="8" fill="url(#neckG-shm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <ellipse cx="100" cy="93" rx="13" ry="5" fill="#C4BEB2" opacity="0.85"/>

  <path d="M 100 90 Q 78 90 63 96 Q 48 103 46 116 Q 44 130 48 145 Q 44 160 46 178 Q 48 196 58 207 Q 68 216 82 219 Q 90 221 100 221 Q 110 221 118 219 Q 132 216 142 207 Q 152 196 154 178 Q 156 160 152 145 Q 156 130 154 116 Q 152 103 137 96 Q 122 90 100 90 Z" fill="url(#torsoG-shm)" stroke="#C0BBB0" stroke-width="1.2"/>

  <rect x="38" y="106" width="26" height="72" rx="13" fill="url(#armG-shm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <rect x="41" y="182" width="22" height="62" rx="11" fill="url(#armG-shm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <ellipse cx="52" cy="256" rx="12" ry="10" fill="url(#armG-shm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <rect x="136" y="106" width="26" height="72" rx="13" fill="url(#armG-shm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <rect x="137" y="182" width="22" height="62" rx="11" fill="url(#armG-shm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <ellipse cx="148" cy="256" rx="12" ry="10" fill="url(#armG-shm)" stroke="#C0BBB0" stroke-width="1.2"/>

  <rect x="56" y="222" width="38" height="94" rx="18" fill="url(#legG-shm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <rect x="106" y="222" width="38" height="94" rx="18" fill="url(#legG-shm)" stroke="#C0BBB0" stroke-width="1.2"/>

  <ellipse cx="52" cy="102" rx="15" ry="11" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="148" cy="102" rx="15" ry="11" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="51" cy="180" rx="14" ry="8" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="149" cy="180" rx="14" ry="8" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="100" cy="219" rx="47" ry="10" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>

  <!-- Shoulder-width linear highlight -->
  <line x1="38" y1="102" x2="162" y2="102" stroke="#A8324A" stroke-width="3" stroke-dasharray="7 4"/>
  <circle cx="38" cy="102" r="7" fill="#A8324A"/>
  <circle cx="38" cy="102" r="3.5" fill="white"/>
  <circle cx="162" cy="102" r="5" fill="#A8324A"/>
</svg>
```

### (B) Step illustrations

| Step | Crop viewBox | Body parts to draw | Indicator to add |
|---|---|---|---|
| 1 | `10 0 180 260` (UPPER-BODY) | head, neck (3 pieces), torso, both upper arms, both shoulder joint rings | None |
| 2 | `10 70 180 80` (SHOULDER-LINE) | neck-shoulder ring, both shoulder joint rings, top of torso, tops of both upper arms | Two small dots at shoulder-edge points `cx=38 cy=102` and `cx=162 cy=102` (mark "the points to find") |
| 3 | `10 70 180 80` (SHOULDER-LINE) | same | Horizontal line `x1=38 y1=102 x2=162 y2=102` stroke `#A8324A` sw=3; zero-dot left `cx=38` (r=7 + r=3.5 white); end-dot right `cx=162 r=5`; small vertical tick dashes along the line |
| 4 | `10 70 180 80` (SHOULDER-LINE) | same | Same straight line + ✓ in `#5C7A5E`; add a curved "wrong" arc in gray (`#999` opacity 0.3) rising over the neck with an ✗ marker |
| 5 | `110 70 100 60` (right shoulder) | right shoulder joint ring, top of right upper arm, right edge of torso | End-dot prominent at right shoulder edge `cx=162 cy=102 r=5` fill `#A8324A` |

---

## 6. sleeve.html

Suffix: `-slm`. viewBox: `10 60 120 220`. Measurement: linear path along left arm
from shoulder `(52,102)` to wrist `(52,246)`.
Show: left shoulder joint, left upper arm, left elbow ring, left forearm, left wrist
ring, left hand, plus the top edge of the torso.

### (A) Main mannequin SVG

```html
<svg class="mannequin" viewBox="10 60 120 220" role="img" aria-labelledby="mannequinTitle" xmlns="http://www.w3.org/2000/svg">
  <title id="mannequinTitle">Diagram of the left arm with a tape measure running from the shoulder over the elbow to the wrist</title>
  <defs>
    <radialGradient id="headG-slm" cx="38%" cy="32%" r="62%">
      <stop offset="0%" stop-color="#F4F0E8"/>
      <stop offset="100%" stop-color="#C8C3B6"/>
    </radialGradient>
    <radialGradient id="torsoG-slm" cx="40%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#F0EDE4"/>
      <stop offset="100%" stop-color="#C4BEB2"/>
    </radialGradient>
    <linearGradient id="armG-slm" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#BEB9AE"/>
      <stop offset="28%" stop-color="#EDE9E0"/>
      <stop offset="72%" stop-color="#EDE9E0"/>
      <stop offset="100%" stop-color="#B8B4A8"/>
    </linearGradient>
    <linearGradient id="legG-slm" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#BEB9AE"/>
      <stop offset="28%" stop-color="#EDE9E0"/>
      <stop offset="72%" stop-color="#EDE9E0"/>
      <stop offset="100%" stop-color="#B8B4A8"/>
    </linearGradient>
    <linearGradient id="neckG-slm" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#C4BEB2"/>
      <stop offset="40%" stop-color="#EDE9E0"/>
      <stop offset="60%" stop-color="#EDE9E0"/>
      <stop offset="100%" stop-color="#C0BBB0"/>
    </linearGradient>
  </defs>

  <!-- Top edge of torso (right portion clipped by viewBox) -->
  <path d="M 100 90 Q 78 90 63 96 Q 48 103 46 116 Q 44 130 48 145 Q 44 160 46 178 Q 48 196 58 207 Q 68 216 82 219 Q 90 221 100 221 Q 110 221 118 219 Q 132 216 142 207 Q 152 196 154 178 Q 156 160 152 145 Q 156 130 154 116 Q 152 103 137 96 Q 122 90 100 90 Z" fill="url(#torsoG-slm)" stroke="#C0BBB0" stroke-width="1.2"/>

  <!-- Left arm -->
  <rect x="38" y="106" width="26" height="72" rx="13" fill="url(#armG-slm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <rect x="41" y="182" width="22" height="62" rx="11" fill="url(#armG-slm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <ellipse cx="52" cy="256" rx="12" ry="10" fill="url(#armG-slm)" stroke="#C0BBB0" stroke-width="1.2"/>

  <!-- Joint rings (shoulder, elbow, wrist) -->
  <ellipse cx="52" cy="102" rx="15" ry="11" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="51" cy="180" rx="14" ry="8" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="52" cy="246" rx="11" ry="5" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>

  <!-- Sleeve linear path highlight (shoulder -> elbow -> wrist) -->
  <path d="M 52 102 L 51 178 L 52 246" fill="none" stroke="#A8324A" stroke-width="3" stroke-dasharray="7 4"/>
  <circle cx="52" cy="102" r="7" fill="#A8324A"/>
  <circle cx="52" cy="102" r="3.5" fill="white"/>
  <circle cx="52" cy="246" r="5" fill="#A8324A"/>
</svg>
```

### (B) Step illustrations (left arm only)

| Step | Crop viewBox | Body parts to draw | Indicator to add |
|---|---|---|---|
| 1 | `15 85 110 190` (LEFT-ARM) | left shoulder joint ring, upper arm, elbow ring, forearm, wrist ring, hand | None |
| 2 | `15 85 110 190` (LEFT-ARM) | same | Prominent dot at shoulder edge `cx=38 cy=102 r=7` fill `#A8324A` (+ r=3.5 white center) |
| 3 | `15 85 110 190` (LEFT-ARM) | same | Path `M 38 102 L 38 178 L 41 244` stroke `#A8324A` sw=3 dash `7 4`; zero-dot at shoulder `cx=38 cy=102`; end-dot at wrist `cx=41 cy=244 r=5` |
| 4 | `15 85 110 190` (LEFT-ARM) | same | Same contour path + ✓ in `#5C7A5E`; add a "straight wrong" line in gray (`#999` opacity 0.3) cutting straight past the elbow bend with an ✗ marker |
| 5 | `25 230 80 50` (wrist/hand) | bottom of forearm, wrist ring, hand | Tape-end dot at wrist `cx=41 cy=244 r=5` fill `#A8324A` |

---

## 7. neck.html

Suffix: `-nm`. viewBox: `20 10 160 110`. Measurement: circumference, cy=83, rx=13,
ry=5, left_x=87. NO tape widget (band too small). Show: head + neck + top of shoulders.

### (A) Main mannequin SVG

```html
<svg class="mannequin" viewBox="20 10 160 110" role="img" aria-labelledby="mannequinTitle" xmlns="http://www.w3.org/2000/svg">
  <title id="mannequinTitle">Diagram of the head and neck with a tape measure wrapped around the base of the neck</title>
  <defs>
    <radialGradient id="headG-nm" cx="38%" cy="32%" r="62%">
      <stop offset="0%" stop-color="#F4F0E8"/>
      <stop offset="100%" stop-color="#C8C3B6"/>
    </radialGradient>
    <radialGradient id="torsoG-nm" cx="40%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#F0EDE4"/>
      <stop offset="100%" stop-color="#C4BEB2"/>
    </radialGradient>
    <linearGradient id="armG-nm" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#BEB9AE"/>
      <stop offset="28%" stop-color="#EDE9E0"/>
      <stop offset="72%" stop-color="#EDE9E0"/>
      <stop offset="100%" stop-color="#B8B4A8"/>
    </linearGradient>
    <linearGradient id="legG-nm" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#BEB9AE"/>
      <stop offset="28%" stop-color="#EDE9E0"/>
      <stop offset="72%" stop-color="#EDE9E0"/>
      <stop offset="100%" stop-color="#B8B4A8"/>
    </linearGradient>
    <linearGradient id="neckG-nm" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#C4BEB2"/>
      <stop offset="40%" stop-color="#EDE9E0"/>
      <stop offset="60%" stop-color="#EDE9E0"/>
      <stop offset="100%" stop-color="#C0BBB0"/>
    </linearGradient>
  </defs>

  <!-- Head -->
  <ellipse cx="100" cy="42" rx="29" ry="34" fill="url(#headG-nm)" stroke="#C0BBB0" stroke-width="1.2"/>

  <!-- Top of shoulders / torso (bottom clipped by viewBox) -->
  <path d="M 100 90 Q 78 90 63 96 Q 48 103 46 116 Q 44 130 48 145 Q 44 160 46 178 Q 48 196 58 207 Q 68 216 82 219 Q 90 221 100 221 Q 110 221 118 219 Q 132 216 142 207 Q 152 196 154 178 Q 156 160 152 145 Q 156 130 154 116 Q 152 103 137 96 Q 122 90 100 90 Z" fill="url(#torsoG-nm)" stroke="#C0BBB0" stroke-width="1.2"/>

  <!-- Neck (drawn over torso top) -->
  <ellipse cx="100" cy="74" rx="13" ry="5" fill="#C4BEB2" opacity="0.85"/>
  <rect x="90" y="72" width="20" height="20" rx="8" fill="url(#neckG-nm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <ellipse cx="100" cy="93" rx="13" ry="5" fill="#C4BEB2" opacity="0.85"/>

  <!-- Shoulder joint rings (tops visible) -->
  <ellipse cx="52" cy="102" rx="15" ry="11" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="148" cy="102" rx="15" ry="11" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>

  <!-- Neck circumference highlight (no tape widget) -->
  <ellipse cx="100" cy="83" rx="13" ry="9" fill="#A8324A" opacity="0.08"/>
  <ellipse cx="100" cy="83" rx="13" ry="5" fill="none" stroke="#A8324A" stroke-width="3" stroke-dasharray="7 4"/>
  <circle cx="87" cy="83" r="7" fill="#A8324A"/>
  <circle cx="87" cy="83" r="3.5" fill="white"/>
</svg>
```

### (B) Step illustrations (all HEAD-NECK crop `45 5 110 105`)

| Step | Crop viewBox | Body parts to draw | Indicator to add |
|---|---|---|---|
| 1 | `45 5 110 105` (HEAD-NECK) | head, neck (3 pieces), top of shoulders (torso top + shoulder rings) | Horizontal guide line at chin level `x1=70 y1=56 x2=130 y2=56` stroke `#A8324A` opacity 0.4 ("keep chin level") |
| 2 | `45 5 110 105` (HEAD-NECK) | same | Dashed ellipse `cx=100 cy=83 rx=13 ry=5`; shaded ellipse `ry=9` opacity 0.08; zero-dot left `cx=87 cy=83` (r=7 + r=3.5 white) |
| 3 | `45 5 110 105` (HEAD-NECK) | same | Same ellipse; horizontal guide extending beyond the neck (`x1=75 x2=125 y=83`) with arrowheads (←/→) at both ends |
| 4 | `45 5 110 105` (HEAD-NECK) | same | Same ellipse; small oval `rx=4 ry=2` inside the tape ring representing a finger gap, fill `#A8324A` opacity 0.5 |
| 5 | `45 5 110 105` (HEAD-NECK) | same | Zero-dot prominent at left of neck `cx=87 cy=83` (r=7 + r=3.5 white); tiny `<text x=80 y=98 font-size=6 fill="#A8324A">read here</text>` below the dot |

---

## 8. thigh.html

Suffix: `-tm`. viewBox: `20 195 160 200`. Measurement: circumference on left thigh,
cy=258, rx=20, ry=8, left_x=55. Tape widget centered on left thigh (cx=75 → x=61).
Show: bottom of torso, pelvis ring, both legs (thighs, knees, shins; ankles/feet
mostly clipped).

### (A) Main mannequin SVG

```html
<svg class="mannequin" viewBox="20 195 160 200" role="img" aria-labelledby="mannequinTitle" xmlns="http://www.w3.org/2000/svg">
  <title id="mannequinTitle">Diagram of both legs with a tape measure wrapped around the fullest part of the upper thigh</title>
  <defs>
    <radialGradient id="headG-tm" cx="38%" cy="32%" r="62%">
      <stop offset="0%" stop-color="#F4F0E8"/>
      <stop offset="100%" stop-color="#C8C3B6"/>
    </radialGradient>
    <radialGradient id="torsoG-tm" cx="40%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#F0EDE4"/>
      <stop offset="100%" stop-color="#C4BEB2"/>
    </radialGradient>
    <linearGradient id="armG-tm" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#BEB9AE"/>
      <stop offset="28%" stop-color="#EDE9E0"/>
      <stop offset="72%" stop-color="#EDE9E0"/>
      <stop offset="100%" stop-color="#B8B4A8"/>
    </linearGradient>
    <linearGradient id="legG-tm" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#BEB9AE"/>
      <stop offset="28%" stop-color="#EDE9E0"/>
      <stop offset="72%" stop-color="#EDE9E0"/>
      <stop offset="100%" stop-color="#B8B4A8"/>
    </linearGradient>
    <linearGradient id="neckG-tm" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#C4BEB2"/>
      <stop offset="40%" stop-color="#EDE9E0"/>
      <stop offset="60%" stop-color="#EDE9E0"/>
      <stop offset="100%" stop-color="#C0BBB0"/>
    </linearGradient>
  </defs>

  <!-- Bottom of torso (top edge clipped by viewBox) -->
  <path d="M 100 90 Q 78 90 63 96 Q 48 103 46 116 Q 44 130 48 145 Q 44 160 46 178 Q 48 196 58 207 Q 68 216 82 219 Q 90 221 100 221 Q 110 221 118 219 Q 132 216 142 207 Q 152 196 154 178 Q 156 160 152 145 Q 156 130 154 116 Q 152 103 137 96 Q 122 90 100 90 Z" fill="url(#torsoG-tm)" stroke="#C0BBB0" stroke-width="1.2"/>

  <!-- Left leg -->
  <rect x="56" y="222" width="38" height="94" rx="18" fill="url(#legG-tm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <rect x="61" y="321" width="28" height="78" rx="14" fill="url(#legG-tm)" stroke="#C0BBB0" stroke-width="1.2"/>

  <!-- Right leg -->
  <rect x="106" y="222" width="38" height="94" rx="18" fill="url(#legG-tm)" stroke="#C0BBB0" stroke-width="1.2"/>
  <rect x="111" y="321" width="28" height="78" rx="14" fill="url(#legG-tm)" stroke="#C0BBB0" stroke-width="1.2"/>

  <!-- Joint rings (pelvis, knees) -->
  <ellipse cx="100" cy="219" rx="47" ry="10" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="75" cy="318" rx="20" ry="10" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>
  <ellipse cx="125" cy="318" rx="20" ry="10" fill="#C4BEB2" opacity="0.9" stroke="#B8B3A8" stroke-width="0.8"/>

  <!-- Thigh circumference highlight (left thigh, centered at cx=75) -->
  <ellipse cx="75" cy="258" rx="20" ry="12" fill="#A8324A" opacity="0.08"/>
  <ellipse cx="75" cy="258" rx="20" ry="8" fill="none" stroke="#A8324A" stroke-width="3" stroke-dasharray="7 4"/>
  <circle cx="55" cy="258" r="7" fill="#A8324A"/>
  <circle cx="55" cy="258" r="3.5" fill="white"/>
  <rect x="61" y="251" width="28" height="14" rx="4" fill="#F2E9D8" stroke="#A8324A" stroke-width="1.5"/>
</svg>
```

### (B) Step illustrations

| Step | Crop viewBox | Body parts to draw | Indicator to add |
|---|---|---|---|
| 1 | `20 200 160 235` (LEGS) | pelvis ring, both thighs, both knee rings, both shins, both ankle rings, both feet | None |
| 2 | `30 210 140 140` (THIGH-ZONE) | pelvis ring, both thighs, both knee rings | Horizontal dashed line across left thigh `x1=56 y1=258 x2=94 y2=258` stroke `#A8324A`; small dots at thigh edges `cx=56 cy=258` and `cx=94 cy=258` |
| 3 | `30 210 140 140` (THIGH-ZONE) | same | Dashed ellipse `cx=75 cy=258 rx=20 ry=8`; shaded ellipse `ry=12` opacity 0.08; zero-dot left `cx=55 cy=258` (r=7 + r=3.5 white) |
| 4 | `30 210 140 140` (THIGH-ZONE) | same | Same ellipse; small ✓ in `#5C7A5E` |
| 5 | `30 240 90 50` (left thigh, upper) | upper portion of left thigh | Zero-dot prominent `cx=55 cy=258` (r=7 + r=3.5 white); tape end implied by short stub |

---

## Also required (once, not per page)

Add to `styles/main.css` immediately after the `.illustration-placeholder` rule
block:

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

## Do NOT change

For every file: leave the `<header>`, unit toggle, all step text, the result
section, the `window.FITME_CONFIG` script, and the `<script src="../scripts/guide.js">`
tag untouched. Keep each `<p class="mannequin-caption">` line. Only the
`<svg class="mannequin">` block and the five `.illustration-placeholder` divs change.
