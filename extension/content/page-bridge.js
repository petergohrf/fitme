// Runs in the page's MAIN world (see manifest) so window.Clerk is directly accessible.
// Posts Clerk auth state to the isolated-world auth-bridge via postMessage.
(function () {
  function sendState() {
    var userId = window.Clerk && window.Clerk.user ? window.Clerk.user.id : null;
    window.postMessage({ type: '__FITME_CLERK__', userId: userId }, '*');
  }

  function waitForClerk(attemptsLeft) {
    if (attemptsLeft <= 0) return; // give up after ~30 seconds
    if (window.Clerk && window.Clerk.loaded) {
      sendState();
      window.Clerk.addListener(sendState);
    } else {
      setTimeout(function () { waitForClerk(attemptsLeft - 1); }, 300);
    }
  }

  waitForClerk(100); // 100 × 300ms = 30 seconds maximum
  // Extra retries in case session restores after Clerk's loaded flag is set
  setTimeout(sendState, 2000);
  setTimeout(sendState, 5000);
})();
