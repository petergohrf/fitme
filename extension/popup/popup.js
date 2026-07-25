const FITME_HOST = 'https://petergohrf.github.io/fitme';

async function getUserId() {
  return new Promise(resolve =>
    chrome.runtime.sendMessage({ type: 'GET_USER_ID' }, r => resolve(r?.userId || null))
  );
}

async function init() {
  const userId = await getUserId();
  if (userId) {
    document.getElementById('signed-out').classList.add('hidden');
    document.getElementById('signed-in').classList.remove('hidden');
  }
}

document.getElementById('sign-in-btn').addEventListener('click', () => {
  chrome.tabs.create({ url: FITME_HOST });
  window.close();
});

document.getElementById('sign-out-btn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'CLEAR_USER_ID' }, () => {
    document.getElementById('signed-in').classList.add('hidden');
    document.getElementById('signed-out').classList.remove('hidden');
  });
});

init();
