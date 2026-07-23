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
    function showSignInButton(clerk) {
      if (!btn) return;
      btn.innerHTML = '';
      var el = document.createElement('button');
      el.className = 'auth-sign-in-btn';
      el.textContent = 'Sign in';
      if (clerk) { el.addEventListener('click', function() { clerk.openSignIn(); }); }
      btn.appendChild(el);
    }

    showSignInButton(null);

    var clerk = new window.Clerk(CLERK_PUBLISHABLE_KEY);
    clerk.load().then(function() {
      // Wire up the click handler now that Clerk is ready
      var el = btn && btn.querySelector('.auth-sign-in-btn');
      if (el) { el.addEventListener('click', function() { clerk.openSignIn(); }); }

      clerk.addListener(function(resources) {
        var uid = resources.user ? resources.user.id : null;
        if (!btn) return;
        if (uid) {
          btn.innerHTML = '';
          clerk.mountUserButton(btn);
        } else if (!btn.querySelector('.auth-sign-in-btn')) {
          showSignInButton(clerk);
        }
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
