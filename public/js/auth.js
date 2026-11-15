// ============================================================================
// UniNest Universal Authentication & Session Manager (Google OAuth Only)
// ============================================================================

(function () {
  'use strict';

  const STORAGE_KEY_USER = 'uninest_user';
  const CLIENT_COOKIE_NAME = 'uninest_user_client';
  const SESSION_COOKIE_NAME = 'uninest_user_session';

  let currentUser = null;
  let pendingAction = null;

  function getStoredUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_USER);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.email) {
          return {
            id: parsed.id,
            email: parsed.email,
            name: parsed.name || parsed.email.split('@')[0],
            user_metadata: {
              full_name: parsed.name || parsed.email.split('@')[0],
              display_name: parsed.name || parsed.email.split('@')[0],
            },
          };
        }
      }
    } catch (e) {}

    try {
      const cookies = document.cookie.split(';');
      for (const c of cookies) {
        const [k, v] = c.trim().split('=');
        if ((k === CLIENT_COOKIE_NAME || k === SESSION_COOKIE_NAME) && v) {
          const parsed = JSON.parse(decodeURIComponent(v));
          if (parsed && parsed.email) {
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(parsed));
            return {
              id: parsed.id,
              email: parsed.email,
              name: parsed.name || parsed.email.split('@')[0],
              user_metadata: {
                full_name: parsed.name || parsed.email.split('@')[0],
                display_name: parsed.name || parsed.email.split('@')[0],
              },
            };
          }
        }
      }
    } catch (e) {}

    return null;
  }

  function setStoredUser(user) {
    if (!user || !user.email) return;
    const payload = {
      id: user.id || 'user_' + Date.now(),
      email: user.email.toLowerCase(),
      name:
        user.name ||
        user.user_metadata?.full_name ||
        user.email.split('@')[0],
      createdAt: Date.now(),
    };
    currentUser = payload;
    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(payload));
      const encoded = encodeURIComponent(JSON.stringify(payload));
      document.cookie = `${CLIENT_COOKIE_NAME}=${encoded}; path=/; max-age=2592000; SameSite=Lax`;
      document.cookie = `${SESSION_COOKIE_NAME}=${encoded}; path=/; max-age=2592000; SameSite=Lax`;
    } catch (e) {}
    updateNavbarAuthUI();
    renderNavActions();
  }

  function clearStoredUser() {
    currentUser = null;
    try {
      localStorage.removeItem(STORAGE_KEY_USER);
      document.cookie = `${CLIENT_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
      document.cookie = `${SESSION_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
    } catch (e) {}
    updateNavbarAuthUI();
    renderNavActions();
  }

  function isAuthenticated() {
    const u = getStoredUser();
    currentUser = u;
    return !!u;
  }

  function showToast(message, type = 'info') {
    const existing = document.getElementById('uni-auth-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'uni-auth-toast';
    const bg =
      type === 'error'
        ? '#dc2626'
        : type === 'success'
        ? '#16a34a'
        : '#0f172a';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: ${bg};
      color: #ffffff;
      padding: 0.85rem 1.25rem;
      border-radius: 10px;
      font-size: 0.9rem;
      font-weight: 600;
      box-shadow: 0 10px 25px rgba(0,0,0,0.18);
      z-index: 100000;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 4000);
  }

  function ensureAuthModalInjected() {
    if (document.getElementById('uni-auth-modal')) return;

    const modalHtml = `
      <div id="uni-auth-modal" class="uni-modal-overlay" style="z-index: 99999;">
        <div class="uni-modal-dialog" style="max-width: 420px; padding: 2.25rem 2rem; border-radius: 20px; position: relative; background: #ffffff; text-align: center;">
          <button type="button" onclick="window.UniAuth.closeAuthModal()" aria-label="Close" style="position: absolute; top: 1rem; right: 1rem; background: #f1f5f9; border: none; width: 32px; height: 32px; border-radius: 50%; font-size: 1.2rem; cursor: pointer; color: #475569;">&times;</button>
          
          <div style="margin-bottom: 1.5rem;">
            <div style="font-size: 1.55rem; font-weight: 800; color: #0f172a; margin-bottom: 0.4rem;">
              Uni<span style="color: #2563eb;">Nest</span>
            </div>
            <h3 style="font-size: 1.25rem; font-weight: 700; color: #0f172a; margin: 0 0 0.4rem 0;">
              Sign in with Google
            </h3>
            <p id="uni-auth-reason" style="font-size: 0.9rem; color: #64748b; margin: 0; line-height: 1.5;">
              Continue with your Google account to access UniNest student housing and marketplace features.
            </p>
          </div>

          <!-- Alert Box -->
          <div id="uni-auth-alert" style="display: none; padding: 0.75rem 0.9rem; border-radius: 8px; font-size: 0.84rem; margin-bottom: 1rem; line-height: 1.45; text-align: left;"></div>

          <!-- Google OAuth Button -->
          <button type="button" id="uni-google-btn" onclick="window.UniAuth.signInWithGoogle()" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.7rem; padding: 0.85rem 1.25rem; border-radius: 12px; border: 1.5px solid #cbd5e1; background: #ffffff; color: #0f172a; font-weight: 700; font-size: 0.95rem; cursor: pointer; box-shadow: 0 2px 6px rgba(15, 23, 42, 0.05);">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"/>
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"/>
              <path fill="#FBBC05" d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.9z"/>
              <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.9C3.5 21.4 7.4 24 12 24z"/>
            </svg>
            Continue with Google
          </button>

          <div style="margin-top: 1.35rem; padding-top: 1rem; border-top: 1px solid #f1f5f9; font-size: 0.78rem; color: #94a3b8;">
            🔒 Verified Google authentication powered by Supabase.
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  function setAlert(msg, type = 'error') {
    const alertEl = document.getElementById('uni-auth-alert');
    if (!alertEl) return;
    if (!msg) {
      alertEl.style.display = 'none';
      alertEl.textContent = '';
      return;
    }
    alertEl.style.display = 'block';
    alertEl.style.background = type === 'success' ? '#f0fdf4' : '#fef2f2';
    alertEl.style.border =
      type === 'success' ? '1px solid #bbf7d0' : '1px solid #fecaca';
    alertEl.style.color = type === 'success' ? '#15803d' : '#b91c1c';
    alertEl.textContent = msg;
  }

  function openAuthModal(_mode = 'signin', options = {}) {
    ensureAuthModalInjected();
    setAlert(null);
    const modal = document.getElementById('uni-auth-modal');
    const reasonEl = document.getElementById('uni-auth-reason');
    const reasonText =
      typeof options === 'string'
        ? options
        : options?.reason ||
          'Continue with your Google account to access UniNest student housing and marketplace features.';
    if (reasonEl) {
      reasonEl.textContent = reasonText;
    }
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeAuthModal() {
    const modal = document.getElementById('uni-auth-modal');
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  async function signInWithGoogle() {
    setAlert(null);
    const btn = document.getElementById('uni-google-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Redirecting to Google...';
    }
    try {
      const nextUrl = window.location.pathname + window.location.search + window.location.hash;
      if (window.supabaseClient && window.supabaseClient.auth) {
        const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          nextUrl
        )}`;
        const { error } = await window.supabaseClient.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo },
        });
        if (error) {
          setAlert(error.message);
          if (btn) {
            btn.disabled = false;
            btn.textContent = 'Continue with Google';
          }
        }
        return;
      }
      window.location.href = `/login?next=${encodeURIComponent(nextUrl)}`;
    } catch (err) {
      setAlert(err.message || 'Could not start Google Sign-In.');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Continue with Google';
      }
    }
  }

  function requireAuth(actionCallback, options = {}) {
    if (isAuthenticated()) {
      if (typeof actionCallback === 'function') {
        actionCallback(currentUser);
      }
      return true;
    }

    pendingAction = actionCallback;
    openAuthModal('signin', options);
    return false;
  }

  async function signOut() {
    clearStoredUser();
    try {
      if (window.supabaseClient && window.supabaseClient.auth) {
        await window.supabaseClient.auth.signOut();
      }
    } catch (e) {}
    showToast('Signed out successfully.', 'info');
  }

  function updateNavbarAuthUI() {
    const user = getStoredUser();
    const authContainers = document.querySelectorAll('.nav-auth-slot');
    authContainers.forEach((slot) => {
      if (user) {
        slot.innerHTML = `
          <span style="font-size: 0.85rem; font-weight: 600; color: #0f172a; margin-right: 0.5rem;">${user.name || user.email}</span>
          <button type="button" class="btn btn-secondary" onclick="window.UniAuth.signOut()" style="padding: 0.4rem 0.9rem; font-size: 0.82rem;">Sign Out</button>
        `;
      } else {
        slot.innerHTML = `
          <button type="button" class="btn btn-primary" onclick="window.UniAuth.openAuthModal('signin')" style="padding: 0.45rem 1rem; font-size: 0.85rem;">Sign in with Google</button>
        `;
      }
    });
  }

  function renderNavActions() {
    const navActionsContainers = document.querySelectorAll('.nav-actions');
    if (!navActionsContainers.length) return;

    const user = getStoredUser();
    const emailName = user?.name || (user?.email ? user.email.split('@')[0] : 'Student');
    const initial = emailName.charAt(0).toUpperCase();
    const isMarketplacePage =
      document.body.classList.contains('page-marketplace') ||
      window.location.pathname.includes('marketplace.html');

    navActionsContainers.forEach((container) => {
      let html = '';

      if (isMarketplacePage) {
        if (user) {
          html = `
            <div class="user-nav-badge" style="display: inline-flex; align-items: center; gap: 0.5rem; margin-right: 0.5rem; background: #f1f5f9; padding: 0.35rem 0.75rem; border-radius: 9999px;">
              <span style="width: 24px; height: 24px; border-radius: 50%; background: #2563eb; color: #fff; font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center;">${initial}</span>
              <span style="font-weight: 600; font-size: 0.84rem; color: #0f172a;">${emailName}</span>
            </div>
            <button type="button" class="btn btn-secondary" onclick="UniMarketplace.openStatusTrackerModal()" style="font-size: 0.85rem; padding: 0.45rem 0.85rem; margin-right: 0.25rem;">Track Deal</button>
            <button type="button" class="btn btn-secondary" onclick="UniMarketplace.openPostModal()" style="margin-right: 0.25rem; font-size: 0.85rem; padding: 0.45rem 0.85rem;">+ List Item</button>
            <button type="button" class="btn btn-primary" onclick="UniMarketplace.openAgentPortal()" style="font-size: 0.85rem; padding: 0.45rem 0.85rem; margin-right: 0.25rem;">Agent Portal</button>
            <button type="button" class="btn btn-secondary" onclick="UniAuth.signOut()" style="padding: 0.45rem 0.75rem; font-size: 0.8rem;">Logout</button>
          `;
        } else {
          html = `
            <button type="button" class="btn btn-secondary" onclick="UniMarketplace.openPostModal()" style="margin-right: 0.25rem; font-size: 0.85rem; padding: 0.45rem 0.85rem;">+ List Item</button>
            <button type="button" class="btn btn-secondary" onclick="UniMarketplace.openAgentPortal()" style="font-size: 0.85rem; padding: 0.45rem 0.85rem; margin-right: 0.35rem;">Agent Portal</button>
            <button type="button" class="btn btn-primary" onclick="UniAuth.openAuthModal('signin')" style="padding: 0.45rem 0.95rem; font-size: 0.85rem; font-weight: 600;">Sign in with Google</button>
          `;
        }
      } else {
        if (user) {
          html = `
            <div class="user-nav-badge" style="display: inline-flex; align-items: center; gap: 0.5rem; margin-right: 0.5rem; background: #f1f5f9; padding: 0.35rem 0.75rem; border-radius: 9999px;">
              <span style="width: 24px; height: 24px; border-radius: 50%; background: #2563eb; color: #fff; font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center;">${initial}</span>
              <span style="font-weight: 600; font-size: 0.84rem; color: #0f172a;">${emailName}</span>
            </div>
            <a href="marketplace.html#sell" class="btn btn-secondary" style="font-size: 0.82rem; padding: 0.45rem 0.75rem; margin-right: 0.25rem;">+ Sell Item</a>
            <a href="/post-property" class="btn btn-secondary" style="font-size: 0.82rem; padding: 0.45rem 0.75rem; margin-right: 0.25rem;">+ Post House</a>
            <button type="button" class="btn btn-secondary" onclick="UniAuth.signOut()" style="padding: 0.45rem 0.75rem; font-size: 0.8rem;">Logout</button>
          `;
        } else {
          html = `
            <a href="marketplace.html#sell" class="btn btn-secondary" style="margin-right: 0.25rem; font-size: 0.85rem; padding: 0.45rem 0.85rem;">+ Sell Item</a>
            <button type="button" class="btn btn-primary" onclick="UniAuth.openAuthModal('signin')" style="font-size: 0.85rem; padding: 0.45rem 0.95rem; font-weight: 600;">Sign in with Google</button>
          `;
        }
      }

      container.innerHTML = html;
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    currentUser = getStoredUser();
    updateNavbarAuthUI();
    renderNavActions();

    // Check URL hash fragment for Google OAuth implicit flow tokens
    if (window.location.hash && window.location.hash.includes('access_token')) {
      try {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken && refreshToken && window.supabaseClient) {
          const { data, error } = await window.supabaseClient.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!error && data?.user) {
            setStoredUser(data.user);
            showToast('Signed in with Google!', 'success');
            if (window.history && window.history.replaceState) {
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
          }
        }
      } catch (e) {}
    }

    // Listen to Supabase session changes if available
    try {
      if (window.supabaseClient && window.supabaseClient.auth) {
        const { data } = await window.supabaseClient.auth.getSession();
        if (data?.session?.user) {
          setStoredUser(data.session.user);
        }
        window.supabaseClient.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            setStoredUser(session.user);
            if (typeof pendingAction === 'function') {
              const cb = pendingAction;
              pendingAction = null;
              setTimeout(() => cb(currentUser), 150);
            }
          }
        });
      }
    } catch (e) {}
  });

  window.UniAuth = {
    getUser: getStoredUser,
    getStoredUser,
    saveClientSession: setStoredUser,
    isAuthenticated,
    requireAuth,
    openAuthModal,
    closeAuthModal,
    signInWithGoogle,
    signOut,
    showToast,
    renderNavActions,
    updateNavbarAuthUI,
  };
})();
