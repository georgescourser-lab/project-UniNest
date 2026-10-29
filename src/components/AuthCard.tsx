'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  getGoogleOAuthUrl,
  syncUserSession,
} from '@/app/actions/authActions';

interface AuthCardProps {
  initialTab?: 'signin' | 'signup';
}

export default function AuthCard({ initialTab = 'signin' }: AuthCardProps) {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next') || '/search';

  const [tab, setTab] = useState<'signin' | 'signup'>(initialTab);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Email Confirmation step states
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Status states
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const resetMessages = () => {
    setError(null);
    setSuccessMsg(null);
  };

  const handleTabSwitch = (newTab: 'signin' | 'signup') => {
    setTab(newTab);
    setAwaitingConfirmation(false);
    setConfirmationCode('');
    resetMessages();
  };

  const persistClientSessionAndRedirect = async (userObj: {
    id: string;
    email: string;
    name?: string;
  }) => {
    const cleanEmail = userObj.email.trim().toLowerCase();
    const displayName = userObj.name || fullName.trim() || cleanEmail.split('@')[0];
    const userPayload = {
      id: userObj.id,
      email: cleanEmail,
      name: displayName,
    };

    try {
      localStorage.setItem('uninest_user', JSON.stringify(userPayload));
      document.cookie = `uninest_user_client=${encodeURIComponent(
        JSON.stringify(userPayload)
      )}; path=/; max-age=2592000; SameSite=Lax`;
    } catch (err) {}

    await syncUserSession(userPayload);

    setTimeout(() => {
      window.location.href = nextParam;
    }, 500);
  };

  const handleGoogleSignIn = async () => {
    resetMessages();
    setLoading(true);
    try {
      const origin = window.location.origin;
      const res = await getGoogleOAuthUrl(origin, nextParam);
      if (res.error) {
        setError(res.error);
        setLoading(false);
      } else if (res.url) {
        window.location.href = res.url;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize Google Sign-In');
      setLoading(false);
    }
  };

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const origin = window.location.origin;
      const action = tab === 'signup' ? 'signup' : 'signin';

      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          email: cleanEmail,
          password,
          fullName: fullName.trim(),
          origin,
          next: nextParam,
        }),
      });

      const data = await res.json();

      if (data.needsConfirmation || data.isEmailUnconfirmed) {
        setAwaitingConfirmation(true);
        setConfirmationCode('');
        setResendCooldown(30);
        if (data.isEmailUnconfirmed && data.error) {
          setError(data.error);
        } else {
          setSuccessMsg(
            data.message ||
              `Confirmation email sent to ${cleanEmail}! Enter the 6-digit verification code from your email (or click the confirmation link) to activate your account.`
          );
        }
        setLoading(false);
        return;
      }

      if (!res.ok || data.error) {
        setError(data.error || 'Authentication failed. Please check your credentials.');
        setLoading(false);
        return;
      }

      if (data.success && data.user) {
        setSuccessMsg('Signed in successfully! Redirecting...');
        await persistClientSessionAndRedirect({
          id: data.user.id,
          email: data.user.email || cleanEmail,
          name:
            data.user.name ||
            data.user.user_metadata?.full_name ||
            cleanEmail.split('@')[0],
        });
      }
    } catch (err: any) {
      setError(err.message || 'Unable to process request. Please try again.');
      setLoading(false);
    }
  };

  const handleVerifyConfirmationCode = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = confirmationCode.trim();

    if (!cleanCode || cleanCode.length < 6) {
      setError('Please enter the 6-digit confirmation code sent to your email.');
      return;
    }

    setLoading(true);
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
        setError(
          data.error ||
            'Invalid or expired confirmation code. Please check your email or click Resend.'
        );
        setLoading(false);
        return;
      }

      setSuccessMsg('Email confirmed! Signing you in...');
      await persistClientSessionAndRedirect({
        id: data.user?.id || `usr_${Date.now()}`,
        email: data.user?.email || cleanEmail,
        name:
          data.user?.name ||
          data.user?.user_metadata?.full_name ||
          fullName.trim() ||
          cleanEmail.split('@')[0],
      });
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (resendCooldown > 0 || resending) return;
    resetMessages();
    setResending(true);
    try {
      const origin = window.location.origin;
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resend',
          email: email.trim().toLowerCase(),
          origin,
          next: nextParam,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Could not resend confirmation email.');
      } else {
        setResendCooldown(30);
        setSuccessMsg(
          data.message ||
            `A new confirmation email has been sent to ${email.trim().toLowerCase()}.`
        );
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend confirmation email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '460px',
        width: '100%',
        margin: '0 auto',
        background: '#ffffff',
        borderRadius: '20px',
        boxShadow:
          '0 20px 45px rgba(15, 23, 42, 0.08), 0 4px 12px rgba(15, 23, 42, 0.04)',
        border: '1px solid #e2e8f0',
        padding: '2.25rem 2rem',
      }}
    >
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '1.5rem',
            fontWeight: 800,
            color: '#0f172a',
            marginBottom: '0.35rem',
          }}
        >
          Uni<span style={{ color: '#2563eb' }}>Nest</span>
        </div>
        <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0 }}>
          {awaitingConfirmation
            ? 'Confirm your email address to activate your account'
            : tab === 'signin'
            ? 'Welcome back! Sign in to access student housing & deals'
            : 'Create your verified student account in seconds'}
        </p>
      </div>

      {/* Sign In / Sign Up Tabs */}
      {!awaitingConfirmation && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: '#f1f5f9',
            padding: '0.3rem',
            borderRadius: '12px',
            marginBottom: '1.5rem',
          }}
        >
          <button
            type="button"
            onClick={() => handleTabSwitch('signin')}
            style={{
              padding: '0.6rem',
              borderRadius: '9px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              background: tab === 'signin' ? '#ffffff' : 'transparent',
              color: tab === 'signin' ? '#0f172a' : '#64748b',
              boxShadow:
                tab === 'signin' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch('signup')}
            style={{
              padding: '0.6rem',
              borderRadius: '9px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              background: tab === 'signup' ? '#ffffff' : 'transparent',
              color: tab === 'signup' ? '#0f172a' : '#64748b',
              boxShadow:
                tab === 'signup' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Create Account
          </button>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            padding: '0.85rem 1rem',
            borderRadius: '10px',
            fontSize: '0.86rem',
            marginBottom: '1.25rem',
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      )}

      {successMsg && (
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#15803d',
            padding: '0.85rem 1rem',
            borderRadius: '10px',
            fontSize: '0.86rem',
            marginBottom: '1.25rem',
            lineHeight: 1.5,
          }}
        >
          {successMsg}
        </div>
      )}

      {!awaitingConfirmation ? (
        <>
          {/* 1. Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.65rem',
              padding: '0.78rem 1rem',
              borderRadius: '10px',
              border: '1.5px solid #cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
              fontWeight: 600,
              fontSize: '0.92rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s ease, border-color 0.15s ease',
              marginBottom: '1.25rem',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
              />
              <path
                fill="#FBBC05"
                d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.9C3.5 21.4 7.4 24 12 24z"
              />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1.25rem',
              color: '#94a3b8',
              fontSize: '0.78rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: 600,
            }}
          >
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            <span>or with email &amp; password</span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          </div>

          {/* 2. Email & Password Form */}
          <form onSubmit={handleEmailPasswordSubmit}>
            {tab === 'signup' && (
              <div style={{ marginBottom: '0.9rem' }}>
                <label
                  htmlFor="auth-fullname"
                  style={{
                    display: 'block',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    color: '#1e293b',
                    marginBottom: '0.35rem',
                  }}
                >
                  Full Name
                </label>
                <input
                  id="auth-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jane Wanjiku"
                  style={{
                    width: '100%',
                    padding: '0.72rem 0.9rem',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.92rem',
                    outline: 'none',
                  }}
                />
              </div>
            )}

            <div style={{ marginBottom: '0.9rem' }}>
              <label
                htmlFor="auth-email"
                style={{
                  display: 'block',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  color: '#1e293b',
                  marginBottom: '0.35rem',
                }}
              >
                Email Address *
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@uni-nest.app or student@gmail.com"
                style={{
                  width: '100%',
                  padding: '0.72rem 0.9rem',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.92rem',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.35rem',
                }}
              >
                <label
                  htmlFor="auth-password"
                  style={{
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    color: '#1e293b',
                  }}
                >
                  Password *
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  tab === 'signup'
                    ? 'Create a password (min. 6 characters)'
                    : 'Enter your password'
                }
                style={{
                  width: '100%',
                  padding: '0.72rem 0.9rem',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.92rem',
                  outline: 'none',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.82rem',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading
                ? tab === 'signup'
                  ? 'Creating Account & Sending Confirmation...'
                  : 'Signing In...'
                : tab === 'signup'
                ? 'Create Account'
                : 'Sign In'}
            </button>
          </form>
        </>
      ) : (
        /* Step 2: Sign-Up Email Confirmation Screen */
        <form onSubmit={handleVerifyConfirmationCode}>
          <div
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1.25rem',
              fontSize: '0.86rem',
              color: '#1e3a8a',
              lineHeight: 1.5,
            }}
          >
            📧 Confirmation email sent to <strong>{email}</strong>.<br />
            Enter the <strong>6-digit verification code</strong> from the email below (or click the confirmation link inside the email) to complete your sign up.
          </div>

          <div style={{ marginBottom: '1.15rem' }}>
            <label
              htmlFor="auth-confirm-code"
              style={{
                display: 'block',
                fontSize: '0.84rem',
                fontWeight: 600,
                color: '#1e293b',
                marginBottom: '0.4rem',
              }}
            >
              6-Digit Email Confirmation Code *
            </label>
            <input
              id="auth-confirm-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={confirmationCode}
              onChange={(e) =>
                setConfirmationCode(e.target.value.replace(/\D/g, ''))
              }
              placeholder="123456"
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                border: '2px solid #2563eb',
                fontSize: '1.4rem',
                fontWeight: 700,
                letterSpacing: '8px',
                textAlign: 'center',
                fontFamily: 'monospace',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.82rem',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.95rem',
              marginBottom: '0.85rem',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Verifying & Confirming...' : 'Verify & Confirm Account'}
          </button>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.84rem',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setAwaitingConfirmation(false);
                setConfirmationCode('');
                resetMessages();
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                fontWeight: 500,
                padding: 0,
              }}
            >
              &larr; Back to {tab === 'signup' ? 'Sign Up' : 'Sign In'}
            </button>

            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={resendCooldown > 0 || resending}
              style={{
                background: 'none',
                border: 'none',
                color: resendCooldown > 0 ? '#94a3b8' : '#2563eb',
                cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                padding: 0,
              }}
            >
              {resending
                ? 'Sending...'
                : resendCooldown > 0
                ? `Resend Email (${resendCooldown}s)`
                : 'Resend Confirmation Email'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
