(function () {
  'use strict';

  const channel = typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('uninest-live-sync')
    : null;

  function notifyLiveChange(source) {
    window.dispatchEvent(new CustomEvent('uninest:live-change', {
      detail: { source: source || 'live-sync' }
    }));
  }

  if (channel) {
    channel.onmessage = function (event) {
      if (event.data && event.data.type === 'uninest-live-change') {
        notifyLiveChange('broadcast');
      }
    };
  }

  try {
    const nativeSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      nativeSetItem.call(this, key, value);
      if (key.indexOf('uninest') === 0) {
        notifyLiveChange('storage');
        if (channel) {
          channel.postMessage({ type: 'uninest-live-change', key: key, at: Date.now() });
        }
      }
    };
  } catch (e) {}

  window.addEventListener('storage', function (event) {
    if (!event.key || event.key.indexOf('uninest') === 0) {
      notifyLiveChange('cross-tab');
    }
  });

  let isPolling = false;
  function refreshMarketplace() {
    if (isPolling) return;
    isPolling = true;
    fetch('/api/marketplace', { cache: 'no-store' })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (data) {
        if (data && Array.isArray(data.items)) {
          try {
            localStorage.setItem('uninest_posted_marketplace_items', JSON.stringify(data.items));
          } catch (e) {}
          notifyLiveChange('server');
          if (typeof window.__uninestReRenderMarketplace === 'function') {
            window.__uninestReRenderMarketplace();
          }
        }
      })
      .catch(function () {})
      .finally(function () { isPolling = false; });
  }

  refreshMarketplace();
  window.setInterval(refreshMarketplace, 8000);
  window.addEventListener('focus', refreshMarketplace);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') refreshMarketplace();
  });
})();
