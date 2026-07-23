const { clerkSetup } = require('@clerk/testing/playwright');

module.exports = async function globalSetup() {
  await clerkSetup({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  });
};
