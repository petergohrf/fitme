# Accounts + Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional Clerk sign-in + Firestore measurement sync to FitMe so measurements persist across devices, while keeping the site fully functional without an account.

**Architecture:** One new file (`scripts/auth.js`) owns all Clerk + Firestore logic. A second new file (`scripts/merge-profiles.js`) holds the pure merge function so it can be tested in Node.js before any Clerk/Firebase code exists. Guide pages call two public functions on `window.auth`; they have no direct knowledge of Clerk or Firestore.

**Tech Stack:** Clerk v5 (CDN, vanilla JS), Firebase v10 compat SDK (CDN), Playwright v1.45+ for e2e tests, `@clerk/testing` for programmatic sign-in in tests, GitHub Actions for CI.

## Global Constraints

- Static GitHub Pages — no server, no npm on the deployed site
- Plain HTML/CSS/JS only — no frameworks, no build step for the site itself
- `tests/` directory is the only place npm/Node.js appears — dev-only, never shipped
- Firebase Firestore free tier — one document per user at `users/{uid}`
- Clerk free tier — email/password sign-in, one application
- All measurements stored internally in cm; unit preference stored alongside
- `$0` budget — all CDN and free-tier only
- 1 Three.js unit = 1 cm (existing convention, unchanged)
- Never modify `scripts/mannequin.js` — out of scope

---

## File Map

| File | Change | Responsibility |
|---|---|---|
| `scripts/merge-profiles.js` | Create | Pure merge function — UMD module, testable in Node.js |
| `scripts/auth.js` | Create | Clerk init, Firebase init, sign-in button, merge execution, public sync API |
| `scripts/guide.js` | Modify | Add unit persistence to localStorage + call `window.auth` on save/unit-change |
| `styles/main.css` | Modify | `#auth-button` positioning in both header variants |
| `index.html` | Modify | CDN tags, `merge-profiles.js`, `auth.js`, `#auth-button` div in header |
| `guide/*.html` (×8) | Modify | CDN tags, `merge-profiles.js`, `auth.js`, `#auth-button` div in header |
| `mannequin.html` | Modify | CDN tags, `merge-profiles.js`, `auth.js`, `#auth-button` div in header |
| `tests/package.json` | Create | Playwright + @clerk/testing dev dependencies |
| `tests/playwright.config.js` | Create | Playwright configuration + local server |
| `tests/global-setup.js` | Create | Clerk test environment setup |
| `tests/merge.spec.js` | Create | Pure merge logic tests (Node.js, no browser needed) |
| `tests/auth.spec.js` | Create | Sign-in/sign-out, button visibility on all pages |
| `tests/sync.spec.js` | Create | Measurement save → Firestore → sign out → sign in → verify |
| `tests/unit-pref.spec.js` | Create | Unit preference persists across sign-out/sign-in |
| `.github/workflows/e2e.yml` | Create | GitHub Actions CI runner |

---

### Task 1: Firebase project setup + Firestore security rules
**[GATE 1 — complete this before writing any code]**

**Files:**
- No code files — manual steps in the Firebase console

**Interfaces:**
- Produces: `FIREBASE_CONFIG` object (used in Task 5), security rules live in Firebase console

- [ ] **Step 1: Create production Firebase project**

  Go to https://console.firebase.google.com → "Add project" → name it `fitme-prod` → disable Google Analytics → Create.

- [ ] **Step 2: Enable Firestore on the production project**

  In the Firebase console for `fitme-prod`: Build → Firestore Database → "Create database" → choose "Start in production mode" → select a region close to you (e.g. `us-central1`) → Done.

- [ ] **Step 3: Set Firestore security rules on `fitme-prod`**

  Firestore Database → Rules tab → replace everything with:

  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /users/{uid} {
        allow read, write: if request.auth != null
                           && request.auth.uid == uid;
      }
    }
  }
  ```

  Click "Publish". This allows users to read and write only their own document.

- [ ] **Step 4: Verify rules reject cross-user access**

  In the Rules tab, click "Rules Playground":
  - Method: `get`, Path: `/databases/(default)/documents/users/user-A`
  - Auth: Authenticated, UID: `user-B`
  - Expected result: **DENY** — if it shows "Allow", recheck the rules

- [ ] **Step 5: Copy the production Firebase config**

  Project settings (gear icon) → General → scroll to "Your apps" → "Add app" → Web → register with name `fitme-web` → copy the `firebaseConfig` object. Keep it somewhere safe for Task 5.

  It looks like:
  ```javascript
  var firebaseConfig = {
    apiKey:     "AIzaSy...",
    authDomain: "fitme-prod.firebaseapp.com",
    projectId:  "fitme-prod",
  };
  ```
  (You only need `apiKey`, `authDomain`, `projectId` — ignore the rest.)

- [ ] **Step 6: Create a separate test Firebase project**

  Repeat Steps 1–5 naming the project `fitme-test`. This project receives all test data and can be wiped without affecting real users. Copy its config separately.

---

### Task 2: Clerk dashboard setup
**[GATE 2 — complete this before writing any code]**

**Files:**
- No code files — manual steps in the Clerk dashboard

**Interfaces:**
- Produces: `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, test user credentials (used in Tasks 5, 8–10)

- [ ] **Step 1: Create a Clerk application**

  Go to https://dashboard.clerk.com → "Create application" → name it `FitMe` → enable "Email" sign-in method → Create.

- [ ] **Step 2: Enable email/password authentication**

  User & Authentication → Email, Phone, Username → ensure "Email address" is enabled as an identifier and "Password" is enabled as an authentication factor.

- [ ] **Step 3: Set allowed origins**

  In the Clerk dashboard: Configure → Restrictions → Allowed origins. Add:
  - `http://localhost:8080` (for local Playwright tests)
  - `https://YOUR_GITHUB_USERNAME.github.io` (your GitHub Pages domain)

- [ ] **Step 4: Copy your keys**

  API Keys page:
  - Copy **Publishable key** (starts with `pk_live_` or `pk_test_`) — safe to put in client-side code
  - Copy **Secret key** (starts with `sk_live_` or `sk_test_`) — never put this in code, only in environment variables and GitHub secrets

- [ ] **Step 5: Create a test user**

  Users → "Create user" → set:
  - Email: `fitme-test@example.com`
  - Password: a strong password you'll remember
  - Keep these for environment variables in Tasks 8–10

---

### Task 3: Playwright test infrastructure

**Files:**
- Create: `tests/package.json`
- Create: `tests/playwright.config.js`
- Create: `tests/global-setup.js`
- Create: `tests/.env.example`

**Interfaces:**
- Produces: `npx playwright test` command working from the `tests/` directory

- [ ] **Step 1: Create `tests/package.json`**

  ```json
  {
    "name": "fitme-e2e",
    "private": true,
    "devDependencies": {
      "@playwright/test": "^1.45.0",
      "@clerk/testing": "^1.3.0",
      "dotenv": "^16.0.0"
    }
  }
  ```

- [ ] **Step 2: Install dependencies**

  ```bash
  cd tests
  npm install
  npx playwright install --with-deps chromium
  ```

  Expected: node_modules created, Chromium browser downloaded.

- [ ] **Step 3: Create `tests/.env.example`**

  Document what environment variables are needed (do NOT put real values here):

  ```
  # Clerk — production app keys
  CLERK_PUBLISHABLE_KEY=pk_live_...
  CLERK_SECRET_KEY=sk_live_...

  # Test user credentials (created in Clerk dashboard)
  E2E_CLERK_USER_EMAIL=fitme-test@example.com
  E2E_CLERK_USER_PASSWORD=...

  # Firebase test project config (NOT production)
  FIREBASE_TEST_API_KEY=...
  FIREBASE_TEST_PROJECT_ID=fitme-test
  FIREBASE_TEST_AUTH_DOMAIN=fitme-test.firebaseapp.com
  ```

- [ ] **Step 4: Create a local `tests/.env` file (gitignored)**

  Copy `.env.example` to `.env` and fill in your real values from Tasks 1 and 2. Then add `tests/.env` to `.gitignore`:

  Add this line to the root `.gitignore` (or create one if it doesn't exist):
  ```
  tests/.env
  ```

- [ ] **Step 5: Create `tests/global-setup.js`**

  ```javascript
  const { clerkSetup } = require('@clerk/testing/playwright');

  module.exports = async function globalSetup() {
    await clerkSetup({
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    });
  };
  ```

- [ ] **Step 6: Create `tests/playwright.config.js`**

  ```javascript
  require('dotenv').config({ path: __dirname + '/.env' });
  const { defineConfig, devices } = require('@playwright/test');

  module.exports = defineConfig({
    testDir: '.',
    testMatch: '**/*.spec.js',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: 'html',
    globalSetup: require.resolve('./global-setup.js'),
    use: {
      baseURL: 'http://localhost:8080',
      trace: 'on-first-retry',
    },
    projects: [
      {
        name: 'chromium',
        use: { ...devices['Desktop Chrome'] },
      },
    ],
    webServer: {
      command: 'npx serve .. --listen 8080',
      url: 'http://localhost:8080',
      reuseExistingServer: !process.env.CI,
    },
  });
  ```

  Note: `dotenv` is a dependency of `@clerk/testing` and available transitively; no need to add it explicitly.

- [ ] **Step 7: Verify the config works**

  Run from `tests/`:
  ```bash
  npx playwright test --list
  ```

  Expected: "No tests found" (we haven't written any yet). No errors about missing config.

---

### Task 4: `scripts/merge-profiles.js` + `tests/merge.spec.js`
**[GATE 3 — tests must pass before Task 5 implements `onSignIn()`]**

**Files:**
- Create: `scripts/merge-profiles.js`
- Create: `tests/merge.spec.js`

**Interfaces:**
- Produces: `FitMeMerge.mergeProfiles(localData, firestoreDoc)` → `{ toFirestore, toLocalStorage }`
- Produces: `FitMeMerge.SYNC_KEYS` (array of 9 key strings)
- `localData`: `{ [key]: { value: string|null, ts: number } }` — one entry per SYNC_KEY
- `firestoreDoc`: `{ [key]: { value: any, ts: number } }` or `null` — Firestore document shape
- Returns `toFirestore`: fields where local is newer (push to cloud)
- Returns `toLocalStorage`: fields where cloud is newer (pull to local)

- [ ] **Step 1: Write the failing tests in `tests/merge.spec.js`**

  ```javascript
  const { test, expect } = require('@playwright/test');

  // merge-profiles.js uses UMD — load it for Node.js directly
  const FitMeMerge = require('../scripts/merge-profiles.js');
  const { mergeProfiles, SYNC_KEYS } = FitMeMerge;

  test.describe('mergeProfiles', () => {
    function makeLocal(overrides) {
      const base = {};
      SYNC_KEYS.forEach(function(k) { base[k] = { value: null, ts: 0 }; });
      return Object.assign(base, overrides);
    }

    test('local newer than cloud: local value goes to toFirestore', () => {
      const local = makeLocal({ fitme_chest: { value: '90', ts: 2000 } });
      const cloud = { fitme_chest: { value: 85, ts: 1000 } };

      const result = mergeProfiles(local, cloud);

      expect(result.toFirestore['fitme_chest']).toEqual({ value: '90', ts: 2000 });
      expect(result.toLocalStorage['fitme_chest']).toBeUndefined();
    });

    test('cloud newer than local: cloud value goes to toLocalStorage', () => {
      const local = makeLocal({ fitme_waist: { value: '70', ts: 1000 } });
      const cloud = { fitme_waist: { value: 65, ts: 3000 } };

      const result = mergeProfiles(local, cloud);

      expect(result.toLocalStorage['fitme_waist']).toEqual({ value: 65, ts: 3000 });
      expect(result.toFirestore['fitme_waist']).toBeUndefined();
    });

    test('equal timestamps: local wins (goes to toFirestore)', () => {
      const local = makeLocal({ fitme_hips: { value: '95', ts: 5000 } });
      const cloud = { fitme_hips: { value: 90, ts: 5000 } };

      const result = mergeProfiles(local, cloud);

      expect(result.toFirestore['fitme_hips']).toEqual({ value: '95', ts: 5000 });
      expect(result.toLocalStorage['fitme_hips']).toBeUndefined();
    });

    test('field absent in local, present in cloud: cloud wins', () => {
      const local = makeLocal({}); // fitme_neck has value:null, ts:0
      const cloud = { fitme_neck: { value: 37, ts: 1000 } };

      const result = mergeProfiles(local, cloud);

      expect(result.toLocalStorage['fitme_neck']).toEqual({ value: 37, ts: 1000 });
      expect(result.toFirestore['fitme_neck']).toBeUndefined();
    });

    test('field present in local, absent in cloud: local wins', () => {
      const local = makeLocal({ fitme_thigh: { value: '58', ts: 1000 } });
      const cloud = null;

      const result = mergeProfiles(local, cloud);

      expect(result.toFirestore['fitme_thigh']).toEqual({ value: '58', ts: 1000 });
      expect(result.toLocalStorage['fitme_thigh']).toBeUndefined();
    });

    test('field absent in both: skipped in both outputs', () => {
      const local = makeLocal({});
      const cloud = null;

      const result = mergeProfiles(local, cloud);

      SYNC_KEYS.forEach(function(k) {
        expect(result.toFirestore[k]).toBeUndefined();
        expect(result.toLocalStorage[k]).toBeUndefined();
      });
    });

    test('unit preference treated same as a measurement field', () => {
      const local = makeLocal({ fitme_unit: { value: 'in', ts: 500 } });
      const cloud = { fitme_unit: { value: 'cm', ts: 2000 } };

      const result = mergeProfiles(local, cloud);

      expect(result.toLocalStorage['fitme_unit']).toEqual({ value: 'cm', ts: 2000 });
      expect(result.toFirestore['fitme_unit']).toBeUndefined();
    });
  });
  ```

- [ ] **Step 2: Run the tests — confirm they fail**

  From `tests/`:
  ```bash
  npx playwright test merge.spec.js
  ```

  Expected: all 7 tests fail with `Cannot find module '../scripts/merge-profiles.js'`.

- [ ] **Step 3: Create `scripts/merge-profiles.js`**

  ```javascript
  // UMD wrapper: works as require() in Node.js tests AND as <script> in the browser.
  (function(root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = factory();
    } else {
      root.FitMeMerge = factory();
    }
  }(typeof globalThis !== 'undefined' ? globalThis : this, function() {

    var SYNC_KEYS = [
      'fitme_chest', 'fitme_waist', 'fitme_hips', 'fitme_inseam',
      'fitme_shoulder', 'fitme_sleeve', 'fitme_neck', 'fitme_thigh',
      'fitme_unit',
    ];

    // mergeProfiles compares local and cloud snapshots field by field.
    // localData:    { [key]: { value: string|null, ts: number } }
    // firestoreDoc: { [key]: { value: any, ts: number } } | null
    // Returns:      { toFirestore: {...}, toLocalStorage: {...} }
    //   toFirestore  — fields where local ts >= cloud ts AND local has a value (push up)
    //   toLocalStorage — fields where cloud ts > local ts AND cloud has a value (pull down)
    function mergeProfiles(localData, firestoreDoc) {
      var toFirestore = {};
      var toLocalStorage = {};

      SYNC_KEYS.forEach(function(key) {
        var local = (localData && localData[key]) || { value: null, ts: 0 };
        var cloud = (firestoreDoc && firestoreDoc[key]) || { value: null, ts: 0 };

        if (local.ts >= cloud.ts) {
          if (local.value !== null) {
            toFirestore[key] = { value: local.value, ts: local.ts };
          }
        } else {
          if (cloud.value !== null) {
            toLocalStorage[key] = { value: cloud.value, ts: cloud.ts };
          }
        }
      });

      return { toFirestore: toFirestore, toLocalStorage: toLocalStorage };
    }

    return { mergeProfiles: mergeProfiles, SYNC_KEYS: SYNC_KEYS };
  }));
  ```

- [ ] **Step 4: Run the tests — confirm they all pass**

  ```bash
  npx playwright test merge.spec.js
  ```

  Expected: 7 passed.

- [ ] **Step 5: Commit**

  ```bash
  git add scripts/merge-profiles.js tests/merge.spec.js tests/package.json tests/playwright.config.js tests/global-setup.js tests/.env.example
  git commit -m "feat: add merge-profiles logic with passing tests and Playwright setup"
  ```

---

### Task 5: `scripts/auth.js`

**Files:**
- Create: `scripts/auth.js`

**Interfaces:**
- Consumes: `window.FitMeMerge` (from `scripts/merge-profiles.js` loaded before this file)
- Consumes: `window.firebase` (Firebase compat SDK loaded before this file)
- Consumes: `window.Clerk` (Clerk JS SDK loaded before this file)
- Consumes: DOM element `#auth-button` (present on every page — added in Task 6)
- Produces: `window.auth.syncMeasurement(key, value, ts)` called by guide.js
- Produces: `window.auth.syncUnit(unit, ts)` called by guide.js
- Produces: `window.auth._mergeProfiles` (exposed for Playwright tests)

- [ ] **Step 1: Create `scripts/auth.js`**

  Replace `pk_live_YOUR_CLERK_PUBLISHABLE_KEY`, `YOUR_FIREBASE_API_KEY`, `YOUR_PROJECT.firebaseapp.com`, and `YOUR_PROJECT_ID` with the values you copied in Tasks 1 and 2.

  ```javascript
  (function() {
    'use strict';

    // ─── Config — fill in from your Firebase + Clerk dashboards ──────────
    var CLERK_PUBLISHABLE_KEY = 'pk_live_YOUR_CLERK_PUBLISHABLE_KEY';
    var FIREBASE_CONFIG = {
      apiKey:     'YOUR_FIREBASE_API_KEY',
      authDomain: 'YOUR_PROJECT.firebaseapp.com',
      projectId:  'YOUR_PROJECT_ID',
    };

    var mergeProfiles = window.FitMeMerge.mergeProfiles;
    var SYNC_KEYS     = window.FitMeMerge.SYNC_KEYS;

    var db         = null;
    var currentUid = null;

    // ─── localStorage snapshot ────────────────────────────────────────
    function getLocalSnapshot() {
      var snapshot = {};
      SYNC_KEYS.forEach(function(key) {
        snapshot[key] = {
          value: localStorage.getItem(key),
          ts:    parseInt(localStorage.getItem(key + '_ts') || '0', 10),
        };
      });
      return snapshot;
    }

    // ─── Firestore helpers ────────────────────────────────────────────
    function userDoc(uid) {
      return db.collection('users').doc(uid);
    }

    function writeFields(uid, fields) {
      if (!db || !uid) return;
      userDoc(uid).set(fields, { merge: true }).catch(function(err) {
        console.error('[auth] Firestore write failed:', err);
      });
    }

    // ─── Sign-in: run merge then keep uid for future writes ──────────
    function onSignIn(uid) {
      currentUid = uid;
      userDoc(uid).get().then(function(snap) {
        var firestoreDoc = snap.exists ? snap.data() : null;
        var result = mergeProfiles(getLocalSnapshot(), firestoreDoc);

        Object.keys(result.toLocalStorage).forEach(function(key) {
          var entry = result.toLocalStorage[key];
          localStorage.setItem(key, String(entry.value));
          localStorage.setItem(key + '_ts', String(entry.ts));
        });

        if (Object.keys(result.toFirestore).length > 0) {
          writeFields(uid, result.toFirestore);
        }
      }).catch(function(err) {
        console.error('[auth] Firestore read on sign-in failed:', err);
      });
    }

    function onSignOut() {
      currentUid = null;
    }

    // ─── Firebase init ────────────────────────────────────────────────
    function initFirebase() {
      firebase.initializeApp(FIREBASE_CONFIG);
      db = firebase.firestore();
    }

    // ─── Clerk init ───────────────────────────────────────────────────
    function initClerk() {
      var clerk = new window.Clerk(CLERK_PUBLISHABLE_KEY);
      clerk.load().then(function() {
        var btn = document.getElementById('auth-button');
        if (btn) {
          clerk.mountUserButton(btn);
        }
        clerk.addListener(function(resources) {
          var uid = resources.user ? resources.user.id : null;
          if (uid && uid !== currentUid) {
            onSignIn(uid);
          } else if (!uid) {
            onSignOut();
          }
        });
      }).catch(function(err) {
        console.error('[auth] Clerk init failed:', err);
      });
    }

    // ─── Auto-init ────────────────────────────────────────────────────
    try {
      initFirebase();
      initClerk();
    } catch (err) {
      console.error('[auth] Failed to start:', err);
    }

    // ─── Public API ───────────────────────────────────────────────────
    window.auth = {
      syncMeasurement: function(key, value, ts) {
        if (!currentUid) return;
        var fields = {};
        fields[key] = { value: value, ts: ts };
        writeFields(currentUid, fields);
      },

      syncUnit: function(unit, ts) {
        if (!currentUid) return;
        writeFields(currentUid, { fitme_unit: { value: unit, ts: ts } });
      },

      // Internal — used by Playwright tests only
      _mergeProfiles: mergeProfiles,
      _getLocalSnapshot: getLocalSnapshot,
    };
  })();
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add scripts/auth.js
  git commit -m "feat: add auth.js with Clerk + Firestore init and sync API"
  ```

---

### Task 6: Header `#auth-button` div + CSS on all pages

**Files:**
- Modify: `index.html`
- Modify: `guide/chest.html`, `guide/waist.html`, `guide/hips.html`, `guide/inseam.html`, `guide/shoulder.html`, `guide/sleeve.html`, `guide/neck.html`, `guide/thigh.html`
- Modify: `mannequin.html`
- Modify: `styles/main.css`

**Interfaces:**
- Produces: `<div id="auth-button">` in every page's header, targeted by `auth.js`'s `clerk.mountUserButton()`
- Consumes (produces for): `window.auth` which is available after scripts load

- [ ] **Step 1: Add CSS to `styles/main.css`**

  Append after the existing `.guide-nav-next:hover` block:

  ```css
  /* ─── Auth button in header ──────────────────────────────── */

  .site-header .container,
  .guide-header .container {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .guide-header .container h1 {
    flex: 1;
    min-width: 0;
  }

  #auth-button {
    margin-left: auto;
    flex-shrink: 0;
  }
  ```

- [ ] **Step 2: Add CDN script tags + `#auth-button` to `index.html`**

  In `<head>`, add Firebase and Clerk scripts immediately before `</head>`:

  ```html
    <!-- Firebase compat SDK -->
    <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"></script>
    <!-- Clerk JS -->
    <script src="https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js" type="text/javascript"></script>
  ```

  In `<header class="site-header">`, add `#auth-button` after `<span class="wordmark">FitMe</span>`:

  ```html
  <header class="site-header">
    <div class="container">
      <span class="wordmark">FitMe</span>
      <div id="auth-button"></div>
    </div>
  </header>
  ```

  Before the closing `</body>` tag (after the existing inline script), add:

  ```html
    <script src="scripts/merge-profiles.js"></script>
    <script src="scripts/auth.js"></script>
  ```

- [ ] **Step 3: Add to all 8 guide pages**

  Each guide page lives in `guide/` so paths are `../` relative. Apply the same three changes to `guide/chest.html`, `guide/waist.html`, `guide/hips.html`, `guide/inseam.html`, `guide/shoulder.html`, `guide/sleeve.html`, `guide/neck.html`, `guide/thigh.html`.

  In `<head>` (before `</head>`):
  ```html
    <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js" type="text/javascript"></script>
  ```

  In `<header class="guide-header">` — add `#auth-button` after the `<h1>`:
  ```html
  <header class="guide-header">
    <div class="container">
      <a class="back-link" href="../index.html">&larr; FitMe</a>
      <h1>EXISTING_PAGE_TITLE</h1>
      <div id="auth-button"></div>
    </div>
  </header>
  ```

  Before `</body>` — add after the existing `<script src="../scripts/guide.js"></script>`:
  ```html
    <script src="../scripts/merge-profiles.js"></script>
    <script src="../scripts/auth.js"></script>
  ```

- [ ] **Step 4: Add to `mannequin.html`**

  In `<head>` (before `</head>`):
  ```html
    <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js" type="text/javascript"></script>
  ```

  In `<header class="guide-header">` — add after `<h1>Your Mannequin</h1>`:
  ```html
      <div id="auth-button"></div>
  ```

  Before `</body>` — add after the existing `<script src="scripts/mannequin.js"></script>`:
  ```html
    <script src="scripts/merge-profiles.js"></script>
    <script src="scripts/auth.js"></script>
  ```

- [ ] **Step 5: Open `index.html` in a browser and verify**

  Load the page without being signed in. Expected:
  - Layout is unchanged (wordmark left, auth button area right)
  - Clerk's sign-in button (a small sign-in link or button) appears in the top-right of the header
  - No console errors about Firebase or Clerk
  - Existing measurements list and mannequin link work as before

- [ ] **Step 6: Commit**

  ```bash
  git add index.html guide/chest.html guide/waist.html guide/hips.html guide/inseam.html guide/shoulder.html guide/sleeve.html guide/neck.html guide/thigh.html mannequin.html styles/main.css
  git commit -m "feat: add auth button to all page headers and Firebase/Clerk CDN scripts"
  ```

---

### Task 7: `scripts/guide.js` — unit persistence + auth sync calls

**Files:**
- Modify: `scripts/guide.js`

**Interfaces:**
- Consumes: `window.auth.syncMeasurement(key, value, ts)` — called after each localStorage save (guard with `if (window.auth)` so pages without auth.js still work)
- Consumes: `window.auth.syncUnit(unit, ts)` — called when unit changes
- Produces: `fitme_unit` and `fitme_unit_ts` in localStorage (new — not persisted before)

- [ ] **Step 1: Add unit persistence + auth call to `setUnit()`**

  Find the `setUnit(unit)` function. It currently ends after updating the input value. Add three lines at the end of the function body, before the closing `}`:

  ```javascript
  function setUnit(unit) {
    var previousUnit = currentUnit;
    currentUnit = unit;

    unitButtons.forEach(function(button) {
      var isSelected = button.dataset.unit === unit;
      button.setAttribute('aria-pressed', String(isSelected));
    });

    measurementInputLabel.textContent = config.measurementName + ' (' + unit + ')';

    var currentValue = parseFloat(measurementInput.value);
    if (!Number.isNaN(currentValue)) {
      var converted = currentValue;
      if (unit === 'in' && previousUnit === 'cm') {
        converted = currentValue / CM_PER_INCH;
      } else if (unit === 'cm' && previousUnit === 'in') {
        converted = currentValue * CM_PER_INCH;
      }
      measurementInput.value = Math.round(converted * 10) / 10;
    }

    // Persist unit preference and sync to Firestore
    var ts = Date.now();
    localStorage.setItem('fitme_unit', unit);
    localStorage.setItem('fitme_unit_ts', String(ts));
    if (window.auth) { window.auth.syncUnit(unit, ts); }
  }
  ```

- [ ] **Step 2: Add timestamp write + auth call to `saveMeasurement()`**

  Find the line `localStorage.setItem(config.storageKey, String(valueInCm));` and replace the entire try/catch block:

  ```javascript
  var ts = Date.now();
  try {
    localStorage.setItem(config.storageKey, String(valueInCm));
    localStorage.setItem(config.storageKey + '_ts', String(ts));
  } catch (error) {
    showError("Couldn't save — your browser may be blocking storage.");
    return;
  }

  if (window.auth) { window.auth.syncMeasurement(config.storageKey, valueInCm, ts); }
  ```

- [ ] **Step 3: Add `loadSavedUnit()` before `loadSavedMeasurement()`**

  Find the line `loadSavedMeasurement();` at the bottom of guide.js. Add the new function and call it first:

  ```javascript
  function loadSavedUnit() {
    var saved = localStorage.getItem('fitme_unit');
    if (saved === 'cm' || saved === 'in') {
      setUnit(saved);
    }
  }

  loadSavedUnit();
  loadSavedMeasurement();
  renderNav();
  ```

  (Remove the standalone `loadSavedMeasurement();` and `renderNav();` calls that were already there — they're now in the block above.)

- [ ] **Step 4: Verify unit preference persists without auth**

  Open `guide/chest.html` in the browser. Toggle to "in". Reload the page.
  Expected: "in" is still selected and the "Last saved" value converts correctly. No console errors.

- [ ] **Step 5: Commit**

  ```bash
  git add scripts/guide.js
  git commit -m "feat: persist unit preference to localStorage and call auth sync on save"
  ```

---

### Task 8: `tests/auth.spec.js`

**Files:**
- Create: `tests/auth.spec.js`

**Interfaces:**
- Consumes: `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `E2E_CLERK_USER_EMAIL`, `E2E_CLERK_USER_PASSWORD` from `.env`
- Consumes: `#auth-button` DOM element on every page
- Consumes: `clerk.signIn()` / `clerk.signOut()` from `@clerk/testing/playwright`

- [ ] **Step 1: Create `tests/auth.spec.js`**

  ```javascript
  const { test, expect } = require('@playwright/test');
  const { clerk } = require('@clerk/testing/playwright');

  const SIGN_IN_PARAMS = {
    strategy: 'password',
    identifier: process.env.E2E_CLERK_USER_EMAIL,
    password:   process.env.E2E_CLERK_USER_PASSWORD,
  };

  test.beforeEach(async ({ page }) => {
    await clerk.signOut({ page });
    await page.evaluate(() => localStorage.clear());
  });

  test('auth button is visible on homepage when logged out', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#auth-button')).toBeVisible();
  });

  test('auth button is visible on a guide page when logged out', async ({ page }) => {
    await page.goto('/guide/chest.html');
    await expect(page.locator('#auth-button')).toBeVisible();
  });

  test('auth button is visible on mannequin page when logged out', async ({ page }) => {
    await page.goto('/mannequin.html');
    await expect(page.locator('#auth-button')).toBeVisible();
  });

  test('auth button shows user avatar after sign-in', async ({ page }) => {
    await page.goto('/');
    await clerk.signIn({ page, signInParams: SIGN_IN_PARAMS });
    await page.reload();
    // Clerk's UserButton renders a button with class cl-userButtonTrigger when signed in
    await expect(page.locator('#auth-button .cl-userButtonTrigger')).toBeVisible({ timeout: 8000 });
  });

  test('auth button reverts after sign-out', async ({ page }) => {
    await page.goto('/');
    await clerk.signIn({ page, signInParams: SIGN_IN_PARAMS });
    await page.reload();
    await clerk.signOut({ page });
    await page.reload();
    // After sign-out, UserButton is gone; Clerk renders a sign-in element instead
    await expect(page.locator('#auth-button .cl-userButtonTrigger')).not.toBeVisible({ timeout: 8000 });
  });
  ```

- [ ] **Step 2: Run auth tests**

  From `tests/`:
  ```bash
  npx playwright test auth.spec.js
  ```

  Expected: all 5 tests pass. If Clerk CSS class names differ, inspect the rendered DOM with `npx playwright test --headed` and adjust the selector.

- [ ] **Step 3: Commit**

  ```bash
  git add tests/auth.spec.js
  git commit -m "test: add auth.spec.js for sign-in/sign-out button visibility"
  ```

---

### Task 9: `tests/sync.spec.js`

**Files:**
- Create: `tests/sync.spec.js`

**Interfaces:**
- Consumes: `window.auth.syncMeasurement()` (Task 5) via `page.evaluate()`
- Consumes: Clerk test credentials for sign-in/sign-out
- Verifies: Firestore writes and cross-device pull on re-sign-in

- [ ] **Step 1: Create `tests/sync.spec.js`**

  ```javascript
  const { test, expect } = require('@playwright/test');
  const { clerk } = require('@clerk/testing/playwright');

  const SIGN_IN_PARAMS = {
    strategy: 'password',
    identifier: process.env.E2E_CLERK_USER_EMAIL,
    password:   process.env.E2E_CLERK_USER_PASSWORD,
  };

  test.beforeEach(async ({ page }) => {
    await clerk.signOut({ page });
    await page.evaluate(() => localStorage.clear());
  });

  test('saved measurement is restored from Firestore on re-sign-in', async ({ page }) => {
    // Step A: sign in, save a measurement, wait for Firestore write
    await page.goto('/');
    await clerk.signIn({ page, signInParams: SIGN_IN_PARAMS });
    const ts = Date.now();
    await page.evaluate(function(args) {
      localStorage.setItem('fitme_chest', String(args.value));
      localStorage.setItem('fitme_chest_ts', String(args.ts));
      window.auth.syncMeasurement('fitme_chest', args.value, args.ts);
    }, { value: 92, ts: ts });
    await page.waitForTimeout(3000); // wait for Firestore write to settle

    // Step B: sign out, clear localStorage
    await clerk.signOut({ page });
    await page.evaluate(() => localStorage.clear());

    // Step C: sign back in — merge should pull the value from Firestore
    await clerk.signIn({ page, signInParams: SIGN_IN_PARAMS });
    await page.waitForTimeout(3000); // wait for merge to complete

    const chest = await page.evaluate(() => localStorage.getItem('fitme_chest'));
    expect(chest).toBe('92');
  });

  test('cloud value wins when it has a newer timestamp', async ({ page }) => {
    // Push a value with a far-future timestamp to Firestore
    await page.goto('/');
    await clerk.signIn({ page, signInParams: SIGN_IN_PARAMS });
    const futureTs = Date.now() + 999999;
    await page.evaluate(function(args) {
      window.auth.syncMeasurement('fitme_waist', args.value, args.ts);
    }, { value: 65, ts: futureTs });
    await page.waitForTimeout(3000);

    // Now set an older local value and reload — merge should prefer Firestore
    await page.evaluate(function() {
      localStorage.setItem('fitme_waist', '80');
      localStorage.setItem('fitme_waist_ts', '1000');
    });
    await page.reload();
    await page.waitForTimeout(3000);

    const waist = await page.evaluate(() => localStorage.getItem('fitme_waist'));
    expect(waist).toBe('65');

    // Cleanup — reset waist to a known value with current timestamp
    await page.evaluate(function() {
      var ts = Date.now();
      window.auth.syncMeasurement('fitme_waist', 0, ts);
      localStorage.removeItem('fitme_waist');
      localStorage.removeItem('fitme_waist_ts');
    });
    await page.waitForTimeout(2000);
  });

  test('local value wins when it has a newer timestamp', async ({ page }) => {
    // Push an old value to Firestore
    await page.goto('/');
    await clerk.signIn({ page, signInParams: SIGN_IN_PARAMS });
    const oldTs = 1000;
    await page.evaluate(function(args) {
      window.auth.syncMeasurement('fitme_hips', args.value, args.ts);
    }, { value: 80, ts: oldTs });
    await page.waitForTimeout(3000);

    // Set a newer local value, reload — local should win
    const newTs = Date.now();
    await page.evaluate(function(args) {
      localStorage.setItem('fitme_hips', '97');
      localStorage.setItem('fitme_hips_ts', String(args.ts));
    }, { ts: newTs });
    await page.reload();
    await page.waitForTimeout(3000);

    const hips = await page.evaluate(() => localStorage.getItem('fitme_hips'));
    expect(hips).toBe('97');

    // Cleanup
    await page.evaluate(function() {
      var ts = Date.now();
      window.auth.syncMeasurement('fitme_hips', 0, ts);
      localStorage.removeItem('fitme_hips');
      localStorage.removeItem('fitme_hips_ts');
    });
    await page.waitForTimeout(2000);
  });
  ```

- [ ] **Step 2: Run sync tests**

  ```bash
  npx playwright test sync.spec.js
  ```

  Expected: 3 tests pass. These write to your `fitme-prod` Firestore — after testing, verify data appears in the Firebase console under `users/{yourTestUid}`.

- [ ] **Step 3: Commit**

  ```bash
  git add tests/sync.spec.js
  git commit -m "test: add sync.spec.js for Firestore read/write and merge e2e"
  ```

---

### Task 10: `tests/unit-pref.spec.js`

**Files:**
- Create: `tests/unit-pref.spec.js`

**Interfaces:**
- Consumes: `[data-unit="in"]` button in guide pages (existing DOM element)
- Consumes: `window.auth.syncUnit()` (Task 5) — called automatically by guide.js `setUnit()`
- Verifies: unit preference round-trips through Firestore

- [ ] **Step 1: Create `tests/unit-pref.spec.js`**

  ```javascript
  const { test, expect } = require('@playwright/test');
  const { clerk } = require('@clerk/testing/playwright');

  const SIGN_IN_PARAMS = {
    strategy: 'password',
    identifier: process.env.E2E_CLERK_USER_EMAIL,
    password:   process.env.E2E_CLERK_USER_PASSWORD,
  };

  test.beforeEach(async ({ page }) => {
    await clerk.signOut({ page });
    await page.evaluate(() => localStorage.clear());
  });

  test('unit preference is restored from Firestore on re-sign-in', async ({ page }) => {
    // Step A: sign in, set unit to inches on a guide page
    await page.goto('/guide/chest.html');
    await clerk.signIn({ page, signInParams: SIGN_IN_PARAMS });
    await page.locator('[data-unit="in"]').click();
    await page.waitForTimeout(3000); // wait for Firestore write

    // Step B: sign out, clear localStorage
    await clerk.signOut({ page });
    await page.evaluate(() => localStorage.clear());

    // Step C: sign in on fresh page load — unit should be restored to inches
    await page.goto('/guide/chest.html');
    await clerk.signIn({ page, signInParams: SIGN_IN_PARAMS });
    await page.waitForTimeout(3000); // wait for merge to apply

    // guide.js loadSavedUnit() runs on load; after merge fitme_unit should be 'in'
    const unit = await page.evaluate(() => localStorage.getItem('fitme_unit'));
    expect(unit).toBe('in');

    // The 'in' button should reflect the restored preference
    await expect(page.locator('[data-unit="in"]')).toHaveAttribute('aria-pressed', 'true');

    // Cleanup — reset to cm
    await page.locator('[data-unit="cm"]').click();
    await page.waitForTimeout(2000);
  });

  test('unit preference works end-to-end on all guide pages', async ({ page }) => {
    await page.goto('/guide/waist.html');
    await clerk.signIn({ page, signInParams: SIGN_IN_PARAMS });
    await page.locator('[data-unit="in"]').click();
    await page.waitForTimeout(2000);

    // Navigate to a different guide page — unit should persist via localStorage
    await page.goto('/guide/hips.html');
    const unit = await page.evaluate(() => localStorage.getItem('fitme_unit'));
    expect(unit).toBe('in');
    await expect(page.locator('[data-unit="in"]')).toHaveAttribute('aria-pressed', 'true');

    // Cleanup
    await page.locator('[data-unit="cm"]').click();
    await page.waitForTimeout(2000);
  });
  ```

- [ ] **Step 2: Run unit-pref tests**

  ```bash
  npx playwright test unit-pref.spec.js
  ```

  Expected: 2 tests pass.

- [ ] **Step 3: Run the full test suite**

  ```bash
  npx playwright test
  ```

  Expected: all tests in merge.spec.js, auth.spec.js, sync.spec.js, unit-pref.spec.js pass (12 tests total). This is the Gate 4 sign-off.

- [ ] **Step 4: Commit**

  ```bash
  git add tests/unit-pref.spec.js
  git commit -m "test: add unit-pref.spec.js for unit preference Firestore sync"
  ```

---

### Task 11: GitHub Actions CI
**[GATE 4 — all tests must pass locally before wiring up CI]**

**Files:**
- Create: `.github/workflows/e2e.yml`

**Interfaces:**
- Consumes: GitHub Actions secrets (set in repo Settings → Secrets and variables → Actions)
- Triggers: on every push to `master`

- [ ] **Step 1: Add all secrets to GitHub**

  In your GitHub repo → Settings → Secrets and variables → Actions → "New repository secret". Add one secret per line from your `.env` file:

  | Secret name | Value |
  |---|---|
  | `CLERK_PUBLISHABLE_KEY` | your pk_live_... key |
  | `CLERK_SECRET_KEY` | your sk_live_... key |
  | `E2E_CLERK_USER_EMAIL` | fitme-test@example.com |
  | `E2E_CLERK_USER_PASSWORD` | the test user's password |
  | `FIREBASE_TEST_API_KEY` | from fitme-test project |
  | `FIREBASE_TEST_PROJECT_ID` | fitme-test |
  | `FIREBASE_TEST_AUTH_DOMAIN` | fitme-test.firebaseapp.com |

- [ ] **Step 2: Create `.github/workflows/e2e.yml`**

  ```yaml
  name: E2E Tests

  on:
    push:
      branches: [master]
    pull_request:
      branches: [master, main]

  jobs:
    test:
      runs-on: ubuntu-latest

      steps:
        - uses: actions/checkout@v4

        - uses: actions/setup-node@v4
          with:
            node-version: '20'
            cache: 'npm'
            cache-dependency-path: tests/package-lock.json

        - name: Install Playwright dependencies
          working-directory: tests
          run: npm ci

        - name: Install Playwright browsers
          working-directory: tests
          run: npx playwright install --with-deps chromium

        - name: Run e2e tests
          working-directory: tests
          env:
            CI: true
            CLERK_PUBLISHABLE_KEY: ${{ secrets.CLERK_PUBLISHABLE_KEY }}
            CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
            E2E_CLERK_USER_EMAIL: ${{ secrets.E2E_CLERK_USER_EMAIL }}
            E2E_CLERK_USER_PASSWORD: ${{ secrets.E2E_CLERK_USER_PASSWORD }}
            FIREBASE_TEST_API_KEY: ${{ secrets.FIREBASE_TEST_API_KEY }}
            FIREBASE_TEST_PROJECT_ID: ${{ secrets.FIREBASE_TEST_PROJECT_ID }}
            FIREBASE_TEST_AUTH_DOMAIN: ${{ secrets.FIREBASE_TEST_AUTH_DOMAIN }}
          run: npx playwright test

        - uses: actions/upload-artifact@v4
          if: failure()
          with:
            name: playwright-report
            path: tests/playwright-report/
            retention-days: 7
  ```

  Note: `auth.js` uses `FIREBASE_CONFIG` hardcoded — for CI, the tests run against your production Firebase project (using production keys from Task 1, hardcoded in auth.js). The test Firebase project is only used if you later parameterise `auth.js` via environment injection. For now, the tests write to and read from the production project using the test user account.

- [ ] **Step 3: Commit and push**

  ```bash
  git add .github/workflows/e2e.yml
  git commit -m "ci: add GitHub Actions e2e workflow with Playwright"
  git push origin master
  ```

- [ ] **Step 4: Verify CI passes**

  Go to your GitHub repo → Actions tab. Find the "E2E Tests" workflow run triggered by your push. Expected: green checkmark, all tests pass.

  If a test fails in CI but passes locally, check:
  1. Secrets are set correctly (names must match exactly)
  2. Allowed origins in Clerk include `http://localhost:8080` (CI uses that)
  3. The playwright-report artifact shows which test failed and why
