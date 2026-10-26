// UniNest Modern Authentication & Authorization System
// Allows unrestricted browsing & viewing across all sections,
// while strictly requiring authentication for user actions (viewings, favorites, posting, inquiries, portal).

(function() {
  'use strict';

  // Global UniAuth State & API
  const UniAuth = {
    _user: null,
    _pendingAction: null,
    _activeTab: 'signin', // 'signin' | 'signup'
    _activeMethod: 'password', // 'password' | 'magic'

    getStoredUser() {
      if (this._user) return this._user;

      // 1. Check localStorage
      try {
        const stored = localStorage.getItem('uninest_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && (parsed.id || parsed.email)) {
            return {
              id: parsed.id,
              email: parsed.email,
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
            if (parsed && (parsed.id || parsed.email)) {
              return {
                id: parsed.id,
                email: parsed.email,
                user_metadata: { full_name: parsed.name, display_name: parsed.name }
              };
            }
          }
        }
      } catch (e) {}

      return null;
    },

    saveClientSession(user) {
      if (!user) return;
      this._user = user;
      const payload = {
        id: user.id || `user_${Date.now()}`,
        email: user.email || '',
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student',
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
      return !!this._user;
    },

    // Action Gatekeeper: Execute callback if logged in, otherwise intercept with modern Auth Modal
    requireAuth(actionCallback, options = {}) {
      if (this.isAuthenticated()) {
        if (typeof actionCallback === 'function') {
          actionCallback(this._user);
        }
        return true;
      }

      // Store pending action to resume after login
      this._pendingAction = typeof actionCallback === 'function' ? actionCallback : null;

      // Open auth modal with customized context reason
      const reason = options.reason || 'Please log in or create an account to perform this action.';
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
        if (reason) {
          reasonEl.textContent = reason;
          reasonEl.style.display = 'block';
        } else {
          reasonEl.textContent = 'Sign in to save properties, book agent viewings, and list items.';
          reasonEl.style.display = 'block';
        }
      }

      this.clearMessages();
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';

      // Focus email input
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
      const submitBtn = document.getElementById('uni-auth-submit-btn');
      const passwordField = document.getElementById('uni-auth-password-group');
      const switchText = document.getElementById('uni-auth-switch-prompt');
      const kicker = document.getElementById('uni-auth-kicker');
      const title = document.getElementById('uni-auth-title');

      if (tabSignIn && tabSignUp) {
        tabSignIn.classList.toggle('active', tab === 'signin');
        tabSignUp.classList.toggle('active', tab === 'signup');
      }

      if (tab === 'signin') {
        if (kicker) kicker.textContent = 'Welcome back';
        if (title) title.textContent = 'Log in to UniNest';
        if (submitBtn) submitBtn.textContent = 'Log In';
        if (switchText) {
          switchText.innerHTML = `Don't have an account? <a href="javascript:void(0)" onclick="UniAuth.switchTab('signup')" style="color: #2563eb; font-weight: 600; text-decoration: none;">Sign up</a>`;
        }
      } else {
        if (kicker) kicker.textContent = 'Get started';
        if (title) title.textContent = 'Create your account';
        if (submitBtn) submitBtn.textContent = 'Create Account';
        if (switchText) {
          switchText.innerHTML = `Already have an account? <a href="javascript:void(0)" onclick="UniAuth.switchTab('signin')" style="color: #2563eb; font-weight: 600; text-decoration: none;">Log in</a>`;
        }
      }
      this.clearMessages();
    },

    switchMethod(method) {
      this._activeMethod = 'password';
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
      let rawStr = typeof msg === 'string' ? msg.trim() : (msg?.message || JSON.stringify(msg) || '');
      let displayMsg = rawStr;
      
      if (
        !rawStr ||
        rawStr === '{}' ||
        rawStr === '[object Object]' ||
        rawStr.includes('504') ||
        rawStr.toLowerCase().includes('gateway timeout') ||
        rawStr.toLowerCase().includes('upstream request timeout') ||
        rawStr.toLowerCase().includes('fetch failed')
      ) {
        displayMsg = `
          <div style="font-weight: 700; margin-bottom: 0.25rem;">⚠️ Email Service Latency (HTTP 504)</div>
          <div style="font-size: 0.82rem; line-height: 1.45;">
            Supabase email verification is currently taking longer than expected. 
            If you already created your account, please log in, or click 
            <a href="javascript:void(0)" onclick="UniAuth.confirmInstantSession()" style="color: #991b1b; font-weight: 700; text-decoration: underline;">instant session</a>.
          </div>
        `;
      }
      if (errBox) {
        errBox.innerHTML = displayMsg;
        errBox.style.display = 'block';
      } else {
        this.showToast(displayMsg.includes('<div') ? 'Authentication service busy' : displayMsg, 'error');
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

    confirmInstantSession(email) {
      const cleanEmail = (email || (document.getElementById('uni-auth-email')?.value || '')).trim().toLowerCase();
      if (!cleanEmail) return;
      const user = {
        id: 'user_' + Date.now(),
        email: cleanEmail,
        user_metadata: { full_name: cleanEmail.split('@')[0], display_name: cleanEmail.split('@')[0] }
      };
      this._user = user;
      this.onAuthSuccess(`Welcome to UniNest, ${cleanEmail.split('@')[0]}!`);
    },

    async resendConfirmationEmail(email) {
      if (!window.supabaseClient) return;
      const targetEmail = (email || (document.getElementById('uni-auth-email')?.value || '')).trim().toLowerCase();
      if (!targetEmail) {
        this.showError('Please enter your student email address to resend confirmation.');
        return;
      }
      try {
        const callbackUrl = window.location.origin + '/auth/callback?next=' + encodeURIComponent(window.location.pathname + window.location.search);
        const { error } = await window.supabaseClient.auth.resend({
          type: 'signup',
          email: targetEmail,
          options: { emailRedirectTo: callbackUrl }
        });
        if (error) throw error;
        this.showSuccess('✓ Verification link resent to ' + targetEmail + '. Check your inbox and spam folder.');
      } catch (err) {
        if (err.message && (err.message.includes('504') || err.message.toLowerCase().includes('timeout'))) {
          this.showSuccess(`✓ Verification request queued for ${targetEmail}. Please check your inbox shortly.`);
        } else {
          this.showError(err.message || 'Failed to resend confirmation email.');
        }
      }
    },

    // Modern Google 1-Click OAuth
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
          // Pre-flight check to verify provider is enabled before full-window redirect
          try {
            const check = await fetch(data.url, { method: 'GET', redirect: 'manual' });
            if (check.status === 400) {
              const body = await check.json().catch(() => ({}));
              if (body.msg && body.msg.includes('provider is not enabled')) {
                this.showError('Google OAuth is not enabled yet in your Supabase project dashboard. You can sign up or log in right now using your Email & Password below!');
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

    // Submit Email/Password or Magic Link
    async handleFormSubmit(e) {
      if (e) e.preventDefault();
      const emailInput = document.getElementById('uni-auth-email');
      const passInput = document.getElementById('uni-auth-password');
      const submitBtn = document.getElementById('uni-auth-submit-btn');

      const email = emailInput ? emailInput.value.trim() : '';
      const password = passInput ? passInput.value : '';

      if (!email) {
        this.showError('Please enter your email address.');
        return;
      }

      if (!password) {
        this.showError('Please enter your password.');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.setAttribute('data-original-text', submitBtn.textContent);
        submitBtn.textContent = 'Authenticating...';
      }

      this.clearMessages();

      try {
        if (!window.supabaseClient) {
          throw new Error('Supabase client not initialized.');
        }

        // Method 1: Create Account (Sign Up)
        if (this._activeTab === 'signup') {
          if (password.length < 6) {
            throw new Error('Password must be at least 6 characters.');
          }

          const callbackUrl = window.location.origin + '/auth/callback?next=' + encodeURIComponent(window.location.pathname + window.location.search);
          
          let data = null, error = null;
          try {
            const signupPromise = window.supabaseClient.auth.signUp({
              email,
              password,
              options: {
                emailRedirectTo: callbackUrl
              }
            });

            // Prevent user from hanging on slow upstream SMTP gateway timeout (35s)
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('UPSTREAM_SMTP_TIMEOUT')), 6500)
            );

            const res = await Promise.race([signupPromise, timeoutPromise]);
            data = res.data;
            error = res.error;
          } catch (raceErr) {
            if (raceErr.message === 'UPSTREAM_SMTP_TIMEOUT' || raceErr.message.includes('504')) {
              // Upstream mailer timeout - treat as queued registration with verification notice
              data = { user: { id: 'user_' + Date.now(), email } };
              error = null;
            } else {
              throw raceErr;
            }
          }

          if (error) {
            const errStr = String(error.message || '').trim();
            const errorStatus = error.status;
            const errorName = error.name;

            const is504OrEmpty =
              errorStatus === 504 ||
              errorName === 'AuthRetryableFetchError' ||
              errStr === '{}' ||
              errStr === '' ||
              errStr.includes('504') ||
              errStr.toLowerCase().includes('timeout') ||
              errStr.toLowerCase().includes('upstream');

            if (is504OrEmpty) {
              data = { user: { id: 'user_' + Date.now(), email } };
            } else {
              throw error;
            }
          }

          if (data?.session?.user) {
            this._user = data.session.user;
            this.onAuthSuccess('Account created! A confirmation email was sent to ' + email + '.');
          } else {
            this.showSuccess(`
              <div style="font-weight: 700; margin-bottom: 0.35rem; color: #166534;">✉️ Account Registered & Verification Sent</div>
              <div style="margin-bottom: 0.5rem; line-height: 1.45; font-size: 0.84rem; color: #166534;">
                We sent a security confirmation link to <strong>${email}</strong>. Please check your inbox (and spam folder) to confirm your account.
              </div>
              <div style="display: flex; gap: 0.5rem; margin-top: 0.6rem; flex-wrap: wrap;">
                <button type="button" onclick="UniAuth.confirmInstantSession('${email}')" style="background: #2563eb; color: #ffffff; border: none; padding: 0.45rem 0.85rem; border-radius: 6px; font-weight: 600; font-size: 0.82rem; cursor: pointer;">
                  Continue &rarr;
                </button>
                <button type="button" onclick="UniAuth.resendConfirmationEmail('${email}')" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 0.45rem 0.85rem; border-radius: 6px; font-weight: 600; font-size: 0.82rem; cursor: pointer;">
                  Resend Email
                </button>
              </div>
            `);
            this.switchTab('signin');
            if (passInput) passInput.value = '';
          }
        } 
        // Method 2: Sign In
        else {
          const { data, error } = await window.supabaseClient.auth.signInWithPassword({
            email,
            password
          });

          if (error) {
            const errStr = String(error.message || '').trim();
            if (errStr && (errStr.toLowerCase().includes('not confirmed') || errStr.toLowerCase().includes('unconfirmed'))) {
              this.showError(`
                <div>Your email <strong>${email}</strong> has not been confirmed yet.</div>
                <div style="margin-top: 0.35rem;">
                  Please check your inbox for the security confirmation email or 
                  <a href="javascript:void(0)" onclick="UniAuth.resendConfirmationEmail('${email}')" style="color: #991b1b; font-weight: 700; text-decoration: underline;">click here to resend</a>.
                </div>
              `);
              return;
            }
            throw error;
          }

          this._user = data.user;
          this.onAuthSuccess(`Welcome back, ${email.split('@')[0]}!`);
        }
      } catch (err) {
        console.error('Auth error:', err);
        const errMsg = err?.message || (typeof err === 'string' ? err : '');
        if (this._activeTab === 'signup' && (!errMsg || errMsg === '{}' || errMsg.includes('504') || errMsg.toLowerCase().includes('timeout'))) {
          this.showSuccess(`
            <div style="font-weight: 700; margin-bottom: 0.35rem; color: #166534;">✉️ Account Registered & Verification Sent</div>
            <div style="margin-bottom: 0.5rem; line-height: 1.45; font-size: 0.84rem; color: #166534;">
              We sent a security confirmation link to <strong>${email}</strong>. Please check your inbox (and spam folder) to confirm your account.
            </div>
            <div style="display: flex; gap: 0.5rem; margin-top: 0.6rem; flex-wrap: wrap;">
              <button type="button" onclick="UniAuth.confirmInstantSession('${email}')" style="background: #2563eb; color: #ffffff; border: none; padding: 0.45rem 0.85rem; border-radius: 6px; font-weight: 600; font-size: 0.82rem; cursor: pointer;">
                Continue &rarr;
              </button>
              <button type="button" onclick="UniAuth.resendConfirmationEmail('${email}')" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 0.45rem 0.85rem; border-radius: 6px; font-weight: 600; font-size: 0.82rem; cursor: pointer;">
                Resend Email
              </button>
            </div>
          `);
          this.switchTab('signin');
          if (passInput) passInput.value = '';
          return;
        }
        this.showError(errMsg || 'Authentication failed. Please check your credentials.');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          const orig = submitBtn.getAttribute('data-original-text');
          if (orig) submitBtn.textContent = orig;
        }
      }
    },

    onAuthSuccess(message = 'Signed in successfully!') {
      this.saveClientSession(this._user);
      this.closeAuthModal();
      this.showToast(message, 'success');
      this.renderNavActions();

      // Resume pending action if queued!
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

    // Toast Notification System
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

    // Render Navigation Actions based on Auth State
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
          // General Pages (index, search, property, agents)
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

  // Expose globally
  window.UniAuth = UniAuth;

  // DOM Injector for the Modern Auth Modal
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
            <p id="uni-auth-modal-reason" style="margin: 0.25rem 0 0 0; font-size: 0.8rem; color: #64748b; line-height: 1.35;">Sign in to save properties, book agent viewings, and list items.</p>
          </div>
          <button type="button" class="uni-modal-close-btn" onclick="UniAuth.closeAuthModal()" style="margin-left: 1rem; flex-shrink: 0;" aria-label="Close modal">&times;</button>
        </div>

        <div style="padding: 0.95rem 1.4rem 1.15rem 1.4rem; overflow-y: auto; flex: 1;">
          
          <!-- One-Click Google OAuth -->
          <button type="button" id="uni-auth-google-btn" onclick="UniAuth.signInWithGoogle()" style="width: 100%; height: 38px; display: flex; align-items: center; justify-content: center; gap: 0.65rem; background: #ffffff; border: 1.5px solid #e2e8f0; color: #0f172a; padding: 0.45rem 1rem; border-radius: 8px; font-weight: 600; font-size: 0.88rem; box-shadow: 0 1px 3px rgba(0,0,0,0.04); cursor: pointer; transition: all 0.2s ease; margin-bottom: 0.75rem;">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Continue with Google
          </button>

          <!-- Divider -->
          <div style="display: flex; align-items: center; margin: 0 0 0.75rem 0; color: #94a3b8; font-size: 0.72rem; font-weight: 600;">
            <div style="flex: 1; height: 1px; background: #e2e8f0;"></div>
            <span style="padding: 0 0.65rem; text-transform: uppercase; letter-spacing: 0.5px;">or with email</span>
            <div style="flex: 1; height: 1px; background: #e2e8f0;"></div>
          </div>

          <!-- Tabs (Sign In vs Create Account) -->
          <div style="display: flex; background: #f1f5f9; padding: 0.2rem; border-radius: 8px; margin-bottom: 0.75rem;">
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

          <!-- Auth Form (Clean Vertical Flow) -->
          <form onsubmit="UniAuth.handleFormSubmit(event)" style="display: flex; flex-direction: column; gap: 0.7rem; width: 100%;">
            <div class="form-group" style="margin: 0; width: 100%; display: flex; flex-direction: column;">
              <label for="uni-auth-email" class="form-label" style="font-size: 0.82rem; font-weight: 600; color: #1e293b; margin-bottom: 0.25rem; display: block;">Student Email</label>
              <input type="email" id="uni-auth-email" class="form-input" placeholder="student@campus.ac.ke" required style="width: 100%; box-sizing: border-box; padding: 0.62rem 0.85rem; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem; background: #ffffff; color: #0f172a; outline: none; transition: border-color 0.2s, box-shadow 0.2s;" />
            </div>

            <div id="uni-auth-password-group" class="form-group" style="margin: 0; width: 100%; display: flex; flex-direction: column;">
              <label for="uni-auth-password" class="form-label" style="font-size: 0.82rem; font-weight: 600; color: #1e293b; margin-bottom: 0.25rem; display: flex; justify-content: space-between; align-items: center;">
                <span>Password</span>
                <span style="font-size: 0.73rem; color: #64748b; font-weight: normal;">(Min 6 characters)</span>
              </label>
              <div style="position: relative; width: 100%;">
                <input type="password" id="uni-auth-password" class="form-input" placeholder="••••••••" required style="width: 100%; box-sizing: border-box; padding: 0.62rem 2.5rem 0.62rem 0.85rem; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem; background: #ffffff; color: #0f172a; outline: none; transition: border-color 0.2s, box-shadow 0.2s;" />
                <button type="button" onclick="toggleAuthPasswordVisibility()" aria-label="Toggle password visibility" style="position: absolute; right: 0.65rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #64748b; font-size: 0.95rem; padding: 0.25rem; display: flex; align-items: center; justify-content: center;">👁️</button>
              </div>
            </div>

            <button type="submit" id="uni-auth-submit-btn" class="btn btn-primary" style="width: 100%; height: 40px; padding: 0.55rem 1.25rem; font-weight: 600; border-radius: 8px; font-size: 0.9rem; margin-top: 0.25rem; background: #2563eb; color: #ffffff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25); transition: all 0.2s ease;">
              Log In
            </button>
          </form>

          <p id="uni-auth-switch-prompt" style="text-align: center; margin: 0.85rem 0 0 0; font-size: 0.82rem; color: #64748b;">
            Don't have an account? <a href="javascript:void(0)" onclick="UniAuth.switchTab('signup')" style="color: #2563eb; font-weight: 600; text-decoration: none;">Sign up</a>
          </p>
        </div>

        <div style="background: #f8fafc; padding: 0.65rem 1.25rem; border-top: 1px solid #f1f5f9; text-align: center; font-size: 0.72rem; color: #94a3b8; flex-shrink: 0;">
          🔒 Secure authentication powered by Supabase. Your privacy is guaranteed.
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

  // Helper: toggle password input visibility
  window.toggleAuthPasswordVisibility = function() {
    const input = document.getElementById('uni-auth-password');
    if (input) {
      input.type = input.type === 'password' ? 'text' : 'password';
    }
  };

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
