# FitMe — project context for Claude Code

## What this project is
A website that teaches complete beginners how to take their own body measurements
(the ones tailors use — chest/bust, waist, hips, inseam, shoulder width, sleeve
length, neck, thigh, etc.), saves those measurements to a profile, and eventually
renders a 3D mannequin scaled to those measurements so the user can preview
clothing before buying it online.

This is a learning project. I am a complete beginner at coding. Explain what
you're doing in plain language as you go, and keep changes small enough that I
can follow each one.

## Current phase — build this first
**Phase 1 only right now:** the measurement guide website.
Do not start on the 3D mannequin (Phase 2) or the browser extension (Phase 3)
until I explicitly ask for them.

## Confirmed tech decisions (don't deviate without asking)
- Hosting: GitHub Pages — static site, no server
- Phase 1: plain HTML, CSS, and JavaScript. No frameworks, no build step,
  no npm dependencies yet — keep it simple while I'm learning the basics
- Accounts/login (add only when I ask): Clerk, free tier
- Saved profiles (add only when I ask): Firebase Firestore, free tier
- 3D rendering (Phase 2, later): Three.js
- Browser extension (Phase 3, later): Chrome Manifest V3
- Budget: $0. Never add a paid API, paid tier, or paid dependency without
  asking me first and explaining the cost

## Phase 2 — garment sourcing plan (when we get there)
Garment 3D models come from Sketchfab's official Download API, not from scraping
random 3D marketplaces (most of those are paid and/or forbid scraping in their
terms of service).
- Search Sketchfab filtered to CC0 or CC-BY licensed models only
- Download a small library of category basics once, at build time, using a
  one-off script — not live at runtime. The site never calls Sketchfab while
  a visitor is using it; it only loads local files
- Store the downloaded files in `assets/garments/`
- CC-BY models require attribution: keep a `/credits` page listing each
  model's creator, source link, and license type
- Start with just enough categories to prove the pattern: t-shirt, hoodie,
  jeans, dress — expand the library later

## Folder structure
```
fitme/
  CLAUDE.md
  index.html          landing page
  guide/
    chest.html         one page per measurement (start with just chest/bust)
  assets/
    illustrations/      diagrams showing how to take each measurement
    garments/            downloaded glTF files from Sketchfab (Phase 2)
  styles/
    main.css
  scripts/
    guide.js            shared interactive logic
    fetch-garments.js   one-time Sketchfab download script (Phase 2, run locally, never at runtime)
  credits.html          attribution for CC-BY garment models (Phase 2)
  README.md
```

## Measurements to cover (in this order)
1. Chest / bust
2. Waist
3. Hips
4. Inseam
5. Shoulder width
6. Sleeve length
7. Neck
8. Thigh

Build and test the pattern on chest/bust first before repeating it for the rest.

## Design priorities
- Accuracy of instructions comes first — a beginner with no tailoring
  knowledge must be able to follow this without confusion
- Mobile-first — assume most users will do this on their phone while
  measuring themselves
- Plain language, short steps, one measurement at a time
- Let users enter measurements in cm or inches (their choice)

## Working style
- Explain new concepts (HTML/CSS/JS terms, git commands) briefly as they come up
- Make one focused change at a time and show me what changed before moving on
- Suggest a git commit after each working milestone
- **Ask before deciding, don't decide for me.** Whenever there's a real design
  choice to make — a UI layout option, which library to use, how to structure
  data, naming things, anything with more than one reasonable answer — stop
  and ask me instead of silently picking one. Give me the options and your
  recommendation, but let me choose. Small, obvious implementation details
  don't need this; genuine judgment calls do.
- **Suggest plugins/MCP servers when they'd genuinely help**, but don't install
  anything without asking first. If a task would go noticeably faster or
  better with a specific plugin (e.g. Chrome DevTools MCP for testing a page
  we just built, Context7 when we start using a library you haven't worked
  with before, the Firebase plugin once we're actually wiring up profiles),
  tell me what it is, what it would do here, and let me decide whether to
  install it.
