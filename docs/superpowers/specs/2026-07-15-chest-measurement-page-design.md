# FitMe — Chest/Bust Measurement Page: Design Spec

Date: 2026-07-15
Status: Approved by user, pending spec review sign-off

## Goal

Build the first piece of FitMe's Phase 1 measurement guide: a landing page
(`index.html`) and the first measurement walkthrough (`guide/chest.html`),
following CLAUDE.md's folder structure and design priorities exactly.

Explicitly out of scope for this piece of work (deferred to their proper
phase, per CLAUDE.md and confirmed with the user during brainstorming):
- Clerk accounts / login
- Firebase Firestore / cross-device saved profiles
- A full 3D (Three.js) mannequin

## Visual design system

**Signature element:** a vertical tape-measure "rail" running down the left
edge of each step card, printed with tick marks in the user's selected unit
(cm or in). This is the literal instrument the user is holding, used as the
page's structural spine instead of a generic numbered-circle progress
indicator.

**Color palette:**

| Name | Hex | Use |
|---|---|---|
| Muslin | `#EDEAE2` | page background |
| Ink | `#2B2A28` | body text |
| Thread Berry | `#A8324A` | primary accent, buttons, active/selected states |
| Tape Ivory | `#F2E9D8` | card backgrounds, tape rail base |
| Tick Charcoal | `#4A4640` | tick marks, small labels on the rail |
| Success Moss | `#5C7A5E` | "measurement saved" confirmation state |

**Typography:** system font stacks only (no Google Fonts / external
requests, per user decision — $0 cost, works offline, no third-party
dependency):
- Display/headlines: `ui-rounded, "Segoe UI Rounded", "Hiragino Maru Gothic ProN", Verdana, sans-serif`
- Body text: `-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
- Numbers (measurement input): `ui-monospace, "SF Mono", "Cascadia Code", "Segoe UI Mono", Consolas, monospace`

## index.html

Single-column, mobile-first landing page:
- Header: "FitMe" wordmark
- Hero: headline + 1-2 line reassuring subhead (e.g. "A tape measure and
  five minutes is all you need. We'll guide you through it.")
- Primary CTA button → links to `guide/chest.html` (e.g. "Measure your
  chest/bust →")
- Three short trust/reassurance lines below the fold (no account needed to
  start / takes about 5 minutes / works with any soft tape measure)

## guide/chest.html

Top to bottom, single column, "all at once" layout (not a step-by-step
wizard — everything visible, user scrolls):

1. **Header** — back link to home, page title "Chest / Bust"
2. **Unit toggle** — two buttons, cm / in, pinned near the top. Selected
   unit is filled in Thread Berry.
3. **Mannequin diagram** — one shared inline SVG, not a placeholder image.
   A simple, deliberately abstract/gender-neutral torso outline (no
   realistic anatomy) with the chest region highlighted as a soft band and
   a tape-measure line drawn across it, ticked to match the rail motif.
   This is the core UX feature requested to help beginners see exactly
   where to measure. It is static (does not change per step) since the
   page shows all steps at once rather than one at a time.
4. **5 step cards**, each with the tape-rail tick motif running down its
   left edge, and a grey placeholder box (`<div class="illustration-placeholder">`)
   for a future photo/illustration:
   1. Stand naturally — arms relaxed, don't puff your chest or suck in
   2. Wrap the tape around the fullest part of your chest/bust (usually
      nipple level)
   3. Keep the tape parallel to the floor all the way around — check a
      mirror or ask someone to check the back
   4. Pull it snug against your body, not tight enough to squeeze or leave
      a mark
   5. Breathe normally and read the number where the tape meets zero

   Instructions are written for a generic body (no separate chest-vs-bust
   branching), per user decision.

5. **Result section:**
   - Number input, accepting decimals
   - Label next to the input switches between "cm" / "in" based on the
     unit toggle
   - "Save measurement" button
   - Confirmation message ("Saved!") shown briefly after a successful save,
     styled in Success Moss
   - Inline error message (not `alert()`) if the value is missing or out
     of range

## scripts/guide.js — behavior

- **Unit toggle:** clicking cm or in updates the input's unit label and the
  tick rail's printed numbers. If a value is already entered, it converts
  the number (× 2.54 either direction) so switching units doesn't lose the
  user's entry.
- **Validation:** on save, the value must be a positive number roughly in
  the range 30–200 cm (12–79 in). Out-of-range or empty values show an
  inline error instead of saving.
- **Persistence:** valid values are written to `localStorage` under the key
  `fitme_chest` (storing the raw cm value regardless of displayed unit, so
  unit switching later doesn't require re-deriving which unit was
  originally saved).
- **On page load:** if `localStorage` already has `fitme_chest`, pre-fill
  the input (converted to the currently selected unit) and show "Last
  saved: X cm/in".

## Files

Matches CLAUDE.md's folder structure exactly:
```
fitme/
  index.html
  guide/
    chest.html
  assets/
    illustrations/   (empty for now — step placeholders reference it)
  styles/
    main.css
  scripts/
    guide.js
```

## Testing plan

Manual verification in-browser (no test framework, per "no dependencies
yet"):
- Load `index.html`, confirm CTA link navigates to `guide/chest.html`
- On `guide/chest.html`: toggle cm/in with and without a value entered,
  confirm conversion is correct and rounds sensibly
- Enter an out-of-range value (e.g. 0, -5, 500) and confirm inline error
  shows, nothing is saved
- Enter a valid value, save, confirm "Saved!" message appears and
  `localStorage.fitme_chest` is set (check via browser dev tools)
- Reload the page, confirm the saved value pre-fills and "Last saved"
  message appears
- Resize to desktop width, confirm layout stays sensible (single column is
  allowed to stay centered/max-width on desktop rather than stretching
  full width)
