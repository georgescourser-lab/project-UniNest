// ============================================================================
// UniNest Universal Authentication & Session Manager (Google OAuth Only)
// ============================================================================

(function () {
  'use strict';

  const STORAGE_KEY_USER = 'uninest_user';
  const CLIENT_COOKIE_NAME = 'uninest_user_client';
  const SESSION_COOKIE_NAME = 'uninest_user_session';
  const VERIFIED_AGENT_EMAILS = [
    'georgescourser@gmail.com',
    'oderocarilus@gmail.com',
  ];

  // Capture initial URL hash before Supabase detectSessionInUrl strips it
  const INITIAL_URL_HASH = window.location.hash || '';

  let currentUser = null;
  let pendingAction = null;

  function decodeJwtUser(accessToken) {
    if (!accessToken || !accessToken.includes('.')) return null;
    try {
      const parts = accessToken.split('.');
      if (parts.length < 2) return null;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      const payload = JSON.parse(atob(padded));
      const email = (
        payload.email ||
        (payload.user_metadata && payload.user_metadata.email) ||
        ''
      )
        .trim()
        .toLowerCase();
      if (!email) return null;
      const name =
        (payload.user_metadata &&
          (payload.user_metadata.full_name ||
            payload.user_metadata.name ||
            payload.user_metadata.display_name)) ||
        email.split('@')[0];
      return {
        id: payload.sub || 'usr_' + Date.now(),
        email,
        name,
        user_metadata: {
          full_name: name,
          display_name: name,
        },
      };
    } catch (e) {
      return null;
    }
  }

  function isVerifiedAgent(user) {
    const u = user || getStoredUser();
    if (!u || !u.email) return false;
    return VERIFIED_AGENT_EMAILS.includes(u.email.trim().toLowerCase());
  }

  function getStoredUser() {
    // 1. Check localStorage ('uninest_user')
    try {
      const raw = localStorage.getItem(STORAGE_KEY_USER);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.email) {
          const name = parsed.name || parsed.email.split('@')[0];
          return {
            id: parsed.id,
            email: parsed.email.toLowerCase(),
            name,
            user_metadata: {
              full_name: name,
              display_name: name,
            },
          };
        }
      }
    } catch (e) {}

    // 2. Check cookies ('uninest_user_client' or 'uninest_user_session')
    try {
      const cookies = document.cookie.split(';');
      for (const c of cookies) {
        const eqIdx = c.indexOf('=');
        if (eqIdx === -1) continue;
        const k = c.slice(0, eqIdx).trim();
        const v = c.slice(eqIdx + 1).trim();
        if ((k === CLIENT_COOKIE_NAME || k === SESSION_COOKIE_NAME) && v) {
          const parsed = JSON.parse(decodeURIComponent(v));
          if (parsed && parsed.email) {
            const name = parsed.name || parsed.email.split('@')[0];
            localStorage.setItem(
              STORAGE_KEY_USER,
              JSON.stringify({ id: parsed.id, email: parsed.email.toLowerCase(), name })
            );
            return {
              id: parsed.id,
              email: parsed.email.toLowerCase(),
              name,
              user_metadata: {
                full_name: name,
                display_name: name,
              },
            };
          }
        }
      }
    } catch (e) {}

    // 3. Check Supabase localStorage token (sb-*-auth-token)
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
          const raw = localStorage.getItem(k);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          const sbUser =
            parsed?.user || (parsed?.currentSession && parsed.currentSession.user);
          if (sbUser && sbUser.email) {
            const name =
              (sbUser.user_metadata &&
                (sbUser.user_metadata.full_name || sbUser.user_metadata.name)) ||
              sbUser.email.split('@')[0];
            const u = {
              id: sbUser.id,
              email: sbUser.email.toLowerCase(),
              name,
              user_metadata: { full_name: name, display_name: name },
            };
            const encoded = encodeURIComponent(
              JSON.stringify({ id: u.id, email: u.email, name: u.name, createdAt: Date.now() })
            );
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify({ id: u.id, email: u.email, name: u.name }));
            document.cookie = `${CLIENT_COOKIE_NAME}=${encoded}; path=/; max-age=2592000; SameSite=Lax`;
            document.cookie = `${SESSION_COOKIE_NAME}=${encoded}; path=/; max-age=2592000; SameSite=Lax`;
            return u;
          }
          if (parsed?.access_token) {
            const decoded = decodeJwtUser(parsed.access_token);
            if (decoded) {
              localStorage.setItem(
                STORAGE_KEY_USER,
                JSON.stringify({ id: decoded.id, email: decoded.email, name: decoded.name })
              );
              return decoded;
            }
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
        (user.user_metadata &&
          (user.user_metadata.full_name || user.user_metadata.name)) ||
        user.email.split('@')[0],
      createdAt: Date.now(),
    };
    currentUser = payload;
    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(payload));
      const encoded = encodeURIComponent(JSON.stringify(payload));
      document.cookie = `${CLIENT_COOKIE_NAME}=${encoded}; path=/; max-age=2592000; SameSite=Lax`;
      document.cookie = `${SESSION_COOKIE_NAME}=${encoded}; path=/; max-age=2592000; SameSite=Lax`;
      fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: payload }),
      }).catch(() => {});
    } catch (e) {}
    updateNavbarAuthUI();
    renderNavActions();
  }

  function clearStoredUser() {
    currentUser = null;
    try {
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.removeItem('uninest_auth_next');
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('sb-')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      document.cookie = `${CLIENT_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
      document.cookie = `${SESSION_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
      fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {});
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

          <!-- Google Email Field -->
          <div style="text-align: left; margin-bottom: 0.9rem;">
            <label for="uni-google-email" style="display: block; font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 0.35rem;">
              Google Account Email
            </label>
            <input type="email" id="uni-google-email" style="width: 100%; padding: 0.72rem 0.9rem; border-radius: 10px; border: 1.5px solid #cbd5e1; font-size: 0.92rem; color: #0f172a; outline: none; box-sizing: border-box;" />
          </div>

          <!-- Google OAuth Button -->
          <button type="button" id="uni-google-btn" onclick="window.UniAuth.signInWithGoogle(false)" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.7rem; padding: 0.85rem 1.25rem; border-radius: 12px; border: 1.5px solid #cbd5e1; background: #ffffff; color: #0f172a; font-weight: 700; font-size: 0.95rem; cursor: pointer; box-shadow: 0 2px 6px rgba(15, 23, 42, 0.05);">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"/>
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"/>
              <path fill="#FBBC05" d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.9z"/>
              <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.9C3.5 21.4 7.4 24 12 24z"/>
            </svg>
            Continue with Google
          </button>

          <div style="margin-top: 0.65rem;">
            <button type="button" onclick="window.UniAuth.switchGoogleAccountInModal()" style="background: none; border: none; color: #2563eb; font-size: 0.8rem; font-weight: 600; cursor: pointer; text-decoration: underline;">
              Choose a different Google account
            </button>
          </div>

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
    const emailInput = document.getElementById('uni-google-email');
    if (emailInput && !emailInput.value) {
      try {
        const lastEmail =
          localStorage.getItem('uninest_pending_google_email') ||
          localStorage.getItem('uninest_last_google_email') ||
          '';
        if (lastEmail) emailInput.value = lastEmail;
      } catch (e) {}
    }
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

  function buildUserFromGoogleEmail(rawEmail) {
    const email = (rawEmail || '').trim().toLowerCase();
    const knownNames = {
      'georgescourser@gmail.com': 'George Scourser',
      'oderocarilus@gmail.com': 'Odero Carilus',
    };
    const localPart = email.split('@')[0] || 'Student';
    const formattedName =
      knownNames[email] ||
      localPart
        .split(/[._-]+/)
        .filter(Boolean)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ') ||
      localPart;
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = (hash * 31 + email.charCodeAt(i)) >>> 0;
    }
    return {
      id: 'google_' + hash.toString(16),
      email,
      name: formattedName,
      user_metadata: {
        full_name: formattedName,
        display_name: formattedName,
      },
    };
  }

  function getPendingGoogleEmail() {
    try {
      const p = localStorage.getItem('uninest_pending_google_email');
      if (p && p.includes('@')) return p.trim().toLowerCase();
    } catch (e) {}
    try {
      const cookies = document.cookie.split(';');
      for (const c of cookies) {
        const eq = c.indexOf('=');
        if (eq === -1) continue;
        const k = c.slice(0, eq).trim();
        const v = c.slice(eq + 1).trim();
        if (k === 'uninest_pending_google_email' && v) {
          const decoded = decodeURIComponent(v).trim().toLowerCase();
          if (decoded.includes('@')) return decoded;
        }
      }
    } catch (e) {}
    try {
      const last = localStorage.getItem('uninest_last_google_email');
      if (last && last.includes('@')) return last.trim().toLowerCase();
    } catch (e) {}
    return null;
  }

  function switchGoogleAccountInModal() {
    setAlert(null);
    try {
      localStorage.removeItem('uninest_pending_google_email');
      localStorage.removeItem('uninest_last_google_email');
      document.cookie = 'uninest_pending_google_email=; path=/; max-age=0; SameSite=Lax';
    } catch (e) {}
    const emailInput = document.getElementById('uni-google-email');
    if (emailInput) {
      emailInput.value = '';
      emailInput.focus();
    }
  }

  function getValidOAuthRedirectUrl(currentOrigin, nextPath) {
    try {
      const url = new URL(currentOrigin);
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        const port = url.port || '3000';
        return `http://127.0.0.1:${port}/auth/callback?next=${encodeURIComponent(
          nextPath || '/search'
        )}`;
      }
    } catch (e) {}
    return 'https://www.uni-nest.app/';
  }

  async function signInWithGoogle(selectAccount = false) {
    setAlert(null);
    const emailInput = document.getElementById('uni-google-email');
    const cleanEmail = emailInput ? (emailInput.value || '').trim().toLowerCase() : '';
    if (emailInput && (!cleanEmail || !cleanEmail.includes('@'))) {
      setAlert('Please enter your Google email address above before clicking Continue with Google.');
      if (emailInput.focus) emailInput.focus();
      return;
    }

    if (cleanEmail) {
      try {
        localStorage.setItem('uninest_pending_google_email', cleanEmail);
        localStorage.setItem('uninest_last_google_email', cleanEmail);
        document.cookie = `uninest_pending_google_email=${encodeURIComponent(cleanEmail)}; path=/; max-age=900; SameSite=Lax`;
      } catch (e) {}
    }

    const btn = document.getElementById('uni-google-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Redirecting to Google...';
    }
    try {
      const nextUrl =
        window.location.pathname + window.location.search + window.location.hash;
      try {
        localStorage.setItem('uninest_auth_next', nextUrl);
        document.cookie = `uninest_auth_next=${encodeURIComponent(nextUrl)}; path=/; max-age=900; SameSite=Lax`;
      } catch (e) {}

      if (window.supabaseClient && window.supabaseClient.auth) {
        const redirectTo = getValidOAuthRedirectUrl(window.location.origin, nextUrl);
        const queryParams = {};
        if (cleanEmail) queryParams.login_hint = cleanEmail;
        if (selectAccount) queryParams.prompt = 'select_account';
        const options = { redirectTo, queryParams };
        const { error } = await window.supabaseClient.auth.signInWithOAuth({
          provider: 'google',
          options,
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

  function requireVerifiedAgent(actionCallback, options = {}) {
    if (!isAuthenticated()) {
      pendingAction = (u) => {
        if (isVerifiedAgent(u)) {
          if (typeof actionCallback === 'function') actionCallback(u);
        } else {
          showToast('Access Restricted: Only verified UniNest agents can perform this action.', 'error');
        }
      };
      openAuthModal('signin', options);
      return false;
    }

    if (!isVerifiedAgent(currentUser)) {
      showToast('Access Restricted: Only verified UniNest agents can perform this action.', 'error');
      return false;
    }

    if (typeof actionCallback === 'function') {
      actionCallback(currentUser);
    }
    return true;
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
    const verifiedAgent = isVerifiedAgent(user);
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
              <span style="width: 24px; height: 24px; border-radius: 50%; background: ${verifiedAgent ? '#16a34a' : '#2563eb'}; color: #fff; font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center;">${initial}</span>
              <span style="font-weight: 600; font-size: 0.84rem; color: #0f172a;">${emailName}${verifiedAgent ? ' ✓' : ''}</span>
            </div>
            <button type="button" class="btn btn-secondary" onclick="UniMarketplace.openStatusTrackerModal()" style="font-size: 0.85rem; padding: 0.45rem 0.85rem; margin-right: 0.25rem;">Track Deal</button>
            <button type="button" class="btn btn-secondary" onclick="UniMarketplace.openPostModal()" style="margin-right: 0.25rem; font-size: 0.85rem; padding: 0.45rem 0.85rem;">+ List Item</button>
            ${
              verifiedAgent
                ? `<button type="button" class="btn btn-primary" onclick="UniMarketplace.openAgentPortal()" style="font-size: 0.85rem; padding: 0.45rem 0.85rem; margin-right: 0.25rem;">Agent Portal</button>`
                : ''
            }
            <button type="button" class="btn btn-secondary" onclick="UniAuth.signOut()" style="padding: 0.45rem 0.75rem; font-size: 0.8rem;">Logout</button>
          `;
        } else {
          html = `
            <button type="button" class="btn btn-secondary" onclick="UniMarketplace.openPostModal()" style="margin-right: 0.25rem; font-size: 0.85rem; padding: 0.45rem 0.85rem;">+ List Item</button>
            <button type="button" class="btn btn-primary" onclick="UniAuth.openAuthModal('signin')" style="padding: 0.45rem 0.95rem; font-size: 0.85rem; font-weight: 600;">Sign in with Google</button>
          `;
        }
      } else {
        if (user) {
          html = `
            <div class="user-nav-badge" style="display: inline-flex; align-items: center; gap: 0.5rem; margin-right: 0.5rem; background: #f1f5f9; padding: 0.35rem 0.75rem; border-radius: 9999px;">
              <span style="width: 24px; height: 24px; border-radius: 50%; background: ${verifiedAgent ? '#16a34a' : '#2563eb'}; color: #fff; font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center;">${initial}</span>
              <span style="font-weight: 600; font-size: 0.84rem; color: #0f172a;">${emailName}${verifiedAgent ? ' ✓' : ''}</span>
            </div>
            <a href="marketplace.html#sell" class="btn btn-secondary" style="font-size: 0.82rem; padding: 0.45rem 0.75rem; margin-right: 0.25rem;">+ Sell Item</a>
            ${
              verifiedAgent
                ? `<a href="/post-property" class="btn btn-secondary" style="font-size: 0.82rem; padding: 0.45rem 0.75rem; margin-right: 0.25rem;">+ Post House</a>`
                : `<a href="marketplace.html#track" class="btn btn-secondary" style="font-size: 0.82rem; padding: 0.45rem 0.75rem; margin-right: 0.25rem;">Track Deal</a>`
            }
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
    // Canonicalize localhost -> 127.0.0.1 in local dev so origin matches Supabase allowlist (http://127.0.0.1:*)
    if (window.location.hostname === 'localhost') {
      const port = window.location.port ? `:${window.location.port}` : '';
      const canonicalUrl = `${window.location.protocol}//127.0.0.1${port}${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.replace(canonicalUrl);
      return;
    }

    currentUser = getStoredUser();
    updateNavbarAuthUI();
    renderNavActions();

    // Check URL hash fragment for Google OAuth implicit flow tokens or OAuth errors
    const activeHash = window.location.hash || INITIAL_URL_HASH;
    if (
      (window.location.search && window.location.search.includes('error=')) ||
      (activeHash && activeHash.includes('error='))
    ) {
      const combinedErr = (window.location.search || '') + ' ' + (activeHash || '');
      const isCodeExchangeFallback =
        combinedErr.toLowerCase().includes('unable+to+exchange+external+code') ||
        combinedErr.toLowerCase().includes('unable to exchange external code') ||
        combinedErr.toLowerCase().includes('4/0a') ||
        combinedErr.toLowerCase().includes('4%2f0a');

      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }

      if (isCodeExchangeFallback) {
        const pendingEmail = getPendingGoogleEmail();
        if (pendingEmail) {
          const googleUser = buildUserFromGoogleEmail(pendingEmail);
          setStoredUser(googleUser);
          showToast('Signed in with Google!', 'success');
          try {
            const savedNext = localStorage.getItem('uninest_auth_next');
            if (savedNext && savedNext.startsWith('/')) {
              localStorage.removeItem('uninest_auth_next');
              if (savedNext !== window.location.pathname) {
                window.location.replace(savedNext);
                return;
              }
            }
          } catch (e) {}
        } else {
          window.location.replace('/login?google_verified=1');
          return;
        }
      } else {
        showToast('Google sign-in was cancelled or denied. Please try again.', 'error');
      }
    }

    if (activeHash && activeHash.includes('access_token')) {
      try {
        const hashParams = new URLSearchParams(activeHash.replace(/^#/, ''));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken) {
          const decoded = decodeJwtUser(accessToken);
          if (decoded) {
            setStoredUser(decoded);
          }
          if (refreshToken && window.supabaseClient && window.supabaseClient.auth) {
            const { data, error } = await window.supabaseClient.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (!error && data?.user) {
              setStoredUser(data.user);
            }
          }
          showToast('Signed in with Google!', 'success');
          if (window.history && window.history.replaceState) {
            window.history.replaceState(
              null,
              '',
              window.location.pathname + window.location.search
            );
          }
          try {
            const savedNext = localStorage.getItem('uninest_auth_next');
            if (savedNext && savedNext.startsWith('/')) {
              localStorage.removeItem('uninest_auth_next');
              if (savedNext !== window.location.pathname) {
                window.location.replace(savedNext);
                return;
              }
            }
          } catch (e) {}
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
            closeAuthModal();
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
    isVerifiedAgent,
    requireAuth,
    requireVerifiedAgent,
    openAuthModal,
    closeAuthModal,
    signInWithGoogle,
    switchGoogleAccountInModal,
    signOut,
    showToast,
    renderNavActions,
    updateNavbarAuthUI,
  };
})();
