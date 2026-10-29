"use client";

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  getGoogleOAuthUrl,
  syncUserSession,
} from '@/app/actions/authActions';
import { createClient } from '@/utils/supabase/client';

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
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next') || '/search';

  // Active Tab: 'signin' | 'signup'
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>(initialTab);

  // Email Input (for 6-Digit OTP only — no passwords)
  const [email, setEmail] = useState('');

  // 6-Digit OTP Verification State
  const [sixDigitCode, setSixDigitCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

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
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendStatus, setResendStatus] = useState('');

  // Complete session sync & redirect helper
  const finalizeAuthenticatedSession = async (user: any, cleanEmail: string) => {
    const userPayload = {
      id: user.id,
      email: (user.email || cleanEmail).toLowerCase(),
      name: user.user_metadata?.full_name || cleanEmail.split('@')[0],
    };

    try {
      localStorage.setItem('uninest_user', JSON.stringify(userPayload));
      document.cookie = `uninest_user_client=${encodeURIComponent(JSON.stringify(userPayload))}; path=/; max-age=2592000; SameSite=Lax`;
    } catch (e) {}

    await syncUserSession(userPayload);
    window.location.href = nextParam;
  };

  // 1. Google OAuth
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const origin = window.location.origin;
      const res = await getGoogleOAuthUrl(origin, nextParam);

      if (res.error) {
        if (res.error.toLowerCase().includes('not enabled') || res.error.toLowerCase().includes('unsupported')) {
          setErrorMsg('Google Sign-In is not enabled yet in Supabase. Please continue with your 6-Digit Email Verification Code below.');
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

  // 2. Send 6-Digit Email OTP via supabase.auth.signInWithOtp (with direct Resend fallback)
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setResendStatus('');

    const userEmail = email.trim().toLowerCase();
    if (!userEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      // 1. Send the 6-digit OTP to any email (including custom @uni-nest.app email)
      const { error } = await supabase.auth.signInWithOtp({
        email: userEmail,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        // Fallback to direct Resend OTP delivery (/api/auth/otp) if Supabase SMTP is pending or rate-limited
        const fallbackRes = await fetch('/api/auth/otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'send', email: userEmail }),
        });
        const fallbackData = await fallbackRes.json().catch(() => ({}));

        if (fallbackRes.ok && fallbackData?.success) {
          setOtpSent(true);
          setSuccessMsg(`We sent a 6-digit verification code to ${userEmail}. Enter it below to continue.`);
          setLoading(false);
          return;
        }

        const rawErr = error.message || '';
        const status = (error as any).status;
        const isDelay =
          status === 504 ||
          rawErr === '{}' ||
          rawErr.includes('504') ||
          rawErr.toLowerCase().includes('timeout');

        if (isDelay) {
          setOtpSent(true);
          setSuccessMsg(`6-digit verification code sent to ${userEmail}. Please check your inbox.`);
          setLoading(false);
          return;
        }

        setErrorMsg(fallbackData?.error || rawErr);
        setLoading(false);
        return;
      }

      setOtpSent(true);
      setSuccessMsg(`We sent a 6-digit verification code to ${userEmail}. Enter it below to continue.`);
    } catch (err: any) {
      const errMsg = String(err?.message || '').trim();
      if (!errMsg || errMsg === '{}' || errMsg.includes('504') || errMsg.toLowerCase().includes('timeout')) {
        setOtpSent(true);
        setSuccessMsg(`6-digit verification code sent to ${userEmail}. Please check your inbox.`);
      } else {
        setErrorMsg(errMsg || 'Failed to send verification code.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 3. Verify 6-Digit Email OTP via supabase.auth.verifyOtp (with direct Resend fallback)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const userEmail = email.trim().toLowerCase();
    const cleanCode = sixDigitCode.trim();

    if (!userEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (!cleanCode || cleanCode.length < 6) {
      setErrorMsg('Please enter the 6-digit verification code from your email.');
      return;
    }

    setVerifyingOtp(true);
    try {
      const supabase = createClient();

      // Verify the 6-digit code when the user types it in
      let { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
        email: userEmail,
        token: cleanCode,
        type: 'email',
      });

      // Fallback to 'signup' OTP type if needed
      if (verifyError) {
        const fallbackRes = await supabase.auth.verifyOtp({
          email: userEmail,
          token: cleanCode,
          type: 'signup',
        });
        if (!fallbackRes.error && fallbackRes.data) {
          sessionData = fallbackRes.data;
          verifyError = null;
        }
      }

      if (verifyError) {
        // Fallback to direct Resend OTP verification (/api/auth/otp)
        const apiVerifyRes = await fetch('/api/auth/otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify', email: userEmail, token: cleanCode }),
        });
        const apiVerifyData = await apiVerifyRes.json().catch(() => ({}));
        if (apiVerifyRes.ok && apiVerifyData?.success && apiVerifyData?.user) {
          await finalizeAuthenticatedSession(apiVerifyData.user, userEmail);
          return;
        }

        setErrorMsg(verifyError.message || 'Invalid or expired 6-digit code. Please try again.');
        setVerifyingOtp(false);
        return;
      }

      const verifiedUser = sessionData?.user || sessionData?.session?.user;
      if (verifiedUser) {
        await finalizeAuthenticatedSession(verifiedUser, userEmail);
        return;
      }

      setErrorMsg('Verification succeeded, but no session was returned. Please try again.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to verify 6-digit code.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // 4. Resend 6-Digit OTP
  const handleResendConfirmation = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Please enter your email to resend the code.');
      return;
    }
    setResendingEmail(true);
    setResendStatus('');
    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        const fallbackRes = await fetch('/api/auth/otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'send', email: cleanEmail }),
        });
        const fallbackData = await fallbackRes.json().catch(() => ({}));
        if (fallbackRes.ok && fallbackData?.success) {
          setOtpSent(true);
          setResendStatus(`✓ New 6-digit code sent to ${cleanEmail}. Check your inbox and spam folder.`);
        } else {
          setResendStatus(`Failed to resend: ${fallbackData?.error || error.message}`);
        }
      } else {
        setOtpSent(true);
        setResendStatus(`✓ New 6-digit code sent to ${cleanEmail}. Check your inbox and spam folder.`);
      }
    } catch (err: any) {
      setResendStatus(err.message || 'Failed to resend verification code.');
    } finally {
      setResendingEmail(false);
    }
  };

  const switchTab = (tab: 'signin' | 'signup') => {
    setActiveTab(tab);
    setErrorMsg('');
    setSuccessMsg('');
    setResendStatus('');
    setOtpSent(false);
    setSixDigitCode('');
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
                ? 'Sign in with Google or a 6-digit email verification code.'
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
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            color: '#0f172a',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '0.94rem',
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
            OR WITH 6-DIGIT EMAIL OTP
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
        {successMsg && !otpSent && (
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

        {/* 6-Digit OTP Verification Box */}
        {otpSent ? (
          <div
            style={{
              background: '#f0fdf4',
              border: '1.5px solid #86efac',
              borderRadius: '12px',
              padding: '1rem 1.1rem',
              marginBottom: '1rem',
              color: '#166534',
              fontSize: '0.86rem',
              lineHeight: 1.45,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.92rem' }}>
              <span>🔐</span> Enter 6-Digit Verification Code
            </div>
            <div style={{ marginBottom: '0.85rem', color: '#15803d' }}>
              We sent a 6-digit OTP to <strong>{email.trim()}</strong>. Type the code below to verify and sign in automatically.
            </div>

            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <input
                id="auth-otp-code-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={sixDigitCode}
                onChange={(e) => setSixDigitCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                autoComplete="one-time-code"
                required
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '0.7rem 0.9rem',
                  border: '1.5px solid #86efac',
                  borderRadius: '8px',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  letterSpacing: '0.35em',
                  textAlign: 'center',
                  color: '#0f172a',
                  background: '#ffffff',
                  outline: 'none',
                }}
              />

              <button
                type="submit"
                disabled={verifyingOtp || sixDigitCode.trim().length < 6}
                style={{
                  width: '100%',
                  height: '42px',
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  cursor: verifyingOtp || sixDigitCode.trim().length < 6 ? 'not-allowed' : 'pointer',
                  opacity: verifyingOtp || sixDigitCode.trim().length < 6 ? 0.65 : 1,
                  boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                }}
              >
                {verifyingOtp ? 'Verifying 6-Digit Code...' : 'Verify & Continue'}
              </button>
            </form>

            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
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
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {resendingEmail ? 'Resending code...' : 'Resend 6-digit code'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setSixDigitCode('');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                style={{
                  background: 'transparent',
                  color: '#166534',
                  border: '1px solid #86efac',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Change Email
              </button>
            </div>

            {resendStatus && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#15803d', fontWeight: 500 }}>
                {resendStatus}
              </div>
            )}
          </div>
        ) : (
          /* Email OTP Form (Passwordless) */
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%' }}>
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
                Email Address
              </label>
              <input
                id="auth-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@uni-nest.app"
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
                marginTop: '0.25rem',
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
              {loading ? 'Sending 6-Digit Code...' : '🔢 Send 6-Digit Verification Code'}
            </button>
          </form>
        )}

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
              Don&apos;t have an account?{' '}
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
        🔒 Secure passwordless authentication powered by Google &amp; Supabase OTP.
      </div>
    </div>
  );
}
