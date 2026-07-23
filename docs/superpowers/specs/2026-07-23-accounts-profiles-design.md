# Accounts + Profiles Design — FitMe
**Date:** 2026-07-23
**Scope:** Sub-project A — Clerk login + Firestore measurement sync

---

## 1. Goals

Allow users to sign in and have their measurements (and unit preference) sync across devices. The site must continue to work fully without an account — sign-in is additive, not required.

---

## 2. Decisions

| Question | Decision |
|---|---|
| Account required? | No — localStorage-first, sync optional |
| Conflict resolution | Per-field timestamp merge — newest value wins |
| Unit preference | Syncs to Firestore alongside measurements |
| Sign-in UI placement | Header on every page (homepage, all 8 guide pages, mannequin) |
| Sync trigger | Auto-sync on every measurement save (no manual "Sync" button) |
| Auth library | Clerk (free tier, CDN) |
| Storage | Firebase Firestore (free tier, compat SDK via CDN) |
| Build step | None — plain `<script>` tags only |
| Testing | Playwright + GitHub Actions CI |

---

## 3. Architecture

One new file (`scripts/auth.js`) owns all Clerk + Firestore logic. Every other file touches it minimally.

```
scripts/
  auth.js          ← new: Clerk init, sign-in UI injection, Firestore read/write, merge
  guide.js         ← modified: calls auth.syncMeasurement() after each localStorage save
  mannequin.js     ← unchanged
styles/
  main.css         ← modified: header sign-in button styles
index.html         ← modified: CDN script tags, auth.js, <div id="auth-button"> in header
guide/*.html       ← modified: CDN script tags, auth.js, <div id="auth-button"> in header
mannequin.html     ← modified: CDN script tags, auth.js, <div id="auth-button"> in header
tests/
  auth.spec.js     ← new: sign-in/sign-out, header button states
  sync.spec.js     ← new: save → Firestore write → sign out → sign in → verify
  merge.spec.js    ← new: localStorage vs Firestore timestamp conflict scenarios
  unit-pref.spec.js← new: unit preference persists across sign-out/sign-in
  package.json     ← new: Playwright dev dependency (never shipped to the site)
.github/
  workflows/
    e2e.yml        ← new: runs Playwright suite on every push to master
```

**Load order on every page:**
1. Firebase compat SDK (`<script>` from CDN)
2. Clerk JS (`<script>` from CDN)
3. `scripts/auth.js` — runs immediately: injects header button, starts Clerk, listens for auth state
4. Page-specific script (`guide.js` / `mannequin.js`)

**Security:** Clerk publishable keys and Firebase config are safe in client-side code by design. Firestore security rules (configured in the Firebase console) enforce that users can only read/write their own document.

---

## 4. Data Model

### Firestore

Path: `users/{uid}/profile` — one document per user. All 9 fields use the same nested shape so the merge loop is uniform.

```json
{
  "fitme_unit":     { "value": "cm",  "ts": 1721700000000 },
  "fitme_chest":    { "value": 92.0,  "ts": 1721700000000 },
  "fitme_waist":    { "value": 75.0,  "ts": 1721699000000 },
  "fitme_hips":     { "value": 97.0,  "ts": 1721698000000 },
  "fitme_inseam":   { "value": 76.0,  "ts": 1721697000000 },
  "fitme_shoulder": { "value": 44.0,  "ts": 1721696000000 },
  "fitme_sleeve":   { "value": 63.0,  "ts": 1721695000000 },
  "fitme_neck":     { "value": 37.0,  "ts": 1721694000000 },
  "fitme_thigh":    { "value": 58.0,  "ts": 1721693000000 }
}
```

`ts` is `Date.now()` (Unix ms) captured at the moment the user clicked "Save measurement."

### localStorage

Existing keys are unchanged. Two new sibling keys are added per measurement:

| Existing key | New sibling key |
|---|---|
| `fitme_chest` → `"92"` | `fitme_chest_ts` → `"1721700000000"` |
| `fitme_waist` → `"75"` | `fitme_waist_ts` → `"1721699000000"` |
| … | … |
| `fitme_unit` → `"cm"` | `fitme_unit_ts` → `"1721700000000"` |

All 9 keys (`fitme_chest` … `fitme_thigh` plus `fitme_unit`) follow the same pattern in both localStorage and Firestore.

---

## 5. `auth.js` Public Interface

Guide pages call two functions and nothing else. They have no knowledge of Clerk or Firestore.

```javascript
// Injected at the bottom of every page's <script> block.
// Injects sign-in button into <div id="auth-button">, starts Clerk,
// listens for auth state, runs merge on first sign-in.
auth.init();

// Called by guide.js immediately after each localStorage save.
// key: storage key, e.g. 'fitme_chest'
// value: number (always in cm)
// ts: Date.now() at time of save
auth.syncMeasurement(key, value, ts);

// Called by guide.js when the user changes their unit preference.
auth.syncUnit(unit, ts);
```

**Internal functions (not called by other files):**

| Function | Purpose |
|---|---|
| `initClerk()` | Loads Clerk SDK, mounts button into `#auth-button` |
| `initFirebase()` | Initialises Firebase app + Firestore with config constants |
| `onSignIn(user)` | Runs per-field timestamp merge on sign-in |
| `onSignOut()` | Detaches Firestore listener; localStorage keeps its values |
| `writeToFirestore(key, value, ts)` | Single Firestore write path used by merge + live sync |

---

## 6. Merge Logic

Runs in `onSignIn()` each time Clerk fires an auth-state-change event — which happens on every page load for a signed-in user, not just the first time. This is intentional: it enables cross-device sync (measurements updated on another device are pulled in on the next page load).

For each of the 9 fields (8 measurements + unit preference):

```
localTs  = parseInt(localStorage.getItem(key + '_ts') ?? '0')
cloudTs  = firestoreDoc[key]?.ts ?? 0
cloudVal = firestoreDoc[key]?.value ?? null

if localTs >= cloudTs:
  // Local is newer (or equal) — push local value to Firestore
  if localStorage has a value for this key:
    writeToFirestore(key, localValue, localTs)
else:
  // Cloud is newer — pull cloud value into localStorage
  localStorage.setItem(key, cloudVal)
  localStorage.setItem(key + '_ts', cloudTs)
  // Re-render the page's saved value display if present
```

A field with no localStorage entry and no Firestore entry is simply skipped — it stays absent on both sides.

---

## 7. Header Change

Every page's `<header>` gets one extra element inside `.container`:

```html
<div id="auth-button"></div>
```

`auth.js` mounts Clerk's pre-built sign-in/account button here. CSS positions it to the right of the existing header content.

---

## 8. Firestore Security Rules

Set in the Firebase console before any code ships. Users may only read and write their own profile document:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/profile {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Cross-user reads and unauthenticated writes are rejected. These rules are verified as a dedicated task before the frontend is wired up.

---

## 9. Testing

### Playwright e2e suite (`tests/`)

| File | Scenarios |
|---|---|
| `auth.spec.js` | Sign-in flow renders button; button shows account state after sign-in; sign-out resets button |
| `sync.spec.js` | Save a measurement → verify Firestore document written; sign out → sign in on new page → verify value returned |
| `merge.spec.js` | localStorage newer → local wins; Firestore newer → cloud wins; equal timestamps → local wins; missing on one side → other side preserved |
| `unit-pref.spec.js` | Set unit to inches → sign out → sign in fresh page → unit is still inches |

Tests run against a dedicated **Firebase test project** (free tier). Real user data is never touched.

### GitHub Actions CI (`.github/workflows/e2e.yml`)

- Triggers on every push to `master`
- Clerk test credentials and Firebase test config stored as GitHub Actions secrets (never in code)
- Fails the build if any Playwright test fails

### Review gates in the implementation plan

1. **Firestore security rules checkpoint** — rules written and verified to reject cross-user reads *before* any frontend code is written
2. **Clerk dashboard checkpoint** — allowed domains, sign-in methods, and JWT lifetime confirmed before SDK is loaded
3. **Merge unit tests first** — `merge.spec.js` is written and passes before `onSignIn()` is implemented
4. **Full e2e sign-off** — all four Playwright files must pass before the feature is considered shippable

---

## 10. Out of Scope (this sub-project)

- Account deletion / data export
- Multiple profiles per account
- Social sign-in (Google, GitHub) — Clerk supports it but not wired up here
- Garment 3D models (Sub-project B, separate spec)
