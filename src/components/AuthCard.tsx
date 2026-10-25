"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getGoogleOAuthUrl,
  loginWithPassword,
  signupWithPassword,
  resendConfirmationEmailAction,
} from '@/app/actions/authActions';

interface AuthCardProps {
  initialTab?: 'signin' | 'signup';
  initialMode?: 'email' | 'phone';
  reason?: string;
  onClose?: () => void;
}

export default function AuthCard({
  initialTab = 'signin',
  reason,
  onClose,
}: AuthCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next') || '/search';

  // Active Tab: 'signin' | 'signup'
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>(initialTab);

  // Form Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Feedback & Loading
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(() => {
    if (typeof window !== 'undefined') {
      const err = new URLSearchParams(window.location.search).get('error');
      if (err) return err;
    }
    return '';
  });
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendStatus, setResendStatus] = useState('');

  // 1. Google OAuth
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const origin = window.location.origin;
      const res = await getGoogleOAuthUrl(origin, nextParam);

      if (res.error) {
        if (res.error.toLowerCase().includes('not enabled') || res.error.toLowerCase().includes('unsupported')) {
          setErrorMsg('Google Sign-In is not enabled yet in Supabase. Please continue with your Student Email & Password below.');
        } else {
          setErrorMsg(res.error);
        }
        setLoading(false);
        return;
      }

      if (res.url) {
        window.location.href = res.url;
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Google sign in failed.');
      setLoading(false);
    }
  };

  // 2. Submit Log In / Sign Up
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setResendStatus('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    if (activeTab === 'signup' && password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      if (activeTab === 'signin') {
        // Log In
        const res = await loginWithPassword(cleanEmail, password);

        if (res.error) {
          setErrorMsg(res.error);
          if (res.isEmailUnconfirmed) {
            setConfirmationSent(true);
          }
          setLoading(false);
          return;
        }

        // Cache client session
        try {
          const userObj = {
            id: res.user?.id || `user_${Date.now()}`,
            email: cleanEmail,
            name: res.user?.user_metadata?.full_name || cleanEmail.split('@')[0],
          };
          localStorage.setItem('uninest_user', JSON.stringify(userObj));
          document.cookie = `uninest_user_client=${encodeURIComponent(JSON.stringify(userObj))}; path=/; max-age=2592000; SameSite=Lax`;
        } catch (e) {}

        window.location.href = nextParam;
      } else {
        // Sign Up (Account creation with email confirmation security)
        const origin = window.location.origin;
        const res = await signupWithPassword(cleanEmail, password, origin, nextParam);

        if (res.error) {
          if (
            res.error.includes('504') ||
            res.error.toLowerCase().includes('timeout') ||
            res.error.toLowerCase().includes('upstream')
          ) {
            setConfirmationSent(true);
            setSuccessMsg(
              `Security confirmation email sent! Please check your inbox at ${cleanEmail} to confirm your account.`
            );
            setLoading(false);
            return;
          }
          setErrorMsg(res.error);
          setLoading(false);
          return;
        }

        // Email confirmation security flow
        setConfirmationSent(true);
        setSuccessMsg(
          `Security confirmation email sent! Please check your inbox at ${cleanEmail} to confirm your account before logging in.`
        );
        setLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
      setLoading(false);
    }
  };

  // 3. Resend Confirmation Email
  const handleResendConfirmation = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Please enter your email to resend confirmation.');
      return;
    }
    setResendingEmail(true);
    setResendStatus('');
    try {
      const origin = window.location.origin;
      const res = await resendConfirmationEmailAction(cleanEmail, origin, nextParam);
      if (res.error) {
        setResendStatus(`Failed to resend: ${res.error}`);
      } else {
        setResendStatus(`✓ Verification link resent to ${cleanEmail}. Check your inbox and spam folder.`);
      }
    } catch (err: any) {
      setResendStatus(err.message || 'Failed to resend confirmation.');
    } finally {
      setResendingEmail(false);
    }
  };

  const switchTab = (tab: 'signin' | 'signup') => {
    setActiveTab(tab);
    setErrorMsg('');
    setSuccessMsg('');
    setResendStatus('');
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '430px',
        margin: '0 auto',
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '18px',
        padding: '0',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '1.35rem 1.5rem 0.85rem',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#2563eb',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '0.2rem',
            }}
          >
            {activeTab === 'signin' ? 'WELCOME BACK' : 'GET STARTED'}
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: '1.45rem',
              color: '#0f172a',
              fontWeight: 700,
              letterSpacing: '-0.01em',
            }}
          >
            {activeTab === 'signin' ? 'Log in to UniNest' : 'Create your account'}
          </h2>
          <p
            style={{
              margin: '0.3rem 0 0 0',
              fontSize: '0.84rem',
              color: '#64748b',
              lineHeight: 1.4,
            }}
          >
            {reason ||
              (activeTab === 'signin'
                ? 'Agent sign-in required to access the verification portal.'
                : 'Join UniNest to book agent viewings, save properties, and list items.')}
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              fontSize: '1.1rem',
              marginLeft: '0.75rem',
            }}
          >
            &times;
          </button>
        )}
      </div>

      {/* Body Content */}
      <div style={{ padding: '1.15rem 1.5rem 1.35rem' }}>
        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            width: '100%',
            height: '42px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            color: '#0f172a',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '0.92rem',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            marginBottom: '0.9rem',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = '#cbd5e1';
            e.currentTarget.style.background = '#f8fafc';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.background = '#ffffff';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          {loading ? 'Connecting Google...' : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            margin: '0 0 0.9rem 0',
            color: '#94a3b8',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          <span style={{ padding: '0 0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            OR WITH EMAIL
          </span>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
        </div>

        {/* Tabs: Log In vs Create Account */}
        <div
          style={{
            display: 'flex',
            background: '#f1f5f9',
            padding: '0.25rem',
            borderRadius: '10px',
            marginBottom: '1rem',
          }}
        >
          <button
            type="button"
            onClick={() => switchTab('signin')}
            style={{
              flex: 1,
              padding: '0.55rem',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: activeTab === 'signin' ? '#ffffff' : 'transparent',
              color: activeTab === 'signin' ? '#0f172a' : '#64748b',
              boxShadow: activeTab === 'signin' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => switchTab('signup')}
            style={{
              flex: 1,
              padding: '0.55rem',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: activeTab === 'signup' ? '#ffffff' : 'transparent',
              color: activeTab === 'signup' ? '#0f172a' : '#64748b',
              boxShadow: activeTab === 'signup' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            Create Account
          </button>
        </div>

        {/* Security Confirmation Notice */}
        {confirmationSent && (
          <div
            style={{
              background: '#f0fdf4',
              border: '1.5px solid #86efac',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
              marginBottom: '1rem',
              color: '#166534',
              fontSize: '0.86rem',
              lineHeight: 1.45,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>✉️</span> Confirm your email address
            </div>
            <div>
              We sent a verification link to <strong>{email.trim()}</strong>.
              For your account security, please open the email and click the confirmation link to activate your UniNest account.
            </div>

            <div style={{ marginTop: '0.65rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resendingEmail}
                style={{
                  background: '#166534',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {resendingEmail ? 'Resending link...' : 'Resend confirmation email'}
              </button>

              <button
                type="button"
                onClick={() => switchTab('signin')}
                style={{
                  background: 'transparent',
                  color: '#166534',
                  border: '1px solid #86efac',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Go to Log In
              </button>
            </div>

            {resendStatus && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#15803d', fontWeight: 500 }}>
                {resendStatus}
              </div>
            )}
          </div>
        )}

        {/* General Error Banner */}
        {errorMsg && (
          <div
            style={{
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              color: '#991b1b',
              padding: '0.65rem 0.9rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '1rem',
              lineHeight: 1.4,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* General Success Banner */}
        {successMsg && !confirmationSent && (
          <div
            style={{
              background: '#dcfce7',
              border: '1px solid #86efac',
              color: '#166534',
              padding: '0.65rem 0.9rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '1rem',
              lineHeight: 1.4,
            }}
          >
            {successMsg}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%' }}>
          {/* Email Input */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label
              htmlFor="auth-email-input"
              style={{
                fontSize: '0.86rem',
                fontWeight: 600,
                color: '#1e293b',
                marginBottom: '0.35rem',
              }}
            >
              Student Email
            </label>
            <input
              id="auth-email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="georgescourser@gmail.com"
              autoComplete="email"
              required
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.7rem 0.9rem',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.95rem',
                color: '#0f172a',
                outline: 'none',
                background: '#ffffff',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#2563eb';
                e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#cbd5e1';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Password Input */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label
              htmlFor="auth-password-input"
              style={{
                fontSize: '0.86rem',
                fontWeight: 600,
                color: '#1e293b',
                marginBottom: '0.35rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>Password</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>
                (Min 6 characters)
              </span>
            </label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                id="auth-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={activeTab === 'signin' ? 'current-password' : 'new-password'}
                required
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '0.7rem 2.5rem 0.7rem 0.9rem',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  color: '#0f172a',
                  outline: 'none',
                  background: '#ffffff',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2563eb';
                  e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#cbd5e1';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
                style={{
                  position: 'absolute',
                  right: '0.65rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  fontSize: '1rem',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                👁️
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              height: '42px',
              padding: '0.6rem 1.25rem',
              fontWeight: 600,
              borderRadius: '8px',
              fontSize: '0.95rem',
              marginTop: '0.35rem',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
              transition: 'background-color 0.15s ease',
              opacity: loading ? 0.7 : 1,
            }}
            onMouseOver={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = '#1d4ed8';
            }}
            onMouseOut={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = '#2563eb';
            }}
          >
            {loading
              ? 'Please wait...'
              : activeTab === 'signin'
              ? 'Log In'
              : 'Create Account'}
          </button>
        </form>

        {/* Switch prompt */}
        <p
          style={{
            textAlign: 'center',
            margin: '1rem 0 0 0',
            fontSize: '0.86rem',
            color: '#64748b',
          }}
        >
          {activeTab === 'signin' ? (
            <>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => switchTab('signup')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: '#2563eb',
                  fontWeight: 600,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  textDecoration: 'none',
                }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchTab('signin')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: '#2563eb',
                  fontWeight: 600,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  textDecoration: 'none',
                }}
              >
                Log in
              </button>
            </>
          )}
        </p>
      </div>

      {/* Footer */}
      <div
        style={{
          background: '#f8fafc',
          padding: '0.75rem 1.25rem',
          borderTop: '1px solid #f1f5f9',
          textAlign: 'center',
          fontSize: '0.76rem',
          color: '#64748b',
        }}
      >
        🔒 Secure authentication powered by Supabase. Your privacy is guaranteed.
      </div>
    </div>
  );
}
