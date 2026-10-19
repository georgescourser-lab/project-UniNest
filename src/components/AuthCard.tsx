"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getGoogleOAuthUrl,
  loginWithPassword,
  signupWithPassword,
  sendMagicLinkAction,
  sendPhoneOtpAction,
  verifyPhoneOtpAction,
} from '@/app/actions/authActions';

interface AuthCardProps {
  initialMode?: 'email' | 'phone';
}

export default function AuthCard({ initialMode = 'email' }: AuthCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next') || '/search';

  // Mode: 'email' or 'phone'
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>(initialMode);

  // Steps:
  // 'initial' = The main screen matching the user's screenshot
  // 'password' = User entered email, now enters password / magic link
  // 'magic-sent' = Magic link email sent
  // 'phone-otp' = Phone OTP verification code screen
  const [step, setStep] = useState<'initial' | 'password' | 'magic-sent' | 'phone-otp'>('initial');

  // Input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // Status & loading
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(() => {
    if (typeof window !== 'undefined') {
      const err = new URLSearchParams(window.location.search).get('error');
      if (err) return err;
      if (window.location.search.includes('signup=success')) {
        return 'Account created successfully! Please sign in to continue.';
      }
    }
    return '';
  });
  const [suggestSignUp, setSuggestSignUp] = useState(false);
  const [signUpSuccessMsg, setSignUpSuccessMsg] = useState('');

  // 1. Google Sign-In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const origin = window.location.origin;
      const res = await getGoogleOAuthUrl(origin, nextParam);

      if (res.error) {
        if (res.error.toLowerCase().includes('not enabled') || res.error.toLowerCase().includes('unsupported')) {
          setErrorMsg('Google Sign-In is not enabled yet in your Supabase dashboard. Please continue with your email below.');
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

  // 2. Initial Submit (Email or Phone)
  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuggestSignUp(false);

    if (authMethod === 'email') {
      if (!email.trim()) {
        setErrorMsg('Please enter your email address.');
        return;
      }
      setStep('password');
    } else {
      if (!phone.trim()) {
        setErrorMsg('Please enter your phone number.');
        return;
      }
      handleSendPhoneOtp();
    }
  };

  // 3. Password Login
  const handlePasswordLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuggestSignUp(false);

    try {
      const res = await loginWithPassword(email, password);

      if (res.error) {
        if (res.error.toLowerCase().includes('invalid login credentials')) {
          setErrorMsg('Invalid login credentials. If you are new to UniNest, create an account with this password below.');
          setSuggestSignUp(true);
        } else {
          setErrorMsg(res.error);
        }
        setLoading(false);
        return;
      }

      window.location.href = nextParam;
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed.');
      setLoading(false);
    }
  };

  // 4. Create Account (Sign up with password)
  const handleCreateAccount = async () => {
    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuggestSignUp(false);

    try {
      const origin = window.location.origin;
      const res = await signupWithPassword(email, password, origin, nextParam);

      if (res.error) {
        setErrorMsg(res.error);
        setLoading(false);
        return;
      }

      window.location.href = nextParam;
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create account.');
      setLoading(false);
    }
  };

  // 5. Send Magic Link
  const handleSendMagicLink = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const origin = window.location.origin;
      const res = await sendMagicLinkAction(email, origin, nextParam);

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setStep('magic-sent');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send magic link.');
    } finally {
      setLoading(false);
    }
  };

  // 6. Phone OTP Flow
  const handleSendPhoneOtp = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await sendPhoneOtpAction(phone);

      if (res.error) {
        if (
          res.error.toLowerCase().includes('unsupported') ||
          res.error.toLowerCase().includes('not enabled') ||
          res.error.toLowerCase().includes('sms')
        ) {
          setErrorMsg('SMS authentication is not enabled on this Supabase project. Please use email or Google.');
        } else {
          setErrorMsg(res.error);
        }
        setLoading(false);
        return;
      }

      setStep('phone-otp');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send phone code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) return;

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await verifyPhoneOtpAction(phone, otpCode);

      if (res.error) {
        setErrorMsg(res.error);
        setLoading(false);
        return;
      }

      window.location.href = nextParam;
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed.');
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '430px',
        margin: '0 auto',
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '16px',
        padding: '2.5rem 2rem',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
      }}
    >
      {/* ================= STEP 1: INITIAL (MATCHES SCREENSHOT) ================= */}
      {step === 'initial' && (
        <div>
          {/* Header */}
          <h1
            style={{
              fontSize: '1.65rem',
              fontWeight: 700,
              color: '#111827',
              textAlign: 'center',
              marginBottom: '0.45rem',
              letterSpacing: '-0.02em',
            }}
          >
            Log in or sign up
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: '0.92rem',
              color: '#4b5563',
              textAlign: 'center',
              lineHeight: 1.45,
              margin: '0 auto 1.25rem',
              maxWidth: '350px',
            }}
          >
            {authMethod === 'email'
              ? "Continue with your email or a social account \u2014 we'll log you in or create your account."
              : "Continue with your phone number \u2014 we'll log you in or create your account."}
          </p>

          {/* Legal / Disclaimer Notice */}
          <p
            style={{
              fontSize: '0.78rem',
              color: '#6b7280',
              textAlign: 'center',
              lineHeight: 1.45,
              marginBottom: '1.35rem',
            }}
          >
            By continuing, we will store your details and share with the agency or seller of any listing you contact, in accordance with our{' '}
            <Link
              href="#"
              style={{
                color: '#b91c1c',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              Privacy Policy
            </Link>
            .
          </p>

          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              background: '#ffffff',
              border: '1.5px solid #e2e8f0',
              color: '#1f2937',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              marginBottom: '1.35rem',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
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
            <svg width="20" height="20" viewBox="0 0 24 24">
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
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '0.88rem',
              margin: '0 0 1.25rem 0',
            }}
          >
            {authMethod === 'email' ? 'or continue with your email' : 'or enter your phone number'}
          </div>

          {/* Form */}
          <form onSubmit={handleInitialSubmit}>
            {authMethod === 'email' ? (
              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  htmlFor="auth-email-input"
                  style={{
                    display: 'block',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    color: '#1f2937',
                    marginBottom: '0.45rem',
                    textAlign: 'left',
                  }}
                >
                  Email address
                </label>
                <input
                  id="auth-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#b91c1c';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#cbd5e1';
                  }}
                />
              </div>
            ) : (
              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  htmlFor="auth-phone-input"
                  style={{
                    display: 'block',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    color: '#1f2937',
                    marginBottom: '0.45rem',
                    textAlign: 'left',
                  }}
                >
                  Phone number
                </label>
                <input
                  id="auth-phone-input"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+254 712 345 678"
                  autoComplete="tel"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#b91c1c';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#cbd5e1';
                  }}
                />
              </div>
            )}

            {errorMsg && (
              <p
                style={{
                  color: '#b91c1c',
                  background: '#fef2f2',
                  border: '1px solid #fee2e2',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                  textAlign: 'left',
                }}
              >
                {errorMsg}
              </p>
            )}

            {/* Red Action Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.8rem 1rem',
                background: 'linear-gradient(180deg, #c0232b 0%, #a81c24 100%)',
                border: '1px solid #991b1b',
                borderRadius: '8px',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(168, 28, 36, 0.25), inset 0 1px 0 rgba(255,255,255,0.15)',
                transition: 'opacity 0.15s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.opacity = '0.95';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              {loading ? 'Please wait...' : 'Log in / Sign up'}
            </button>
          </form>

          {/* Toggle Phone / Email */}
          <div style={{ textAlign: 'center', marginTop: '1.35rem' }}>
            <button
              type="button"
              onClick={() => {
                setErrorMsg('');
                setAuthMethod(authMethod === 'email' ? 'phone' : 'email');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#b91c1c',
                fontWeight: 600,
                fontSize: '0.92rem',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {authMethod === 'email' ? 'Use a phone number instead \u2192' : 'Use an email instead \u2192'}
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 2: PASSWORD OR MAGIC LINK ================= */}
      {step === 'password' && (
        <div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#111827',
              textAlign: 'center',
              marginBottom: '0.35rem',
            }}
          >
            Welcome to UniNest
          </h1>
          <p
            style={{
              fontSize: '0.9rem',
              color: '#4b5563',
              textAlign: 'center',
              marginBottom: '1.25rem',
            }}
          >
            Enter your password or use a 1-click magic link
          </p>

          {/* Email badge with Change button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.65rem 0.9rem',
              marginBottom: '1.25rem',
              fontSize: '0.9rem',
            }}
          >
            <span style={{ color: '#1e293b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {email}
            </span>
            <button
              type="button"
              onClick={() => {
                setStep('initial');
                setErrorMsg('');
                setSuggestSignUp(false);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#b91c1c',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '0 0 0 0.5rem',
              }}
            >
              Change
            </button>
          </div>

          <form onSubmit={handlePasswordLogin}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                htmlFor="auth-password-input"
                style={{
                  display: 'block',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: '#1f2937',
                  marginBottom: '0.45rem',
                  textAlign: 'left',
                }}
              >
                Password
              </label>
              <input
                id="auth-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {errorMsg && (
              <p
                style={{
                  color: '#b91c1c',
                  background: '#fef2f2',
                  border: '1px solid #fee2e2',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                  textAlign: 'left',
                }}
              >
                {errorMsg}
              </p>
            )}

            {signUpSuccessMsg && (
              <p
                style={{
                  color: '#15803d',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                  textAlign: 'left',
                }}
              >
                {signUpSuccessMsg}
              </p>
            )}

            {/* Normal Continue Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.8rem 1rem',
                background: 'linear-gradient(180deg, #c0232b 0%, #a81c24 100%)',
                border: '1px solid #991b1b',
                borderRadius: '8px',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(168, 28, 36, 0.25)',
                marginBottom: suggestSignUp ? '0.75rem' : '1.25rem',
              }}
            >
              {loading ? 'Logging in...' : 'Continue'}
            </button>

            {/* If login failed due to no account, show direct Create Account button */}
            {suggestSignUp && (
              <button
                type="button"
                onClick={handleCreateAccount}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: '#0f172a',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  marginBottom: '1.25rem',
                }}
              >
                {loading ? 'Creating...' : 'Create Account with this password'}
              </button>
            )}
          </form>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              margin: '0 0 1.25rem 0',
              color: '#94a3b8',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            <span style={{ padding: '0 0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              or passwordless
            </span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          </div>

          {/* Magic Link Option */}
          <button
            type="button"
            onClick={handleSendMagicLink}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.7rem 1rem',
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '8px',
              color: '#334155',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <span>✉️</span> {loading ? 'Sending link...' : 'Email me a Magic Sign-In Link'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
            <button
              type="button"
              onClick={() => {
                setStep('initial');
                setErrorMsg('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '0.88rem',
                cursor: 'pointer',
              }}
            >
              &larr; Back to all login options
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 3: MAGIC LINK SENT ================= */}
      {step === 'magic-sent' && (
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              fontSize: '1.75rem',
            }}
          >
            ✉️
          </div>
          <h1
            style={{
              fontSize: '1.45rem',
              fontWeight: 700,
              color: '#111827',
              marginBottom: '0.5rem',
            }}
          >
            Check your inbox
          </h1>
          <p
            style={{
              fontSize: '0.92rem',
              color: '#4b5563',
              lineHeight: 1.5,
              marginBottom: '1.5rem',
            }}
          >
            We sent a secure sign-in link to <strong>{email}</strong>. Click the link in your email to log in or complete your account registration immediately.
          </p>

          <button
            type="button"
            onClick={handleSendMagicLink}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#1e293b',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
              marginBottom: '1rem',
            }}
          >
            {loading ? 'Resending...' : 'Resend Link'}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep('initial');
              setErrorMsg('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#b91c1c',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            Use a different email or method
          </button>
        </div>
      )}

      {/* ================= STEP 4: PHONE OTP VERIFICATION ================= */}
      {step === 'phone-otp' && (
        <div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#111827',
              textAlign: 'center',
              marginBottom: '0.35rem',
            }}
          >
            Verify your phone
          </h1>
          <p
            style={{
              fontSize: '0.9rem',
              color: '#4b5563',
              textAlign: 'center',
              marginBottom: '1.25rem',
            }}
          >
            Enter the 6-digit verification code sent to <strong>{phone}</strong>
          </p>

          <form onSubmit={handleVerifyPhoneOtp}>
            <div style={{ marginBottom: '1.25rem' }}>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="6-digit code"
                maxLength={6}
                required
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '1.3rem',
                  letterSpacing: '4px',
                  textAlign: 'center',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {errorMsg && (
              <p
                style={{
                  color: '#b91c1c',
                  background: '#fef2f2',
                  border: '1px solid #fee2e2',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                  textAlign: 'left',
                }}
              >
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.8rem 1rem',
                background: 'linear-gradient(180deg, #c0232b 0%, #a81c24 100%)',
                border: '1px solid #991b1b',
                borderRadius: '8px',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(168, 28, 36, 0.25)',
                marginBottom: '1rem',
              }}
            >
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>

            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setStep('initial');
                  setErrorMsg('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                }}
              >
                &larr; Back to login options
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
