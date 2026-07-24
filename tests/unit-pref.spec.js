const { test, expect } = require('@playwright/test');
const { setupClerkTestingToken } = require('@clerk/testing/playwright');

const EMAIL    = process.env.E2E_CLERK_USER_EMAIL;
const PASSWORD = process.env.E2E_CLERK_USER_PASSWORD;

const FITME_KEYS = [
  'fitme_chest','fitme_waist','fitme_hips','fitme_inseam',
  'fitme_shoulder','fitme_sleeve','fitme_neck','fitme_thigh','fitme_unit'
];

// Signs in via the UI: clicks the header Sign in button, fills the Clerk modal.
// setupClerkTestingToken (called in beforeEach) bypasses bot-detection in headless mode.
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
  // Sign out if currently signed in — preserve Clerk's __clerk_db_jwt so device isn't treated as new
  await page.evaluate(() => { if (window.Clerk && window.Clerk.user) window.Clerk.signOut(); });
  await page.waitForFunction(() => !window.Clerk || !window.Clerk.user, { timeout: 5000 }).catch(() => {});
  await clearFitMeStorage(page);
});

test('unit preference is restored from Firestore on re-sign-in', async ({ page }) => {
  const authErrors = [];
  page.on('console', function(msg) {
    if (msg.type() === 'error' && msg.text().includes('[auth]')) authErrors.push(msg.text());
  });

  // Step A: navigate to chest.html BEFORE sign-in (auth.js loads with the page),
  // sign in, and set unit preference to inches
  await page.goto('/guide/chest.html');
  await signInViaUI(page);
  await waitForUid(page);
  await page.locator('[data-unit="in"]').click();
  await page.waitForTimeout(5000); // wait for Firestore write to settle

  // Step B: sign out and wipe local unit preference
  await page.evaluate(() => window.Clerk.signOut());
  await page.waitForFunction(() => !window.Clerk || !window.Clerk.user, { timeout: 5000 });
  await clearFitMeStorage(page);

  // Step C: sign in again (Clerk may redirect after the modal — auth.js runs on any page
  // so the Firestore merge will still fire wherever Clerk lands)
  await signInViaUI(page);
  // Ensure onSignIn has run again — this triggers Firestore read + merge
  await waitForUid(page);

  // Poll until the merge pushes fitme_unit from Firestore into localStorage
  await page.waitForFunction(
    () => localStorage.getItem('fitme_unit') !== null,
    { timeout: 10000 }
  ).catch(function() {});

  if (authErrors.length) console.log('Auth errors observed:', authErrors.join('; '));

  const unit = await page.evaluate(() => localStorage.getItem('fitme_unit'));
  expect(unit).toBe('in');

  // Navigate to chest.html so loadSavedUnit() reads the merged unit preference
  // and sets aria-pressed="true" on the inches button (handles any Clerk post-sign-in redirect)
  await page.goto('/guide/chest.html');
  // loadSavedUnit() runs synchronously on page load with fitme_unit='in' in localStorage
  await expect(page.locator('[data-unit="in"]')).toHaveAttribute('aria-pressed', 'true');

  // Cleanup: wait for auth to reconnect on chest.html, then reset to cm
  await waitForUid(page);
  await page.locator('[data-unit="cm"]').click();
  await page.waitForTimeout(3000);
});

test('unit preference works end-to-end on all guide pages', async ({ page }) => {
  // Sign in on waist.html and set unit to inches
  await page.goto('/guide/waist.html');
  await signInViaUI(page);
  await waitForUid(page);

  await page.locator('[data-unit="in"]').click();
  await page.waitForTimeout(3000); // wait for Firestore write

  // Navigate to a different guide page — localStorage persists across page navigation
  await page.goto('/guide/hips.html');

  const unit = await page.evaluate(() => localStorage.getItem('fitme_unit'));
  expect(unit).toBe('in');

  // loadSavedUnit() runs on page load and applies the saved unit to the buttons
  await expect(page.locator('[data-unit="in"]')).toHaveAttribute('aria-pressed', 'true');

  // Cleanup: reset to cm
  await page.locator('[data-unit="cm"]').click();
  await page.waitForTimeout(3000);
});
