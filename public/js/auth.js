// UniNest Simplified Email-Only Authentication System
// Allows instant sign-in with just an email address for both the Agent Portal and all client actions.

(function() {
  'use strict';

  const UniAuth = {
    _user: null,
    _pendingAction: null,
    _activeTab: 'signin',

    getStoredUser() {
      if (this._user) return this._user;

      // 1. Check localStorage
      try {
        const stored = localStorage.getItem('uninest_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.email) {
            const name = parsed.name || parsed.email.split('@')[0];
            return {
              id: parsed.id || 'user_' + parsed.email.replace(/[^a-z0-9]/gi, '_'),
              email: parsed.email,
              name: name,
              user_metadata: { full_name: name, display_name: name }
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
              const name = parsed.name || parsed.email.split('@')[0];
              return {
                id: parsed.id || 'user_' + parsed.email.replace(/[^a-z0-9]/gi, '_'),
                email: parsed.email,
                name: name,
                user_metadata: { full_name: name, display_name: name }
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
      const name = user.user_metadata?.full_name || user.name || cleanEmail.split('@')[0] || 'User';
      const id = user.id || ('user_' + cleanEmail.replace(/[^a-z0-9]/g, '_'));

      this._user = {
        id,
        email: cleanEmail,
        name,
        user_metadata: { full_name: name, display_name: name }
      };

      const payload = {
        id,
        email: cleanEmail,
        name,
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

    // Execute callback if signed in; otherwise open the simple email sign-in modal
    requireAuth(actionCallback, options = {}) {
      if (this.isAuthenticated()) {
        if (typeof actionCallback === 'function') {
          actionCallback(this._user);
        }
        return true;
      }

      this._pendingAction = typeof actionCallback === 'function' ? actionCallback : null;
      const reason = options.reason || 'Enter your email address to continue.';
      this.openAuthModal(options.mode || 'signin', reason);
      return false;
    },

    openAuthModal(tab = 'signin', reason = '') {
      ensureAuthModalInDom();
      const modal = document.getElementById('uni-auth-modal');
      if (!modal) return;

      this._activeTab = tab;
      const reasonEl = document.getElementById('uni-auth-modal-reason');
      if (reasonEl) {
        reasonEl.textContent =
          reason || 'Enter your email address below to access client features or the Agent Portal.';
        reasonEl.style.display = 'block';
      }

      this.clearMessages();
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';

      setTimeout(() => {
        const emailInput = document.getElementById('uni-auth-email');
        if (emailInput) emailInput.focus();
      }, 80);
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
      this.clearMessages();
    },

    clearMessages() {
      const errBox = document.getElementById('uni-auth-error-box');
      if (errBox) {
        errBox.textContent = '';
        errBox.style.display = 'none';
      }
    },

    showError(msg) {
      const errBox = document.getElementById('uni-auth-error-box');
      const text = typeof msg === 'string' ? msg : (msg?.message || 'Please enter a valid email address.');
      if (errBox) {
        errBox.textContent = text;
        errBox.style.display = 'block';
      } else {
        this.showToast(text, 'error');
      }
    },

    handleFormSubmit(e) {
      if (e) e.preventDefault();
      const emailInput = document.getElementById('uni-auth-email');
      const rawEmail = emailInput ? emailInput.value.trim().toLowerCase() : '';

      if (!rawEmail || !rawEmail.includes('@')) {
        this.showError('Please enter a valid email address.');
        return;
      }

      const name = rawEmail.split('@')[0];
      const user = {
        id: 'user_' + rawEmail.replace(/[^a-z0-9]/g, '_'),
        email: rawEmail,
        name: name,
        user_metadata: { full_name: name, display_name: name }
      };

      this._user = user;
      this.onAuthSuccess(`Signed in as ${rawEmail}`);
    },

    onAuthSuccess(message = 'Signed in successfully!') {
      this.saveClientSession(this._user);
      this.closeAuthModal();
      this.showToast(message, 'success');
      this.renderNavActions();

      if (this._pendingAction) {
        const action = this._pendingAction;
        this._pendingAction = null;
        setTimeout(() => {
          try {
            action(this._user);
          } catch (e) {
            console.error('Error resuming action:', e);
          }
        }, 120);
      }
    },

    async signOut(reloadPage = true) {
      try {
        localStorage.removeItem('uninest_user');
        document.cookie = 'uninest_user_client=; path=/; max-age=0; SameSite=Lax';
        document.cookie = 'uninest_user_session=; path=/; max-age=0; SameSite=Lax';
        if (window.supabaseClient && window.supabaseClient.auth) {
          await window.supabaseClient.auth.signOut().catch(() => {});
        }
      } catch (e) {}
      this._user = null;
      this.renderNavActions();
      if (reloadPage) {
        this.showToast('You have been signed out.', 'info');
        window.location.reload();
      }
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
      }, 3500);
    },

    renderNavActions() {
      const navActionsContainers = document.querySelectorAll('.nav-actions');
      if (!navActionsContainers.length) return;

      const user = this._user;
      const emailName = user?.email ? user.email.split('@')[0] : 'Student';
      const initial = emailName.charAt(0).toUpperCase();
      const isMarketplacePage =
        document.body.classList.contains('page-marketplace') ||
        window.location.pathname.includes('marketplace.html');

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
              <button type="button" class="btn btn-primary" onclick="UniAuth.openAuthModal('signin')" style="padding: 0.45rem 0.95rem; font-size: 0.85rem; font-weight: 600;">Sign In with Email</button>
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
              <button type="button" class="btn btn-primary" onclick="UniAuth.openAuthModal('signin')" style="font-size: 0.85rem; padding: 0.45rem 0.95rem; font-weight: 600;">Sign In with Email</button>
            `;
          }
        }

        container.innerHTML = html;
      });
    }
  };

  window.UniAuth = UniAuth;

  function ensureAuthModalInDom() {
    if (document.getElementById('uni-auth-modal')) return;

    const modalDiv = document.createElement('div');
    modalDiv.id = 'uni-auth-modal';
    modalDiv.className = 'uni-modal-overlay uni-auth-overlay';
    modalDiv.innerHTML = `
      <div class="uni-modal-dialog uni-auth-dialog" style="max-width: 410px; width: 100%; border-radius: 18px; padding: 0; box-shadow: 0 20px 40px rgba(0,0,0,0.2); background: #ffffff; margin: auto; display: flex; flex-direction: column; overflow: hidden;">
        
        <div style="padding: 1.25rem 1.4rem 0.9rem 1.4rem; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-size: 0.72rem; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.2rem;">QUICK EMAIL ACCESS</div>
            <h3 style="margin: 0; font-size: 1.25rem; color: #0f172a; font-weight: 700; letter-spacing: -0.01em;">Sign in with your Email</h3>
            <p id="uni-auth-modal-reason" style="margin: 0.3rem 0 0 0; font-size: 0.82rem; color: #64748b; line-height: 1.4;">Enter your email address below to access client features or the Agent Portal.</p>
          </div>
          <button type="button" class="uni-modal-close-btn" onclick="UniAuth.closeAuthModal()" style="margin-left: 1rem; flex-shrink: 0;" aria-label="Close modal">&times;</button>
        </div>

        <div style="padding: 1.15rem 1.4rem 1.35rem 1.4rem;">
          <div id="uni-auth-error-box" style="display: none; background: #fee2e2; border: 1px solid #fca5a5; color: #991b1b; padding: 0.6rem 0.85rem; border-radius: 8px; font-size: 0.82rem; margin-bottom: 0.85rem;"></div>

          <form onsubmit="UniAuth.handleFormSubmit(event)" style="display: flex; flex-direction: column; gap: 0.85rem; width: 100%;">
            <div class="form-group" style="margin: 0; width: 100%; display: flex; flex-direction: column;">
              <label for="uni-auth-email" class="form-label" style="font-size: 0.84rem; font-weight: 600; color: #1e293b; margin-bottom: 0.35rem; display: block;">Email Address</label>
              <input type="email" id="uni-auth-email" class="form-input" placeholder="you@example.com or agent@uni-nest.app" required style="width: 100%; box-sizing: border-box; padding: 0.7rem 0.9rem; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 0.92rem; background: #ffffff; color: #0f172a; outline: none;" />
            </div>

            <button type="submit" id="uni-auth-submit-btn" class="btn btn-primary" style="width: 100%; height: 42px; padding: 0.6rem 1.25rem; font-weight: 700; border-radius: 10px; font-size: 0.92rem; background: #2563eb; color: #ffffff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);">
              Continue with Email
            </button>
          </form>
        </div>

        <div style="background: #f8fafc; padding: 0.7rem 1.25rem; border-top: 1px solid #f1f5f9; text-align: center; font-size: 0.74rem; color: #64748b;">
          🔒 Instant email sign-in for students &amp; verified UniNest agents.
        </div>
      </div>
    `;

    document.body.appendChild(modalDiv);

    modalDiv.addEventListener('click', (e) => {
      if (e.target === modalDiv) {
        UniAuth.closeAuthModal();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        UniAuth.closeAuthModal();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    ensureAuthModalInDom();
    const storedUser = UniAuth.getStoredUser();
    if (storedUser) {
      UniAuth._user = storedUser;
    }
    UniAuth.renderNavActions();
  });
})();
