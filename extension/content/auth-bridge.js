function waitForClerk(maxMs) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = setInterval(() => {
      if (window.Clerk && window.Clerk.loaded) { clearInterval(check); resolve(window.Clerk); }
      else if (Date.now() - start > maxMs) { clearInterval(check); reject(new Error('Clerk timeout')); }
    }, 300);
  });
}

function sendWithRetry(message, attemptsLeft) {
  chrome.runtime.sendMessage(message, response => {
    if (chrome.runtime.lastError && attemptsLeft > 0) {
      setTimeout(() => sendWithRetry(message, attemptsLeft - 1), 500);
    }
  });
}

function syncUserId(clerk) {
  const userId = clerk.user ? clerk.user.id : null;
  if (userId) {
    sendWithRetry({ type: 'STORE_USER_ID', userId }, 3);
  } else {
    sendWithRetry({ type: 'CLEAR_USER_ID' }, 3);
  }
}

(async () => {
  try {
    const clerk = await waitForClerk(12000);
    syncUserId(clerk);
    clerk.addListener(() => syncUserId(clerk));
  } catch {
    // Clerk did not load — no FitMe account on this page, nothing to do
  }
})();
