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
        document.body.style.overflow = '';
      }
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
        if (submitBtn) submitBtn.textContent = this._activeMethod === 'magic' ? 'Send Magic Sign-In Link' : 'Log In';
        if (switchText) {
          switchText.innerHTML = `Don't have an account? <a href="javascript:void(0)" onclick="UniAuth.switchTab('signup')">Sign up</a>`;
        }
      } else {
        if (kicker) kicker.textContent = 'Get started';
        if (title) title.textContent = 'Create your account';
        if (submitBtn) submitBtn.textContent = 'Create Account';
        if (switchText) {
          switchText.innerHTML = `Already have an account? <a href="javascript:void(0)" onclick="UniAuth.switchTab('signin')">Log in</a>`;
        }
      }
      this.clearMessages();
    },

    switchMethod(method) {
      this._activeMethod = method;
      const passBtn = document.getElementById('uni-auth-method-pass');
      const magicBtn = document.getElementById('uni-auth-method-magic');
      const passGroup = document.getElementById('uni-auth-password-group');
      const submitBtn = document.getElementById('uni-auth-submit-btn');

      if (passBtn && magicBtn) {
        passBtn.classList.toggle('active', method === 'password');
        magicBtn.classList.toggle('active', method === 'magic');
      }

      if (passGroup) {
        passGroup.style.display = (method === 'password') ? 'block' : 'none';
      }

      if (submitBtn) {
        if (method === 'magic') {
          submitBtn.textContent = 'Send Magic Sign-In Link ✨';
        } else {
          submitBtn.textContent = (this._activeTab === 'signup') ? 'Create Account' : 'Log In';
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
      if (errBox) {
        errBox.textContent = msg;
        errBox.style.display = 'block';
      } else {
        this.showToast(msg, 'error');
      }
    },

    showSuccess(msg) {
      const succBox = document.getElementById('uni-auth-success-box');
      if (succBox) {
        succBox.textContent = msg;
        succBox.style.display = 'block';
      } else {
        this.showToast(msg, 'success');
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

      if (this._activeMethod === 'password' && !password) {
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

        // Method 1: Magic Link (Passwordless)
        if (this._activeMethod === 'magic') {
          const { error } = await window.supabaseClient.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: window.location.href
            }
          });

          if (error) throw error;

          this.showSuccess(`✨ Magic link sent to ${email}! Check your inbox to sign in instantly.`);
          if (submitBtn) submitBtn.disabled = false;
          return;
        }

        // Method 2: Create Account (Sign Up)
        if (this._activeTab === 'signup') {
          if (password.length < 6) {
            throw new Error('Password must be at least 6 characters.');
          }

          const { data, error } = await window.supabaseClient.auth.signUp({
            email,
            password
          });

          if (error) throw error;

          if (data?.session?.user) {
            this._user = data.session.user;
            this.onAuthSuccess('Account created and logged in!');
          } else {
            this.showSuccess('✓ Account registered! You can now log in.');
            this.switchTab('signin');
            if (passInput) passInput.value = '';
          }
        } 
        // Method 3: Sign In
        else {
          const { data, error } = await window.supabaseClient.auth.signInWithPassword({
            email,
            password
          });

          if (error) throw error;

          this._user = data.user;
          this.onAuthSuccess(`Welcome back, ${email.split('@')[0]}!`);
        }
      } catch (err) {
        console.error('Auth error:', err);
        this.showError(err.message || 'Authentication failed. Please check your credentials.');
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
      <div class="uni-modal-dialog uni-auth-dialog" style="max-width: 440px; border-radius: 18px; padding: 0; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
        
        <!-- Modal Header -->
        <div style="padding: 1.5rem 1.75rem 1rem 1.75rem; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div id="uni-auth-kicker" style="font-size: 0.78rem; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.25rem;">Welcome back</div>
            <h3 id="uni-auth-title" style="margin: 0; font-size: 1.35rem; color: #0f172a; font-weight: 700;">Log in to UniNest</h3>
            <p id="uni-auth-modal-reason" style="margin: 0.4rem 0 0 0; font-size: 0.84rem; color: #64748b; line-height: 1.45;"></p>
          </div>
          <button type="button" class="uni-modal-close-btn" onclick="UniAuth.closeAuthModal()" style="margin-left: 1rem;">&times;</button>
        </div>

        <div style="padding: 1.5rem 1.75rem;">
          
          <!-- One-Click Google OAuth -->
          <button type="button" id="uni-auth-google-btn" onclick="UniAuth.signInWithGoogle()" class="btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.75rem; background: #ffffff; border: 1.5px solid #e2e8f0; color: #0f172a; padding: 0.7rem 1rem; border-radius: 10px; font-weight: 600; font-size: 0.92rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06); cursor: pointer; transition: all 0.2s ease; margin-bottom: 1.25rem;">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Continue with Google
          </button>

          <!-- Divider -->
          <div style="display: flex; align-items: center; margin: 0 0 1.25rem 0; color: #94a3b8; font-size: 0.78rem; font-weight: 600;">
            <div style="flex: 1; height: 1px; background: #e2e8f0;"></div>
            <span style="padding: 0 0.75rem; text-transform: uppercase; letter-spacing: 0.5px;">or with email</span>
            <div style="flex: 1; height: 1px; background: #e2e8f0;"></div>
          </div>

          <!-- Tabs (Sign In vs Create Account) -->
          <div style="display: flex; background: #f1f5f9; padding: 0.25rem; border-radius: 9px; margin-bottom: 1.25rem;">
            <button type="button" id="uni-auth-tab-signin" onclick="UniAuth.switchTab('signin')" class="uni-auth-tab active" style="flex: 1; padding: 0.45rem; border: none; border-radius: 7px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
              Log In
            </button>
            <button type="button" id="uni-auth-tab-signup" onclick="UniAuth.switchTab('signup')" class="uni-auth-tab" style="flex: 1; padding: 0.45rem; border: none; border-radius: 7px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
              Create Account
            </button>
          </div>

          <!-- Method Switcher (Password vs Magic Link) -->
          <div style="display: flex; gap: 0.5rem; margin-bottom: 1.25rem;">
            <button type="button" id="uni-auth-method-pass" onclick="UniAuth.switchMethod('password')" class="uni-auth-method active" style="flex: 1; padding: 0.4rem; font-size: 0.8rem; font-weight: 600; border: 1px solid #cbd5e1; border-radius: 6px; background: #ffffff; cursor: pointer;">
              🔑 Password
            </button>
            <button type="button" id="uni-auth-method-magic" onclick="UniAuth.switchMethod('magic')" class="uni-auth-method" style="flex: 1; padding: 0.4rem; font-size: 0.8rem; font-weight: 600; border: 1px solid #cbd5e1; border-radius: 6px; background: #f8fafc; cursor: pointer;">
              ✨ Magic Link
            </button>
          </div>

          <!-- Alert Messages -->
          <div id="uni-auth-error-box" style="display: none; background: #fee2e2; border: 1px solid #fca5a5; color: #991b1b; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.85rem; margin-bottom: 1rem;"></div>
          <div id="uni-auth-success-box" style="display: none; background: #dcfce7; border: 1px solid #86efac; color: #166534; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.85rem; margin-bottom: 1rem;"></div>

          <!-- Auth Form -->
          <form onsubmit="UniAuth.handleFormSubmit(event)" style="display: flex; flexDirection: column; gap: 0.85rem;">
            <div class="form-group" style="margin-bottom: 0.85rem;">
              <label class="form-label" style="font-size: 0.85rem; font-weight: 600; color: #1e293b; margin-bottom: 0.35rem; display: block;">Student Email</label>
              <input type="email" id="uni-auth-email" class="form-input" placeholder="student@campus.ac.ke" required style="width: 100%; padding: 0.65rem 0.85rem; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem;" />
            </div>

            <div id="uni-auth-password-group" class="form-group" style="margin-bottom: 0.85rem;">
              <label class="form-label" style="font-size: 0.85rem; font-weight: 600; color: #1e293b; margin-bottom: 0.35rem; display: flex; justify-content: space-between;">
                <span>Password</span>
                <span style="font-size: 0.76rem; color: #64748b; font-weight: normal;">(Min 6 characters)</span>
              </label>
              <div style="position: relative;">
                <input type="password" id="uni-auth-password" class="form-input" placeholder="••••••••" style="width: 100%; padding: 0.65rem 2.5rem 0.65rem 0.85rem; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem;" />
                <button type="button" onclick="toggleAuthPasswordVisibility()" style="position: absolute; right: 0.65rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #64748b; font-size: 0.9rem;">👁️</button>
              </div>
            </div>

            <button type="submit" id="uni-auth-submit-btn" class="btn btn-primary" style="width: 100%; padding: 0.75rem; font-weight: 600; border-radius: 8px; font-size: 0.95rem; margin-top: 0.25rem;">
              Log In
            </button>
          </form>

          <p id="uni-auth-switch-prompt" style="text-align: center; margin: 1.25rem 0 0 0; font-size: 0.85rem; color: #64748b;">
            Don't have an account? <a href="javascript:void(0)" onclick="UniAuth.switchTab('signup')" style="color: #2563eb; font-weight: 600;">Sign up</a>
          </p>
        </div>

        <div style="background: #f8fafc; padding: 0.75rem 1.75rem; border-top: 1px solid #f1f5f9; text-align: center; font-size: 0.75rem; color: #94a3b8;">
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

    // 2. Check existing Supabase session
    try {
      if (window.supabaseClient && window.supabaseClient.auth) {
        const { data } = await window.supabaseClient.auth.getSession();
        if (data?.session?.user) {
          UniAuth._user = data.session.user;
          UniAuth.saveClientSession(UniAuth._user);
        }

        // Listen for auth state changes (e.g. after Google OAuth redirect)
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
