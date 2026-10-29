"use client";

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signInWithEmailOnly } from '@/app/actions/authActions';

interface AuthCardProps {
  initialTab?: 'signin' | 'signup';
  initialMode?: 'email' | 'phone';
  reason?: string;
  onClose?: () => void;
}

export default function AuthCard({
  reason,
  onClose,
}: AuthCardProps) {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next') || '/search';

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await signInWithEmailOnly(cleanEmail);
      if (res.error || !res.user) {
        setErrorMsg(res.error || 'Could not sign in with that email.');
        setLoading(false);
        return;
      }

      const userPayload = {
        id: res.user.id,
        email: res.user.email,
        name: res.user.name,
        createdAt: Date.now(),
      };

      try {
        localStorage.setItem('uninest_user', JSON.stringify(userPayload));
        const encoded = encodeURIComponent(JSON.stringify(userPayload));
        document.cookie = `uninest_user_client=${encoded}; path=/; max-age=2592000; SameSite=Lax`;
        document.cookie = `uninest_user_session=${encoded}; path=/; max-age=2592000; SameSite=Lax`;
      } catch (e) {}

      window.location.href = nextParam;
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to sign in. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '420px',
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
          padding: '1.4rem 1.5rem 1rem',
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
              marginBottom: '0.25rem',
            }}
          >
            QUICK EMAIL ACCESS
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: '1.4rem',
              color: '#0f172a',
              fontWeight: 700,
              letterSpacing: '-0.01em',
            }}
          >
            Sign in with your Email
          </h2>
          <p
            style={{
              margin: '0.35rem 0 0 0',
              fontSize: '0.86rem',
              color: '#64748b',
              lineHeight: 1.45,
            }}
          >
            {reason ||
              'Enter your email address below to continue as a student client or access the verified Agent Portal.'}
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
      <div style={{ padding: '1.25rem 1.5rem 1.4rem' }}>
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', width: '100%' }}>
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
              placeholder="you@example.com or agent@uni-nest.app"
              autoComplete="email"
              required
              autoFocus
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.75rem 0.95rem',
                border: '1.5px solid #cbd5e1',
                borderRadius: '10px',
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
              height: '44px',
              padding: '0.65rem 1.25rem',
              fontWeight: 700,
              borderRadius: '10px',
              fontSize: '0.95rem',
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
          >
            {loading ? 'Signing in...' : 'Continue with Email'}
          </button>
        </form>
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
        🔒 Instant email sign-in for students &amp; verified UniNest agents.
      </div>
    </div>
  );
}
