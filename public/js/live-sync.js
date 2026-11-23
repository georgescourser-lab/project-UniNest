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
        if (window.UniMarketplace && typeof window.UniMarketplace.syncMarketplaceFromServer === 'function') {
          window.UniMarketplace.syncMarketplaceFromServer();
        }
      }
    };
  }

  window.addEventListener('storage', function (event) {
    if (!event.key || event.key.indexOf('uninest') === 0) {
      notifyLiveChange('cross-tab');
      if (typeof window.__uninestReRenderMarketplace === 'function') {
        window.__uninestReRenderMarketplace();
      }
    }
  });

  function refreshMarketplace() {
    if (window.UniMarketplace && typeof window.UniMarketplace.syncMarketplaceFromServer === 'function') {
      window.UniMarketplace.syncMarketplaceFromServer();
    }
  }

  window.addEventListener('focus', refreshMarketplace);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') refreshMarketplace();
  });
})();
