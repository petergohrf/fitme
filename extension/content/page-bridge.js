// Runs in the page's MAIN world (see manifest) so window.Clerk is directly accessible.
// Posts Clerk auth state to the isolated-world auth-bridge via postMessage.
(function () {
  function sendState() {
    var userId = window.Clerk && window.Clerk.user ? window.Clerk.user.id : null;
    window.postMessage({ type: '__FITME_CLERK__', userId: userId }, '*');
  }

  function waitForClerk(maxAttempts) {
    maxAttempts = maxAttempts || 100;
    return new Promise(function (resolve, reject) {
      function poll(remaining) {
        if (window.Clerk && window.Clerk.loaded) {
          resolve();
          return;
        }
        if (remaining <= 0) {
          reject(new Error('Clerk not found after ' + maxAttempts + ' attempts'));
          return;
        }
        setTimeout(function () { poll(remaining - 1); }, 300);
      }
      poll(maxAttempts);
    });
  }

  waitForClerk(100).then(function () {
    sendState();
    window.Clerk.addListener(sendState);
  }).catch(function () {});
  // Extra retries in case session restores after Clerk's loaded flag is set
  setTimeout(sendState, 2000);
  setTimeout(sendState, 5000);
})();
