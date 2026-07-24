(function() {
  'use strict';

  // ─── Config — fill in from your Firebase + Clerk dashboards ──────────
  var CLERK_PUBLISHABLE_KEY = 'pk_test_bm90ZWQtYnVjay05Ny5jbGVyay5hY2NvdW50cy5kZXYk';
  var FIREBASE_CONFIG = {
    apiKey:     'AIzaSyCdF6UfLUXyY6uxZDk77Bg9cym3Pnvi9f0',
    authDomain: 'fitme-prod-b672d.firebaseapp.com',
    projectId:  'fitme-prod-b672d',
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
    var btn = document.getElementById('auth-button');

    // Render the sign-in button immediately — before Clerk loads — so
    // something always appears even if the network request takes time.
    function showSignInButton() {
      if (!btn) return;
      btn.innerHTML = '';
      var el = document.createElement('button');
      el.className = 'auth-sign-in-btn';
      el.textContent = 'Sign in';
      // Click handler guards against Clerk not yet loaded
      el.addEventListener('click', function() {
        if (window.Clerk && window.Clerk.loaded) window.Clerk.openSignIn();
      });
      btn.appendChild(el);
    }

    showSignInButton();

    if (!window.Clerk) {
      console.error('[auth] Clerk CDN script did not load');
      return;
    }

    // Clerk v5 CDN: window.Clerk is the singleton initialized via data-clerk-publishable-key
    // on the <script> tag. Call load() to wait for initialization; do NOT use `new window.Clerk()`.
    // Retries up to 3 times with exponential backoff — Clerk's dev FAPI can be slow in CI.
    function loadClerk(attemptsLeft) {
      window.Clerk.load().then(function() {
        // Render auth UI based on the current signed-in state (addListener does not
        // fire retroactively for sessions that exist when the listener is first added).
        function renderAuthUI() {
          if (!btn) return;
          if (window.Clerk.user) {
            btn.innerHTML = '';
            window.Clerk.mountUserButton(btn);
          } else if (!btn.querySelector('.auth-sign-in-btn')) {
            showSignInButton();
          }
        }

        renderAuthUI();

        window.Clerk.addListener(function(resources) {
          var uid = resources.user ? resources.user.id : null;
          renderAuthUI();
          if (uid && uid !== currentUid) {
            onSignIn(uid);
          } else if (!uid) {
            onSignOut();
          }
        });
      }).catch(function(err) {
        console.error('[auth] Clerk init failed:', err);
        if (attemptsLeft > 0) {
          var delay = 2000 * (4 - attemptsLeft); // 2s, 4s, 6s
          setTimeout(function() { loadClerk(attemptsLeft - 1); }, delay);
        }
      });
    }
    loadClerk(3);
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
    _uid: function() { return currentUid; },
  };
})();
