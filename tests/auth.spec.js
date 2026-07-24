const { test, expect } = require('@playwright/test');
const { setupClerkTestingToken } = require('@clerk/testing/playwright');

const EMAIL    = process.env.E2E_CLERK_USER_EMAIL;
const PASSWORD = process.env.E2E_CLERK_USER_PASSWORD;

// Signs in via the UI: clicks the header Sign in button, fills the Clerk modal.
// setupClerkTestingToken (called in beforeEach) bypasses bot-detection in headless mode.
async function signInViaUI(page) {
  // The sign-in button click handler guards on window.Clerk.loaded — wait before clicking.
  await page.waitForFunction(
    () => window.Clerk && window.Clerk.loaded,
    { timeout: 25000 }
  );
  await page.locator('#auth-button .auth-sign-in-btn').click();
  await page.waitForSelector('input[name="identifier"]', { timeout: 10000 });
  await page.fill('input[name="identifier"]', EMAIL);
  await page.locator('.cl-formButtonPrimary').first().click();
  await page.waitForSelector('input[name="password"]', { timeout: 10000 });
  await page.fill('input[name="password"]', PASSWORD);
  await page.locator('.cl-formButtonPrimary').first().click();

  // Clerk may show a "new device" email verification screen in dev mode.
  // Handle it by detecting the OTP input and entering Clerk's dev test code 424242.
  // Clerk v5 CDN renders the OTP as a hidden input[autocomplete="one-time-code"] backed by
  // the input-otp library; pressSequentially fires key events so the library updates its state.
  const verificationInput = page.locator('input[autocomplete="one-time-code"]');
  const appeared = await verificationInput.first().waitFor({ state: 'attached', timeout: 8000 }).then(() => true).catch(() => false);
  if (appeared) {
    await verificationInput.first().pressSequentially('424242');
    // Clerk auto-submits after all 6 digits are entered; the Continue button may already be
    // disabled/detached by the time we reach this line, so ignore errors on the click.
    await page.locator('.cl-formButtonPrimary').first().click({ timeout: 3000 }).catch(() => {});
  }

  // Wait until Clerk confirms the user is set on the JS instance
  await page.waitForFunction(
    () => window.Clerk && window.Clerk.user != null,
    { timeout: 15000 }
  );
}

test.beforeEach(async ({ page }) => {
  await setupClerkTestingToken({ page });
  await page.goto('/');
  // Clear only FitMe keys — preserve Clerk's __clerk_db_jwt so device isn't treated as new
  await page.evaluate(() => {
    ['fitme_chest','fitme_waist','fitme_hips','fitme_inseam',
     'fitme_shoulder','fitme_sleeve','fitme_neck','fitme_thigh','fitme_unit']
    .forEach(function(k) {
      localStorage.removeItem(k);
      localStorage.removeItem(k + '_ts');
    });
  });
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
  await signInViaUI(page);
  await page.reload();
  await expect(page.locator('#auth-button .cl-userButtonTrigger')).toBeVisible({ timeout: 8000 });
});

test('auth button reverts after sign-out', async ({ page }) => {
  await page.goto('/');
  await signInViaUI(page);
  await page.reload();
  // Sign out via Clerk's JS API now that we have a real session
  await page.evaluate(() => window.Clerk.signOut());
  await page.reload();
  await expect(page.locator('#auth-button .cl-userButtonTrigger')).not.toBeVisible({ timeout: 8000 });
});
