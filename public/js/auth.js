// ============================================================================
// UniNest Universal Authentication & Session Manager (js/auth.js)
// Google OAuth + Email & Password with Mandatory Email Sign-Up Confirmation
// ============================================================================

(function () {
  const STORAGE_KEY_USER = 'uninest_user';
  const CLIENT_COOKIE_NAME = 'uninest_user_client';

  let currentUser = null;
  let pendingAction = null;
  let currentAuthMode = 'signin'; // 'signin' | 'signup'
  let awaitingConfirmation = false;

  // Read user from localStorage or client cookie
  function getStoredUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_USER);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.email) return parsed;
      }
    } catch (e) {}

    try {
      const cookies = document.cookie.split(';');
      for (const c of cookies) {
        const [k, v] = c.trim().split('=');
        if ((k === CLIENT_COOKIE_NAME || k === 'uninest_user_session') && v) {
          const parsed = JSON.parse(decodeURIComponent(v));
          if (parsed && parsed.email) {
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(parsed));
            return parsed;
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
      document.cookie = `${CLIENT_COOKIE_NAME}=${encodeURIComponent(
        JSON.stringify(payload)
      )}; path=/; max-age=2592000; SameSite=Lax`;
    } catch (e) {}
    updateNavbarAuthUI();
  }

  function clearStoredUser() {
    currentUser = null;
    try {
      localStorage.removeItem(STORAGE_KEY_USER);
      document.cookie = `${CLIENT_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
      document.cookie = `uninest_user_session=; path=/; max-age=0; SameSite=Lax`;
    } catch (e) {}
    updateNavbarAuthUI();
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
        <div class="uni-modal-dialog" style="max-width: 450px; padding: 2rem; border-radius: 20px; position: relative; background: #ffffff;">
          <button type="button" onclick="window.UniAuth.closeAuthModal()" aria-label="Close" style="position: absolute; top: 1rem; right: 1rem; background: #f1f5f9; border: none; width: 32px; height: 32px; border-radius: 50%; font-size: 1.2rem; cursor: pointer; color: #475569;">&times;</button>
          
          <div style="text-align: center; margin-bottom: 1.25rem;">
            <div style="font-size: 1.45rem; font-weight: 800; color: #0f172a; margin-bottom: 0.25rem;">
              Uni<span style="color: #2563eb;">Nest</span>
            </div>
            <p id="uni-auth-reason" style="font-size: 0.88rem; color: #64748b; margin: 0;">
              Sign in or create an account to continue.
            </p>
          </div>

          <!-- Sign In / Sign Up Tabs -->
          <div id="uni-auth-tabs" style="display: grid; grid-template-columns: 1fr 1fr; background: #f1f5f9; padding: 0.25rem; border-radius: 10px; margin-bottom: 1.25rem;">
            <button type="button" id="uni-tab-signin" onclick="window.UniAuth.switchTab('signin')" style="padding: 0.55rem; border-radius: 8px; border: none; font-weight: 600; font-size: 0.88rem; cursor: pointer; background: #ffffff; color: #0f172a; box-shadow: 0 2px 5px rgba(0,0,0,0.06);">
              Sign In
            </button>
            <button type="button" id="uni-tab-signup" onclick="window.UniAuth.switchTab('signup')" style="padding: 0.55rem; border-radius: 8px; border: none; font-weight: 600; font-size: 0.88rem; cursor: pointer; background: transparent; color: #64748b;">
              Create Account
            </button>
          </div>

          <!-- Alert Box -->
          <div id="uni-auth-alert" style="display: none; padding: 0.75rem 0.9rem; border-radius: 8px; font-size: 0.84rem; margin-bottom: 1rem; line-height: 1.45;"></div>

          <!-- Google OAuth Button -->
          <div id="uni-google-section">
            <button type="button" id="uni-google-btn" onclick="window.UniAuth.signInWithGoogle()" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.6rem; padding: 0.75rem 1rem; border-radius: 10px; border: 1.5px solid #cbd5e1; background: #ffffff; color: #0f172a; font-weight: 600; font-size: 0.9rem; cursor: pointer; margin-bottom: 1.1rem;">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"/>
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"/>
                <path fill="#FBBC05" d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.9z"/>
                <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.9C3.5 21.4 7.4 24 12 24z"/>
              </svg>
              Continue with Google
            </button>

            <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 1.1rem; color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; font-weight: 600;">
              <div style="flex: 1; height: 1px; background: #e2e8f0;"></div>
              <span>or with email &amp; password</span>
              <div style="flex: 1; height: 1px; background: #e2e8f0;"></div>
            </div>
          </div>

          <!-- Step 1: Email & Password Form -->
          <form id="uni-auth-email-form" onsubmit="window.UniAuth.handleEmailPasswordSubmit(event)">
            <div id="uni-auth-name-group" style="display: none; margin-bottom: 0.85rem;">
              <label style="display: block; font-size: 0.82rem; font-weight: 600; color: #1e293b; margin-bottom: 0.3rem;">Full Name</label>
              <input type="text" id="uni-auth-name" placeholder="e.g. Jane Wanjiku" style="width: 100%; padding: 0.68rem 0.85rem; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem;">
            </div>

            <div style="margin-bottom: 0.85rem;">
              <label style="display: block; font-size: 0.82rem; font-weight: 600; color: #1e293b; margin-bottom: 0.3rem;">Email Address *</label>
              <input type="email" id="uni-auth-email" required placeholder="you@uni-nest.app or student@gmail.com" style="width: 100%; padding: 0.68rem 0.85rem; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem;">
            </div>

            <div style="margin-bottom: 1.15rem;">
              <label style="display: block; font-size: 0.82rem; font-weight: 600; color: #1e293b; margin-bottom: 0.3rem;">Password *</label>
              <input type="password" id="uni-auth-password" required minlength="6" placeholder="Enter your password (min. 6 characters)" style="width: 100%; padding: 0.68rem 0.85rem; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem;">
            </div>

            <button type="submit" id="uni-auth-submit-btn" class="btn btn-primary" style="width: 100%; padding: 0.78rem; font-weight: 600; font-size: 0.92rem; border-radius: 10px;">
              Sign In
            </button>
          </form>

          <!-- Step 2: Sign-Up Email Confirmation Code Form -->
          <form id="uni-auth-otp-form" onsubmit="window.UniAuth.handleVerifyConfirmationSubmit(event)" style="display: none;">
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 0.85rem; margin-bottom: 1rem; font-size: 0.84rem; color: #1e3a8a; line-height: 1.45;">
              📧 Confirmation email sent to <strong id="uni-otp-target-email"></strong>.<br>
              Enter the <strong>6-digit verification code</strong> from your email below (or click the confirmation link inside the email) to activate your account.
            </div>
            <div style="margin-bottom: 1rem;">
              <label style="display: block; font-size: 0.82rem; font-weight: 600; color: #1e293b; margin-bottom: 0.35rem;">6-Digit Confirmation Code *</label>
              <input type="text" id="uni-auth-otp-code" maxlength="6" inputmode="numeric" required placeholder="123456" style="width: 100%; padding: 0.78rem; border: 2px solid #2563eb; border-radius: 8px; font-size: 1.35rem; font-weight: 700; letter-spacing: 6px; text-align: center; font-family: monospace;">
            </div>
            <button type="submit" id="uni-auth-verify-btn" class="btn btn-primary" style="width: 100%; padding: 0.78rem; font-weight: 600; font-size: 0.92rem; border-radius: 10px; margin-bottom: 0.75rem;">
              Verify &amp; Confirm Account
            </button>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem;">
              <button type="button" onclick="window.UniAuth.resetToCredentialsStep()" style="background: none; border: none; color: #64748b; cursor: pointer; font-weight: 500;">&larr; Back</button>
              <button type="button" onclick="window.UniAuth.resendConfirmationEmail()" style="background: none; border: none; color: #2563eb; cursor: pointer; font-weight: 600;">Resend Confirmation Email</button>
            </div>
          </form>
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

  function switchTab(mode) {
    currentAuthMode = mode === 'signup' ? 'signup' : 'signin';
    awaitingConfirmation = false;
    setAlert(null);

    const tabSignIn = document.getElementById('uni-tab-signin');
    const tabSignUp = document.getElementById('uni-tab-signup');
    const nameGroup = document.getElementById('uni-auth-name-group');
    const emailForm = document.getElementById('uni-auth-email-form');
    const otpForm = document.getElementById('uni-auth-otp-form');
    const tabsBar = document.getElementById('uni-auth-tabs');
    const googleSec = document.getElementById('uni-google-section');
    const submitBtn = document.getElementById('uni-auth-submit-btn');

    if (tabsBar) tabsBar.style.display = 'grid';
    if (googleSec) googleSec.style.display = 'block';
    if (emailForm) emailForm.style.display = 'block';
    if (otpForm) otpForm.style.display = 'none';

    if (tabSignIn && tabSignUp) {
      if (currentAuthMode === 'signin') {
        tabSignIn.style.background = '#ffffff';
        tabSignIn.style.color = '#0f172a';
        tabSignIn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.06)';
        tabSignUp.style.background = 'transparent';
        tabSignUp.style.color = '#64748b';
        tabSignUp.style.boxShadow = 'none';
      } else {
        tabSignUp.style.background = '#ffffff';
        tabSignUp.style.color = '#0f172a';
        tabSignUp.style.boxShadow = '0 2px 5px rgba(0,0,0,0.06)';
        tabSignIn.style.background = 'transparent';
        tabSignIn.style.color = '#64748b';
        tabSignIn.style.boxShadow = 'none';
      }
    }

    if (nameGroup) {
      nameGroup.style.display = currentAuthMode === 'signup' ? 'block' : 'none';
    }
    if (submitBtn) {
      submitBtn.textContent =
        currentAuthMode === 'signup' ? 'Create Account' : 'Sign In';
    }
  }

  function resetToCredentialsStep() {
    switchTab(currentAuthMode);
  }

  function showConfirmationStep(email, noticeMsg, isWarning = false) {
    awaitingConfirmation = true;
    const emailForm = document.getElementById('uni-auth-email-form');
    const otpForm = document.getElementById('uni-auth-otp-form');
    const tabsBar = document.getElementById('uni-auth-tabs');
    const googleSec = document.getElementById('uni-google-section');
    const targetSpan = document.getElementById('uni-otp-target-email');
    const otpInput = document.getElementById('uni-auth-otp-code');

    if (targetSpan) targetSpan.textContent = email;
    if (otpInput) otpInput.value = '';
    if (tabsBar) tabsBar.style.display = 'none';
    if (googleSec) googleSec.style.display = 'none';
    if (emailForm) emailForm.style.display = 'none';
    if (otpForm) otpForm.style.display = 'block';

    if (noticeMsg) {
      setAlert(noticeMsg, isWarning ? 'error' : 'success');
    }
  }

  function openAuthModal(mode = 'signin', options = {}) {
    ensureAuthModalInjected();
    const modal = document.getElementById('uni-auth-modal');
    const reasonEl = document.getElementById('uni-auth-reason');
    if (reasonEl) {
      reasonEl.textContent =
        options.reason || 'Sign in or create an account to continue.';
    }
    switchTab(mode);
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
    try {
      if (window.supabaseClient && window.supabaseClient.auth) {
        const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          window.location.pathname + window.location.search
        )}`;
        const { error } = await window.supabaseClient.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo },
        });
        if (error) setAlert(error.message);
        return;
      }
      window.location.href = `/login?next=${encodeURIComponent(
        window.location.pathname + window.location.search
      )}`;
    } catch (err) {
      setAlert(err.message || 'Could not start Google Sign-In.');
    }
  }

  async function handleEmailPasswordSubmit(event) {
    if (event) event.preventDefault();
    setAlert(null);

    const emailInput = document.getElementById('uni-auth-email');
    const pwdInput = document.getElementById('uni-auth-password');
    const nameInput = document.getElementById('uni-auth-name');
    const submitBtn = document.getElementById('uni-auth-submit-btn');

    const cleanEmail = (emailInput?.value || '').trim().toLowerCase();
    const password = pwdInput?.value || '';
    const fullName = (nameInput?.value || '').trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAlert('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setAlert('Password must be at least 6 characters long.');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent =
        currentAuthMode === 'signup'
          ? 'Creating Account & Sending Email...'
          : 'Signing In...';
    }

    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: currentAuthMode === 'signup' ? 'signup' : 'signin',
          email: cleanEmail,
          password,
          fullName,
          origin: window.location.origin,
          next: window.location.pathname + window.location.search,
        }),
      });

      const data = await res.json();

      if (data.needsConfirmation || data.isEmailUnconfirmed) {
        showConfirmationStep(
          cleanEmail,
          data.isEmailUnconfirmed
            ? data.error
            : data.message ||
                `Confirmation email sent to ${cleanEmail}! Enter the 6-digit code below.`,
          !!data.isEmailUnconfirmed
        );
        return;
      }

      if (!res.ok || data.error) {
        setAlert(data.error || 'Authentication failed.');
        return;
      }

      if (data.success && data.user) {
        setStoredUser(data.user);
        closeAuthModal();
        showToast('Signed in successfully!', 'success');

        if (typeof pendingAction === 'function') {
          const cb = pendingAction;
          pendingAction = null;
          setTimeout(() => cb(), 150);
        }
      }
    } catch (err) {
      setAlert(err.message || 'Unable to process request. Please try again.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent =
          currentAuthMode === 'signup' ? 'Create Account' : 'Sign In';
      }
    }
  }

  async function handleVerifyConfirmationSubmit(event) {
    if (event) event.preventDefault();
    setAlert(null);

    const emailInput = document.getElementById('uni-auth-email');
    const nameInput = document.getElementById('uni-auth-name');
    const codeInput = document.getElementById('uni-auth-otp-code');
    const verifyBtn = document.getElementById('uni-auth-verify-btn');

    const cleanEmail = (emailInput?.value || '').trim().toLowerCase();
    const cleanCode = (codeInput?.value || '').trim().replace(/\D/g, '');
    const customName = (nameInput?.value || '').trim();

    if (!cleanCode || cleanCode.length < 6) {
      setAlert('Please enter the 6-digit confirmation code from your email.');
      return;
    }

    if (verifyBtn) {
      verifyBtn.disabled = true;
      verifyBtn.textContent = 'Verifying...';
    }

    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          email: cleanEmail,
          token: cleanCode,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setAlert(data.error || 'Invalid or expired confirmation code.');
        return;
      }

      const verifiedUser = data.user || {
        id: 'user_' + Date.now(),
        email: cleanEmail,
        name: customName || cleanEmail.split('@')[0],
      };

      setStoredUser(verifiedUser);
      closeAuthModal();
      showToast('Email confirmed! Welcome to UniNest.', 'success');

      if (typeof pendingAction === 'function') {
        const cb = pendingAction;
        pendingAction = null;
        setTimeout(() => cb(), 150);
      }
    } catch (err) {
      setAlert(err.message || 'Verification failed.');
    } finally {
      if (verifyBtn) {
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify & Confirm Account';
      }
    }
  }

  async function resendConfirmationEmail() {
    const emailInput = document.getElementById('uni-auth-email');
    const cleanEmail = (emailInput?.value || '').trim().toLowerCase();
    if (!cleanEmail) return;

    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resend',
          email: cleanEmail,
          origin: window.location.origin,
          next: window.location.pathname + window.location.search,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setAlert(data.error || 'Failed to resend confirmation email.');
      } else {
        setAlert(
          data.message || `New confirmation email sent to ${cleanEmail}!`,
          'success'
        );
      }
    } catch (err) {
      setAlert(err.message || 'Could not resend confirmation email.');
    }
  }

  function requireAuth(actionCallback, options = {}) {
    if (isAuthenticated()) {
      if (typeof actionCallback === 'function') {
        actionCallback();
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
          <button type="button" class="btn btn-primary" onclick="window.UniAuth.openAuthModal('signin')" style="padding: 0.45rem 1rem; font-size: 0.85rem;">Sign In</button>
        `;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    currentUser = getStoredUser();
    updateNavbarAuthUI();
  });

  window.UniAuth = {
    getUser: getStoredUser,
    getStoredUser,
    isAuthenticated,
    requireAuth,
    openAuthModal,
    closeAuthModal,
    switchTab,
    resetToCredentialsStep,
    signInWithGoogle,
    handleEmailPasswordSubmit,
    handleVerifyConfirmationSubmit,
    resendConfirmationEmail,
    signOut,
    showToast,
  };
})();
