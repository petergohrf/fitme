const FAKE_USER_ID = 'fitme-e2e-test-user';

// Canned Firestore response for the fake user:
// bust 92cm, waist 74cm, hips 99cm, inseam 76cm, shoulder 38cm, sleeve 60cm, neck 36cm, thigh 58cm
const FIRESTORE_RESPONSE = {
  name: 'projects/fitme-prod-b672d/databases/(default)/documents/users/' + FAKE_USER_ID,
  fields: {
    fitme_chest:    { mapValue: { fields: { value: { stringValue: '92' } } } },
    fitme_waist:    { mapValue: { fields: { value: { stringValue: '74' } } } },
    fitme_hips:     { mapValue: { fields: { value: { stringValue: '99' } } } },
    fitme_inseam:   { mapValue: { fields: { value: { stringValue: '76' } } } },
    fitme_shoulder: { mapValue: { fields: { value: { stringValue: '38' } } } },
    fitme_sleeve:   { mapValue: { fields: { value: { stringValue: '60' } } } },
    fitme_neck:     { mapValue: { fields: { value: { stringValue: '36' } } } },
    fitme_thigh:    { mapValue: { fields: { value: { stringValue: '58' } } } },
  },
};

async function setupMockAuth(context) {
  // Intercept Firestore calls and return the canned profile
  await context.route(
    '**/firestore.googleapis.com/**',
    route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FIRESTORE_RESPONSE) })
  );

  // Inject the fake userId into chrome.storage via the service worker
  const serviceWorkers = context.serviceWorkers();
  if (serviceWorkers.length > 0) {
    await serviceWorkers[0].evaluate(function (userId) {
      return new Promise(function (resolve) {
        chrome.storage.local.set({ fitme_user_id: userId }, resolve);
      });
    }, FAKE_USER_ID);
  } else {
    // Service worker not yet started — wait for it
    const sw = await context.waitForEvent('serviceworker');
    await sw.evaluate(function (userId) {
      return new Promise(function (resolve) {
        chrome.storage.local.set({ fitme_user_id: userId }, resolve);
      });
    }, FAKE_USER_ID);
  }
}

module.exports = { setupMockAuth, FAKE_USER_ID };
