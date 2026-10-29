// UniNest Modern Passwordless Authentication & Authorization System
// Supports ONLY Google OAuth and 6-Digit Email OTP (Password authentication removed).
// Strictly requires authentication before performing any action (viewings, favorites, posting, inquiries)
// and restricts Agent Portal access strictly to verified agent emails (georgescourser@gmail.com & oderocarilus@gmail.com).

(function() {
  'use strict';

  const VERIFIED_AGENT_EMAILS = [
    'georgescourser@gmail.com',
    'oderocarilus@gmail.com'
  ];

  // Global UniAuth State & API
  const UniAuth = {
    _user: null,
    _pendingAction: null,
    _activeTab: 'signin', // 'signin' | 'signup'

    isVerifiedAgentEmail(email) {
      if (!email) return false;
      return VERIFIED_AGENT_EMAILS.includes(String(email).trim().toLowerCase());
    },

    getStoredUser() {
      if (this._user && this._user.email) return this._user;

      // 1. Check localStorage
      try {
        const stored = localStorage.getItem('uninest_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.email) {
            return {
              id: parsed.id || `user_${parsed.email}`,
              email: parsed.email.toLowerCase(),
              user_metadata: { full_name: parsed.name, display_name: parsed.name }
            };
          }
        }
      } catch (e) {}

      // 2. Check cookies (uninest_user_client or uninest_user_session)
      try {
        const cookiePairs = document.cookie.split(';');
        for (let pair of cookiePairs) {
          const [key, val] = pair.trim().split('=');
          if ((key === 'uninest_user_client' || key === 'uninest_user_session') && val) {
            const parsed = JSON.parse(decodeURIComponent(val));
            if (parsed && parsed.email) {
              return {
                id: parsed.id || `user_${parsed.email}`,
                email: parsed.email.toLowerCase(),
                user_metadata: { full_name: parsed.name, display_name: parsed.name }
              };
            }
          }
        }
      } catch (e) {}

      return null;
    },

    saveClientSession(user) {
      if (!user || !user.email) return;
      const cleanEmail = user.email.trim().toLowerCase();
      this._user = {
        ...user,
        email: cleanEmail
      };
      const payload = {
        id: user.id || `user_${Date.now()}`,
        email: cleanEmail,
        name: user.user_metadata?.full_name || cleanEmail.split('@')[0] || 'Student',
        createdAt: Date.now()
      };
      try {
        localStorage.setItem('uninest_user', JSON.stringify(payload));
        const encoded = encodeURIComponent(JSON.stringify(payload));
        document.cookie = `uninest_user_client=${encoded}; path=/; max-age=2592000; SameSite=Lax`;
        document.cookie = `uninest_user_session=${encoded}; path=/; max-age=2592000; SameSite=Lax`;
      } catch (e) {}
    },

    getUser() {
      if (!this._user) {
        this._user = this.getStoredUser();
      }
      return this._user;
    },

    isAuthenticated() {
      if (!this._user) {
        this._user = this.getStoredUser();
      }
      return !!(this._user && this._user.email);
    },

    // Action Gatekeeper: Execute callback ONLY if logged in; otherwise intercept with Auth Modal
    requireAuth(actionCallback, options = {}) {
      if (this.isAuthenticated()) {
        if (typeof actionCallback === 'function') {
          actionCallback(this._user);
        }
        return true;
      }

      // Store pending action to resume after login
      this._pendingAction = typeof actionCallback === 'function' ? actionCallback : null;

      // Open auth modal with context reason
      const reason = options.reason || 'Please sign in with Google or a 6-digit email verification code to perform this action.';
      this.openAuthModal(options.mode || 'signin', reason);
      return false;
    },

    openAuthModal(tab = 'signin', reason = '') {
      ensureAuthModalInDom();
      const modal = document.getElementById('uni-auth-modal');
      if (!modal) return;

      this.switchTab(tab);
      const reasonEl = document.getElementById('uni-auth-modal-reason');
      if (reasonEl) {
        reasonEl.textContent = reason || 'Sign in with Google or a 6-digit email verification code to save properties, book viewings, and list items.';
        reasonEl.style.display = 'block';
      }

      this.clearMessages();
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';

      setTimeout(() => {
        const emailInput = document.getElementById('uni-auth-email');
        if (emailInput) emailInput.focus();
      }, 100);
    },

    closeAuthModal() {
      const modal = document.getElementById('uni-auth-modal');
      if (modal) {
        modal.classList.remove('open');
      }
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    },

    switchTab(tab) {
      this._activeTab = tab;
      const tabSignIn = document.getElementById('uni-auth-tab-signin');
      const tabSignUp = document.getElementById('uni-auth-tab-signup');
      const switchText = document.getElementById('uni-auth-switch-prompt');
      const kicker = document.getElementById('uni-auth-kicker');
      const title = document.getElementById('uni-auth-title');
      const formEl = document.getElementById('uni-auth-otp-form');

      if (tabSignIn && tabSignUp) {
        tabSignIn.classList.toggle('active', tab === 'signin');
        tabSignUp.classList.toggle('active', tab === 'signup');
      }

      if (formEl) {
        formEl.style.display = 'flex';
      }

      if (tab === 'signin') {
        if (kicker) kicker.textContent = 'WELCOME BACK';
        if (title) title.textContent = 'Log in to UniNest';
        if (switchText) {
          switchText.innerHTML = `Don't have an account? <a href="javascript:void(0)" onclick="UniAuth.switchTab('signup')" style="color: #2563eb; font-weight: 600; text-decoration: none;">Sign up</a>`;
        }
      } else {
        if (kicker) kicker.textContent = 'GET STARTED';
        if (title) title.textContent = 'Create your account';
        if (switchText) {
          switchText.innerHTML = `Already have an account? <a href="javascript:void(0)" onclick="UniAuth.switchTab('signin')" style="color: #2563eb; font-weight: 600; text-decoration: none;">Log in</a>`;
        }
      }
      this.clearMessages();
    },

    clearMessages() {
      const errBox = document.getElementById('uni-auth-error-box');
      const succBox = document.getElementById('uni-auth-success-box');
      if (errBox) {
        errBox.textContent = '';
        errBox.style.display = 'none';
      }
      if (succBox) {
        succBox.textContent = '';
        succBox.style.display = 'none';
      }
    },

    showError(msg) {
      const errBox = document.getElementById('uni-auth-error-box');
      const rawStr = typeof msg === 'string' ? msg.trim() : (msg?.message || JSON.stringify(msg) || 'Authentication failed.');
      if (errBox) {
        errBox.innerHTML = rawStr;
        errBox.style.display = 'block';
      } else {
        this.showToast(rawStr, 'error');
      }
    },

    showSuccess(msg) {
      const succBox = document.getElementById('uni-auth-success-box');
      if (succBox) {
        succBox.innerHTML = msg;
        succBox.style.display = 'block';
      } else {
        this.showToast(msg, 'success');
      }
    },

    // 1. Send 6-Digit Email OTP (Passwordless)
    async handleFormSubmit(e) {
      if (e) e.preventDefault();
      await this.sendEmailOtp();
    },

    async sendEmailOtp(email) {
      const emailInput = document.getElementById('uni-auth-email');
      const submitBtn = document.getElementById('uni-auth-submit-btn');
      const userEmail = (email || (emailInput?.value || '')).trim().toLowerCase();

      if (!userEmail) {
        this.showError('Please enter your email address first.');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending 6-Digit Code...';
      }

      this.clearMessages();
      try {
        let sentViaFallback = false;

        if (window.supabaseClient) {
          const { error } = await window.supabaseClient.auth.signInWithOtp({
            email: userEmail,
            options: {
              shouldCreateUser: true,
            },
          });

          if (error) {
            const fallbackRes = await fetch('/api/auth/otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'send', email: userEmail }),
            });
            const fallbackData = await fallbackRes.json().catch(() => ({}));
            if (fallbackRes.ok && fallbackData?.success) {
              sentViaFallback = true;
            } else {
              throw new Error(fallbackData?.error || error.message);
            }
          }
        } else {
          const fallbackRes = await fetch('/api/auth/otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'send', email: userEmail }),
          });
          const fallbackData = await fallbackRes.json().catch(() => ({}));
          if (!fallbackRes.ok || !fallbackData?.success) {
            throw new Error(fallbackData?.error || 'Failed to send 6-digit OTP code.');
          }
          sentViaFallback = true;
        }

        this.renderOtpVerificationBox(userEmail, 'email');
      } catch (err) {
        this.showError(err.message || 'Failed to send 6-digit OTP code.');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = '🔢 Send 6-Digit Verification Code';
        }
      }
    },

    // 2. Verify 6-Digit Email OTP
    async verifyEmailOtp(userEmail, otpType = 'email') {
      const codeInput = document.getElementById('uni-auth-otp-code');
      const sixDigitCode = (codeInput?.value || '').trim();
      if (!sixDigitCode || sixDigitCode.length < 6) {
        this.showError('Please enter the 6-digit code from your email.');
        return;
      }

      try {
        let verifiedUser = null;

        if (window.supabaseClient) {
          let { data: sessionData, error: verifyError } = await window.supabaseClient.auth.verifyOtp({
            email: userEmail,
            token: sixDigitCode,
            type: otpType,
          });

          if (verifyError) {
            const fallbackType = otpType === 'email' ? 'signup' : 'email';
            const fallbackRes = await window.supabaseClient.auth.verifyOtp({
              email: userEmail,
              token: sixDigitCode,
              type: fallbackType,
            });
            if (!fallbackRes.error && fallbackRes.data) {
              sessionData = fallbackRes.data;
              verifyError = null;
            }
          }

          if (!verifyError && (sessionData?.user || sessionData?.session?.user)) {
            verifiedUser = sessionData?.user || sessionData?.session?.user;
          }
        }

        if (!verifiedUser) {
          const apiVerifyRes = await fetch('/api/auth/otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'verify', email: userEmail, token: sixDigitCode }),
          });
          const apiVerifyData = await apiVerifyRes.json().catch(() => ({}));
          if (apiVerifyRes.ok && apiVerifyData?.success && apiVerifyData?.user) {
            verifiedUser = apiVerifyData.user;
          } else {
            throw new Error(apiVerifyData?.error || 'Invalid or expired 6-digit verification code.');
          }
        }

        if (verifiedUser) {
          this._user = verifiedUser;
          this.onAuthSuccess(`Welcome to UniNest, ${userEmail.split('@')[0]}!`);
        }
      } catch (err) {
        this.showError(err.message || 'Invalid or expired 6-digit code.');
      }
    },

    renderOtpVerificationBox(email, otpType = 'email') {
      const formEl = document.getElementById('uni-auth-otp-form');
      if (formEl) {
        formEl.style.display = 'none';
      }

      this.showSuccess(`
        <div style="font-weight: 700; margin-bottom: 0.35rem; color: #166534;">🔐 Enter 6-Digit Verification Code</div>
        <div style="margin-bottom: 0.65rem; line-height: 1.45; font-size: 0.84rem; color: #166534;">
          We sent a 6-digit OTP code to <strong>${email}</strong>. Enter it below to verify and sign in:
        </div>
        <div style="display: flex; gap: 0.5rem; margin-bottom: 0.65rem;">
          <input type="text" id="uni-auth-otp-code" maxlength="6" inputmode="numeric" placeholder="123456" style="flex: 1; padding: 0.55rem 0.75rem; border: 1.5px solid #86efac; border-radius: 8px; font-size: 1.1rem; font-weight: 700; letter-spacing: 0.3em; text-align: center; background: #fff; color: #0f172a;" />
          <button type="button" onclick="UniAuth.verifyEmailOtp('${email}', '${otpType}')" style="background: #16a34a; color: #ffffff; border: none; padding: 0.55rem 1.1rem; border-radius: 8px; font-weight: 700; font-size: 0.86rem; cursor: pointer;">
            Verify
          </button>
        </div>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: space-between;">
          <button type="button" onclick="UniAuth.sendEmailOtp('${email}')" style="background: #166534; color: #ffffff; border: none; padding: 0.35rem 0.75rem; border-radius: 6px; font-weight: 600; font-size: 0.78rem; cursor: pointer;">
            Resend 6-Digit Code
          </button>
          <button type="button" onclick="UniAuth.switchTab(UniAuth._activeTab)" style="background: transparent; color: #166534; border: 1px solid #86efac; padding: 0.35rem 0.75rem; border-radius: 6px; font-weight: 600; font-size: 0.78rem; cursor: pointer;">
            Change Email
          </button>
        </div>
      `);

      setTimeout(() => {
        const otpInput = document.getElementById('uni-auth-otp-code');
        if (otpInput) otpInput.focus();
      }, 60);
    },

    // 3. Modern Google 1-Click OAuth
    async signInWithGoogle() {
      const btn = document.getElementById('uni-auth-google-btn');
      if (btn) btn.disabled = true;

      try {
        if (!window.supabaseClient) {
          throw new Error('Authentication service not connected.');
        }

        const returnUrl = window.location.href;
        const { data, error } = await window.supabaseClient.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: returnUrl,
            skipBrowserRedirect: true
          }
        });

        if (error) throw error;

        if (data?.url) {
          try {
            const check = await fetch(data.url, { method: 'GET', redirect: 'manual' });
            if (check.status === 400) {
              const body = await check.json().catch(() => ({}));
              if (body.msg && body.msg.includes('provider is not enabled')) {
                this.showError('Google OAuth is not enabled yet in your Supabase project dashboard. Please sign in using your 6-Digit Email Verification Code below!');
                const emailInput = document.getElementById('uni-auth-email');
                if (emailInput) emailInput.focus();
                return;
              }
            }
          } catch (fetchErr) {
            // Ignore fetch CORS restriction and proceed
          }

          window.location.href = data.url;
        }
      } catch (err) {
        console.error('Google Auth error:', err);
        this.showError(err.message || 'Google authentication failed.');
      } finally {
        if (btn) btn.disabled = false;
      }
    },

    onAuthSuccess(message = 'Signed in successfully!') {
      this.saveClientSession(this._user);
      this.closeAuthModal();
      this.showToast(message, 'success');
      this.renderNavActions();

      // Resume pending action if queued
      if (this._pendingAction) {
        const action = this._pendingAction;
        this._pendingAction = null;
        setTimeout(() => {
          try {
            action(this._user);
          } catch (e) {
            console.error('Error resuming action:', e);
          }
        }, 200);
      }
    },

    async signOut() {
      try {
        localStorage.removeItem('uninest_user');
        document.cookie = 'uninest_user_client=; path=/; max-age=0; SameSite=Lax';
        document.cookie = 'uninest_user_session=; path=/; max-age=0; SameSite=Lax';
        if (window.supabaseClient) {
          await window.supabaseClient.auth.signOut();
        }
      } catch (e) {
        console.warn('SignOut error:', e);
      }
      this._user = null;
      this.showToast('You have been logged out.', 'info');
      this.renderNavActions();
      window.location.reload();
    },

    showToast(message, type = 'info') {
      let toastContainer = document.getElementById('uni-toast-container');
      if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'uni-toast-container';
        toastContainer.className = 'uni-toast-container';
        document.body.appendChild(toastContainer);
      }

      const toast = document.createElement('div');
      toast.className = `uni-toast uni-toast-${type} animate-slide-up`;
      const icon = type === 'success' ? '✓' : type === 'error' ? '⚠️' : 'ℹ️';
      toast.innerHTML = `<span style="font-weight: 700; margin-right: 0.5rem;">${icon}</span> <span>${message}</span>`;

      toastContainer.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => toast.remove(), 300);
      }, 4000);
    },

    renderNavActions() {
      const navActionsContainers = document.querySelectorAll('.nav-actions');
      if (!navActionsContainers.length) return;

      const user = this._user;
      const emailName = user?.email ? user.email.split('@')[0] : 'Student';
      const initial = emailName.charAt(0).toUpperCase();
      const isMarketplacePage = document.body.classList.contains('page-marketplace') || window.location.pathname.includes('marketplace.html');

      navActionsContainers.forEach(container => {
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
              <button type="button" class="btn btn-secondary" onclick="UniAuth.openAuthModal('signin')" style="padding: 0.45rem 0.85rem; font-size: 0.85rem; margin-right: 0.25rem;">Log In</button>
              <button type="button" class="btn btn-primary" onclick="UniAuth.openAuthModal('signup')" style="padding: 0.45rem 0.95rem; font-size: 0.85rem; font-weight: 600;">Sign Up</button>
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
              <a href="agents.html" class="btn btn-secondary" style="font-size: 0.82rem; padding: 0.45rem 0.75rem; margin-right: 0.25rem;">List Property</a>
              <button type="button" class="btn btn-secondary" onclick="UniAuth.signOut()" style="padding: 0.45rem 0.75rem; font-size: 0.8rem;">Logout</button>
            `;
          } else {
            html = `
              <a href="marketplace.html#sell" class="btn btn-secondary" style="margin-right: 0.25rem; font-size: 0.85rem; padding: 0.45rem 0.85rem;">+ Sell Item</a>
              <button type="button" class="btn btn-secondary" onclick="UniAuth.openAuthModal('signin')" style="margin-right: 0.25rem; font-size: 0.85rem; padding: 0.45rem 0.85rem;">Log In</button>
              <button type="button" class="btn btn-primary" onclick="UniAuth.openAuthModal('signup')" style="font-size: 0.85rem; padding: 0.45rem 0.95rem; font-weight: 600;">Sign Up</button>
            `;
          }
        }

        container.innerHTML = html;
      });
    }
  };

  window.UniAuth = UniAuth;

  // DOM Injector for the Passwordless Auth Modal (Google OAuth + 6-Digit Email OTP only)
  function ensureAuthModalInDom() {
    if (document.getElementById('uni-auth-modal')) return;

    const modalDiv = document.createElement('div');
    modalDiv.id = 'uni-auth-modal';
    modalDiv.className = 'uni-modal-overlay uni-auth-overlay';
    modalDiv.innerHTML = `
      <div class="uni-modal-dialog uni-auth-dialog" style="max-width: 430px; width: 100%; border-radius: 18px; padding: 0; box-shadow: 0 20px 40px rgba(0,0,0,0.2); background: #ffffff; margin: auto; max-height: calc(100vh - 2rem); display: flex; flex-direction: column; overflow-y: auto; -webkit-overflow-scrolling: touch;">
        
        <!-- Modal Header -->
        <div style="padding: 1.15rem 1.4rem 0.75rem 1.4rem; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: flex-start; flex-shrink: 0;">
          <div>
            <div id="uni-auth-kicker" style="font-size: 0.72rem; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.2rem;">WELCOME BACK</div>
            <h3 id="uni-auth-title" style="margin: 0; font-size: 1.25rem; color: #0f172a; font-weight: 700; letter-spacing: -0.01em;">Log in to UniNest</h3>
            <p id="uni-auth-modal-reason" style="margin: 0.25rem 0 0 0; font-size: 0.8rem; color: #64748b; line-height: 1.35;">Sign in with Google or a 6-digit email verification code to continue.</p>
          </div>
          <button type="button" class="uni-modal-close-btn" onclick="UniAuth.closeAuthModal()" style="margin-left: 1rem; flex-shrink: 0;" aria-label="Close modal">&times;</button>
        </div>

        <div style="padding: 0.95rem 1.4rem 1.15rem 1.4rem; overflow-y: auto; flex: 1;">
          
          <!-- One-Click Google OAuth -->
          <button type="button" id="uni-auth-google-btn" onclick="UniAuth.signInWithGoogle()" style="width: 100%; height: 42px; display: flex; align-items: center; justify-content: center; gap: 0.65rem; background: #ffffff; border: 1.5px solid #e2e8f0; color: #0f172a; padding: 0.45rem 1rem; border-radius: 10px; font-weight: 600; font-size: 0.9rem; box-shadow: 0 1px 3px rgba(0,0,0,0.04); cursor: pointer; transition: all 0.2s ease; margin-bottom: 0.85rem;">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Continue with Google
          </button>

          <!-- Divider -->
          <div style="display: flex; align-items: center; margin: 0 0 0.85rem 0; color: #94a3b8; font-size: 0.72rem; font-weight: 700;">
            <div style="flex: 1; height: 1px; background: #e2e8f0;"></div>
            <span style="padding: 0 0.65rem; text-transform: uppercase; letter-spacing: 0.5px;">or with 6-digit email otp</span>
            <div style="flex: 1; height: 1px; background: #e2e8f0;"></div>
          </div>

          <!-- Tabs (Sign In vs Create Account) -->
          <div style="display: flex; background: #f1f5f9; padding: 0.2rem; border-radius: 8px; margin-bottom: 0.85rem;">
            <button type="button" id="uni-auth-tab-signin" onclick="UniAuth.switchTab('signin')" class="uni-auth-tab active" style="flex: 1; padding: 0.4rem; border: none; border-radius: 6px; font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
              Log In
            </button>
            <button type="button" id="uni-auth-tab-signup" onclick="UniAuth.switchTab('signup')" class="uni-auth-tab" style="flex: 1; padding: 0.4rem; border: none; border-radius: 6px; font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
              Create Account
            </button>
          </div>

          <!-- Alert Messages -->
          <div id="uni-auth-error-box" style="display: none; background: #fee2e2; border: 1px solid #fca5a5; color: #991b1b; padding: 0.6rem 0.85rem; border-radius: 8px; font-size: 0.82rem; margin-bottom: 0.75rem;"></div>
          <div id="uni-auth-success-box" style="display: none; background: #dcfce7; border: 1px solid #86efac; color: #166534; padding: 0.6rem 0.85rem; border-radius: 8px; font-size: 0.82rem; margin-bottom: 0.75rem;"></div>

          <!-- Passwordless 6-Digit Email OTP Form -->
          <form id="uni-auth-otp-form" onsubmit="UniAuth.handleFormSubmit(event)" style="display: flex; flex-direction: column; gap: 0.75rem; width: 100%;">
            <div class="form-group" style="margin: 0; width: 100%; display: flex; flex-direction: column;">
              <label for="uni-auth-email" class="form-label" style="font-size: 0.82rem; font-weight: 600; color: #1e293b; margin-bottom: 0.3rem; display: block;">Email Address</label>
              <input type="email" id="uni-auth-email" class="form-input" placeholder="you@uni-nest.app" required style="width: 100%; box-sizing: border-box; padding: 0.65rem 0.85rem; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem; background: #ffffff; color: #0f172a; outline: none; transition: border-color 0.2s, box-shadow 0.2s;" />
            </div>

            <button type="submit" id="uni-auth-submit-btn" class="btn btn-primary" style="width: 100%; height: 40px; padding: 0.55rem 1.25rem; font-weight: 600; border-radius: 8px; font-size: 0.88rem; margin-top: 0.2rem; background: #2563eb; color: #ffffff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25); transition: all 0.2s ease;">
              🔢 Send 6-Digit Verification Code
            </button>
          </form>

          <p id="uni-auth-switch-prompt" style="text-align: center; margin: 0.85rem 0 0 0; font-size: 0.82rem; color: #64748b;">
            Don't have an account? <a href="javascript:void(0)" onclick="UniAuth.switchTab('signup')" style="color: #2563eb; font-weight: 600; text-decoration: none;">Sign up</a>
          </p>
        </div>

        <div style="background: #f8fafc; padding: 0.65rem 1.25rem; border-top: 1px solid #f1f5f9; text-align: center; font-size: 0.72rem; color: #94a3b8; flex-shrink: 0;">
          🔒 Secure passwordless authentication powered by Google &amp; Supabase OTP.
        </div>
      </div>
    `;

    document.body.appendChild(modalDiv);

    // Close on backdrop click
    modalDiv.addEventListener('click', (e) => {
      if (e.target === modalDiv) {
        UniAuth.closeAuthModal();
      }
    });

    // Close on Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        UniAuth.closeAuthModal();
      }
    });
  }

  // Initialize on load
  document.addEventListener('DOMContentLoaded', async () => {
    ensureAuthModalInDom();

    // 1. Check unified client session (cookie or localStorage)
    const storedUser = UniAuth.getStoredUser();
    if (storedUser) {
      UniAuth._user = storedUser;
    }

    // 2. Implicit Flow: Extract and verify URL fragment (#access_token=...&refresh_token=...)
    if (window.location.hash && window.location.hash.includes('access_token')) {
      try {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken && refreshToken && window.supabaseClient) {
          const { data, error } = await window.supabaseClient.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          if (!error && data?.user) {
            UniAuth._user = data.user;
            UniAuth.saveClientSession(data.user);
            UniAuth.showToast('✓ Account confirmed! You are now logged in.', 'success');
            if (window.history && window.history.replaceState) {
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
          }
        }
      } catch (hashErr) {
        console.warn('Implicit token extraction error:', hashErr);
      }
    }

    // 3. Check existing Supabase session
    try {
      if (window.supabaseClient && window.supabaseClient.auth) {
        const { data } = await window.supabaseClient.auth.getSession();
        if (data?.session?.user) {
          UniAuth._user = data.session.user;
          UniAuth.saveClientSession(UniAuth._user);
        }

        // Listen for auth state changes
        window.supabaseClient.auth.onAuthStateChange((event, session) => {
          if (session?.user) {
            UniAuth._user = session.user;
            UniAuth.saveClientSession(session.user);
          }
          UniAuth.renderNavActions();
        });
      }
    } catch (e) {
      console.warn('Supabase session initialization notice:', e);
    }

    UniAuth.renderNavActions();
  });
})();
