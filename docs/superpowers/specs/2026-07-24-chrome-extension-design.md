# FitMe Chrome Extension — Design Spec
**Date:** 2026-07-24
**Phase:** 3

---

## Overview

A Chrome Manifest V3 extension that detects when the user is on a supported clothing product page, reads the size chart via Jina AI Reader, fetches the user's saved FitMe measurements from Firebase, and injects a size recommendation panel directly into the page. No extra click required — the panel appears automatically.

---

## Supported Sites (v1)

| Site | Notes |
|---|---|
| loft.com | Consistent brand size chart; same parent company as Ann Taylor |
| anntaylor.com | Same size chart format as Loft |
| amazon.com | Size charts vary by brand/seller; parser must be flexible |
| poshmark.com | Resale listings: no size chart, only a tag size. Special handling required. |

Additional sites can be added by extending `config/sites.json` without touching core logic.

---

## Architecture

```
extension/
  manifest.json               Chrome Manifest V3
  popup/
    popup.html                Sign-in screen and connection status
    popup.js
    popup.css
  content/
    content.js                Entry point injected into product pages
    panel.css                 Styles for the recommendation panel
  background/
    service-worker.js         Stores auth tokens; relays messages between popup and content
  scripts/
    site-detector.js          Checks current URL against supported site patterns
    jina-client.js            Calls r.jina.ai and returns clean markdown
    size-parser.js            Finds and structures size chart tables from markdown
    recommender.js            Matches user measurements to sizes
    firebase-client.js        Reads user measurements from Firestore using Clerk JWT
  config/
    sites.json                URL patterns and product-page selectors per supported site
```

---

## Data Flow

```
User lands on product page
        │
        ▼
content.js → site-detector.js
   Is this a supported product page?
        │ no → exit silently
        │ yes
        ▼
   Is user signed in? (check chrome.storage.local for Clerk JWT)
        │ no → inject "Sign in to FitMe" banner
        │ yes
        ▼
   jina-client.js: GET https://r.jina.ai/{currentURL}
        │
        ▼
   size-parser.js: find size chart table in markdown
        │ not found → show fallback (measurements only)
        │ found
        ▼
   firebase-client.js: fetch user measurements from Firestore
        │
        ▼
   recommender.js: match measurements to sizes
        │
        ▼
   Inject recommendation panel into page
```

---

## Jina AI Reader Integration

- **Endpoint:** `https://r.jina.ai/{encodedProductURL}`
- **Auth:** None required. Free, no API key.
- **Output:** Clean markdown of the page. Size charts appear as markdown tables.
- **Privacy note:** The product URL is sent to Jina's servers (reveals what the user is shopping for). This must be disclosed in the extension's Chrome Web Store privacy policy.
- **Monitoring:** Track how often no size chart is found in Jina's output per site. If the fallback rate is high, a different extraction approach (e.g. direct DOM reading or a different API) should be evaluated.

---

## Size Chart Parsing (`size-parser.js`)

The parser scans the Jina markdown for tables whose headers contain any of these keywords:
`bust`, `chest`, `waist`, `hip`, `hips`, `size`, `inseam`, `neck`, `thigh`, `shoulder`

Matching tables are parsed into a structured object:

```js
{
  "XS": { bust: [32, 33], waist: [25, 26], hips: [35, 36] },
  "S":  { bust: [34, 35], waist: [27, 28], hips: [37, 38] },
  "M":  { bust: [36, 37], waist: [29, 30], hips: [39, 40] }
}
```

- Unrecognised columns are ignored
- Range values like `"34–35"` and `"34-35"` are both supported
- If no matching table is found, the parser returns `null` and the extension shows the fallback panel

**Poshmark exception:** Poshmark product pages list a tag size but no chart. `site-detector.js` marks these pages as `type: "tag-only"`. The parsing step is skipped; the panel shows the tag size alongside the user's raw measurements.

---

## Recommendation Logic (`recommender.js`)

1. **Per-measurement match:** For each measurement the user has saved, find every size whose range includes that measurement.
2. **Consensus size:** The recommended size is the one satisfying the most measurements.
3. **Between-sizes:** If no single size satisfies all measurements, recommend the next size up. State which measurement caused the step up.
4. **Missing measurements:** If the user hasn't saved a measurement the chart needs, skip that dimension silently. Note which measurements were used.
5. **Out of range:** If measurements fall outside every size in the chart, report this honestly — no guess.

Standard tailoring rule applied throughout: when in doubt, size up (easier to take in than let out).

---

## Injected Panel UI

```
┌─────────────────────────────────────┐
│ 👗 FitMe recommends: Size 8 / M     │
│                                     │
│ Your 36" bust → fits Size 8         │
│ Your 29" waist → fits Size 8        │
│ Your 39" hips → fits Size 8–10*     │
│                                     │
│ *Between sizes on hips — we suggest │
│  the larger size (standard tailoring)│
│                                     │
│ Preview on your FitMe mannequin →   │
└─────────────────────────────────────┘  ✕
```

- Rendered as a **fixed-position floating card** (bottom-right corner of the viewport, like a chat widget). This avoids the need to find the size selector in each site's HTML, which varies per site and would reintroduce site-specific fragility.
- Dismissible (✕ hides for that page visit; returns on reload)
- "Preview on your FitMe mannequin →" opens the FitMe GitHub Pages URL (`/mannequin.html`) with the user's profile. The exact domain is finalised when the site is published; it is stored in one place in `config/sites.json` so it only needs updating once.

**Fallback states:**

| Situation | Panel shows |
|---|---|
| Not signed in | "Sign in to FitMe for size recommendations" + sign-in button |
| No size chart found | "We couldn't read a size chart — here are your measurements to compare manually" + measurement list |
| Measurements out of range | "Your measurements are outside this chart's size range" |
| Poshmark tag-only | "This is listed as size M. Here are your measurements for comparison." |

---

## Authentication

- **Extension popup** shows a "Sign in to FitMe" button
- Clicking opens Clerk's hosted sign-in page in a new tab (same Clerk app as the main FitMe site)
- After auth, Clerk redirects to the FitMe GitHub Pages URL at `/extension-auth-callback` with the JWT (exact domain stored in `config/sites.json`)
- The background service worker intercepts this redirect, extracts the JWT, stores it in `chrome.storage.local`
- `firebase-client.js` attaches the JWT to all Firestore reads as a Bearer token
- **Token refresh:** service worker checks JWT expiry before each Firestore call; silently refreshes if expired. If refresh fails, panel shows "Please sign in again."

---

## Future: Inline Mannequin Preview (Phase 3C)

The "Preview on your FitMe mannequin →" link is designed as a placeholder for a future inline Three.js render. When that is built:
- The link is replaced with a small canvas element inside the panel
- The mannequin is rendered at reduced resolution (approx 150×250px)
- The garment category (dress, top, jeans, etc.) is inferred from the product page title
- Implementation is isolated to a new `scripts/mannequin-preview.js` module so it can be added without touching the recommendation logic

---

## Chrome Web Store Requirements (checklist)

- [ ] Privacy policy disclosing Jina URL forwarding
- [ ] Minimal permissions declared in `manifest.json` (`activeTab`, `storage`, `identity`)
- [ ] Extension icons: 16px, 48px, 128px
- [ ] Description explaining what data is collected and why
