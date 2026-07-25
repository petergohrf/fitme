// Inject a script into the page's own JavaScript context so it can read
// window.Clerk directly (content scripts run in an isolated world and cannot
// reliably access page-script objects like Clerk across that boundary).
function injectPageBridge() {
  const script = document.createElement('script');
  script.textContent = `(function () {
    function sendState() {
      var userId = window.Clerk && window.Clerk.user ? window.Clerk.user.id : null;
      window.postMessage({ type: '__FITME_CLERK__', userId: userId }, '*');
    }

    function waitForClerk() {
      if (window.Clerk && window.Clerk.loaded) {
        sendState();
        window.Clerk.addListener(sendState);
      } else {
        setTimeout(waitForClerk, 300);
      }
    }

    waitForClerk();
    // Extra retries to catch session restoration after Clerk loads
    setTimeout(sendState, 2000);
    setTimeout(sendState, 5000);
  })();`;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
}

function sendWithRetry(message, attemptsLeft) {
  chrome.runtime.sendMessage(message, function () {
    if (chrome.runtime.lastError && attemptsLeft > 0) {
      setTimeout(function () { sendWithRetry(message, attemptsLeft - 1); }, 500);
    }
  });
}

// Listen for Clerk state posted from the injected page script
window.addEventListener('message', function (event) {
  if (event.source !== window) return;
  if (!event.data || event.data.type !== '__FITME_CLERK__') return;
  var userId = event.data.userId;
  if (userId) {
    sendWithRetry({ type: 'STORE_USER_ID', userId: userId }, 3);
  } else {
    sendWithRetry({ type: 'CLEAR_USER_ID' }, 3);
  }
});

injectPageBridge();
