const { test, expect } = require('@playwright/test');
const { setupClerkTestingToken } = require('@clerk/testing/playwright');

const EMAIL    = process.env.E2E_CLERK_USER_EMAIL;
const PASSWORD = process.env.E2E_CLERK_USER_PASSWORD;

const FITME_KEYS = [
  'fitme_chest','fitme_waist','fitme_hips','fitme_inseam',
  'fitme_shoulder','fitme_sleeve','fitme_neck','fitme_thigh','fitme_unit'
];

async function signInViaUI(page) {
  await page.waitForFunction(() => window.Clerk && window.Clerk.loaded, { timeout: 10000 });
  await page.locator('#auth-button .auth-sign-in-btn').click();
  await page.waitForSelector('input[name="identifier"]', { timeout: 10000 });
  await page.fill('input[name="identifier"]', EMAIL);
  await page.locator('.cl-formButtonPrimary').first().click();
  await page.waitForSelector('input[name="password"]', { timeout: 10000 });
  await page.fill('input[name="password"]', PASSWORD);
  await page.locator('.cl-formButtonPrimary').first().click();
  // Handle OTP if shown — +clerk_test email accepts 424242 as magic code
  // Use state:'attached' not 'visible' — the input uses clip-path so visibility check fails.
  // Use pressSequentially — input-otp tracks key events; fill() bypasses them.
  // Soft-catch the continue button — Clerk auto-submits and detaches the button.
  const otpInput = page.locator('input[autocomplete="one-time-code"]').first();
  const otpAppeared = await otpInput.waitFor({ state: 'attached', timeout: 3000 }).then(() => true).catch(() => false);
  if (otpAppeared) {
    await otpInput.pressSequentially('424242');
    await page.locator('.cl-formButtonPrimary').first().click({ timeout: 3000 }).catch(() => {});
  }
  await page.waitForFunction(() => window.Clerk && window.Clerk.user != null, { timeout: 15000 });
}

// Wait until auth.js's onSignIn has fired and set currentUid.
// window.Clerk.user != null doesn't guarantee the addListener callback has run yet.
async function waitForUid(page) {
  await page.waitForFunction(
    () => window.auth && typeof window.auth._uid === 'function' && window.auth._uid() != null,
    { timeout: 10000 }
  );
}

async function clearFitMeStorage(page) {
  await page.evaluate((keys) => {
    keys.forEach(function(k) { localStorage.removeItem(k); localStorage.removeItem(k + '_ts'); });
  }, FITME_KEYS);
}

test.beforeEach(async ({ page }) => {
  await setupClerkTestingToken({ page });
  await page.goto('/');
  // Sign out if currently signed in
  await page.evaluate(() => { if (window.Clerk && window.Clerk.user) window.Clerk.signOut(); });
  await page.waitForFunction(() => !window.Clerk || !window.Clerk.user, { timeout: 5000 }).catch(() => {});
  await clearFitMeStorage(page);
});

test('saved measurement is restored from Firestore on re-sign-in', async ({ page }) => {
  // Surface any Firestore errors that would otherwise be silently caught
  const authErrors = [];
  page.on('console', function(msg) {
    if (msg.type() === 'error' && msg.text().includes('[auth]')) authErrors.push(msg.text());
  });

  await page.goto('/');
  await signInViaUI(page);
  // Ensure onSignIn has run and currentUid is set before calling syncMeasurement
  await waitForUid(page);
  const ts = Date.now();
  await page.evaluate(function(args) {
    localStorage.setItem('fitme_chest', String(args.value));
    localStorage.setItem('fitme_chest_ts', String(args.ts));
    window.auth.syncMeasurement('fitme_chest', args.value, args.ts);
  }, { value: 92, ts: ts });
  // Wait for Firestore write to settle
  await page.waitForTimeout(5000);

  await page.evaluate(() => window.Clerk.signOut());
  // Guard against window.Clerk being briefly undefined during sign-out
  await page.waitForFunction(() => !window.Clerk || !window.Clerk.user, { timeout: 5000 });
  await clearFitMeStorage(page);

  await signInViaUI(page);
  // Ensure onSignIn has run again (triggers Firestore read + merge)
  await waitForUid(page);
  // Poll until the merge pushes fitme_chest from Firestore into localStorage
  await page.waitForFunction(
    () => localStorage.getItem('fitme_chest') !== null,
    { timeout: 10000 }
  ).catch(function() {
    // Capture auth errors to surface in the assertion failure message
  });

  // Report any auth errors seen during the test before the main assertion
  if (authErrors.length) console.log('Auth errors observed:', authErrors.join('; '));

  const chest = await page.evaluate(() => localStorage.getItem('fitme_chest'));
  expect(chest).toBe('92');

  // Cleanup — reset fitme_chest to avoid stale Firestore value affecting repeat runs
  await page.evaluate(function() {
    var ts = Date.now();
    window.auth.syncMeasurement('fitme_chest', 0, ts);
    localStorage.removeItem('fitme_chest');
    localStorage.removeItem('fitme_chest_ts');
  });
  await page.waitForTimeout(2000);
});

test('cloud value wins when it has a newer timestamp', async ({ page }) => {
  const authErrors = [];
  page.on('console', function(msg) {
    if (msg.type() === 'error' && msg.text().includes('[auth]')) authErrors.push(msg.text());
  });

  await page.goto('/');
  await signInViaUI(page);
  // Ensure onSignIn has run and currentUid is set before calling syncMeasurement
  await waitForUid(page);
  const futureTs = Date.now() + 999999;
  await page.evaluate(function(args) {
    window.auth.syncMeasurement('fitme_waist', args.value, args.ts);
  }, { value: 65, ts: futureTs });
  // Wait for Firestore write to settle
  await page.waitForTimeout(5000);

  await page.evaluate(function() {
    localStorage.setItem('fitme_waist', '80');
    localStorage.setItem('fitme_waist_ts', '1000');
  });
  await page.reload();
  await page.waitForFunction(() => window.Clerk && window.Clerk.user != null, { timeout: 10000 });
  // Ensure onSignIn has run after reload (triggers Firestore read + merge)
  await waitForUid(page);
  // Poll until merge updates fitme_waist from Firestore (changes it away from '80')
  await page.waitForFunction(
    () => localStorage.getItem('fitme_waist') !== '80',
    { timeout: 10000 }
  ).catch(function() {});

  if (authErrors.length) console.log('Auth errors observed:', authErrors.join('; '));

  const waist = await page.evaluate(() => localStorage.getItem('fitme_waist'));
  expect(waist).toBe('65');

  await page.evaluate(function() {
    var ts = Date.now();
    window.auth.syncMeasurement('fitme_waist', 0, ts);
    localStorage.removeItem('fitme_waist');
    localStorage.removeItem('fitme_waist_ts');
  });
  await page.waitForTimeout(2000);
});

test('local value wins when it has a newer timestamp', async ({ page }) => {
  await page.goto('/');
  await signInViaUI(page);
  const oldTs = 1000;
  await page.evaluate(function(args) {
    window.auth.syncMeasurement('fitme_hips', args.value, args.ts);
  }, { value: 80, ts: oldTs });
  await page.waitForTimeout(3000);

  const newTs = Date.now();
  await page.evaluate(function(args) {
    localStorage.setItem('fitme_hips', '97');
    localStorage.setItem('fitme_hips_ts', String(args.ts));
  }, { ts: newTs });
  await page.reload();
  await page.waitForFunction(() => window.Clerk && window.Clerk.user != null, { timeout: 10000 });
  // Ensure onSignIn has run after reload (triggers Firestore read + merge)
  await waitForUid(page);
  // Wait for merge to complete (local value should be preserved / Firestore value is older)
  await page.waitForTimeout(3000);

  const hips = await page.evaluate(() => localStorage.getItem('fitme_hips'));
  expect(hips).toBe('97');

  await page.evaluate(function() {
    var ts = Date.now();
    window.auth.syncMeasurement('fitme_hips', 0, ts);
    localStorage.removeItem('fitme_hips');
    localStorage.removeItem('fitme_hips_ts');
  });
  await page.waitForTimeout(2000);
});
