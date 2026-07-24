const { test, expect } = require('@playwright/test');
const { clerk, setupClerkTestingToken } = require('@clerk/testing/playwright');

const SIGN_IN_PARAMS = {
  strategy: 'password',
  identifier: process.env.E2E_CLERK_USER_EMAIL,
  password:   process.env.E2E_CLERK_USER_PASSWORD,
};

test.beforeEach(async ({ page }) => {
  await setupClerkTestingToken({ page });
  await page.goto('/');
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
