"use client";

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getGoogleOAuthUrl } from '@/app/actions/authActions';

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

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(() => {
    if (typeof window !== 'undefined') {
      const err = new URLSearchParams(window.location.search).get('error');
      if (err) return err;
    }
    return '';
  });

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const origin = window.location.origin;
      const res = await getGoogleOAuthUrl(origin, nextParam);

      if (res.error) {
        setErrorMsg(res.error);
        setLoading(false);
        return;
      }

      if (res.url) {
        window.location.href = res.url;
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Google sign-in failed. Please try again.');
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
          padding: '1.5rem 1.5rem 1.1rem',
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
            {initialTab === 'signup' ? 'GET STARTED' : 'WELCOME TO UNINEST'}
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
            Sign in with Google
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
              'Continue with your Google account to book agent viewings, save properties, list items, or access the Agent Portal.'}
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

      {/* Body Content — Google Sign-In Only */}
      <div style={{ padding: '1.5rem' }}>
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

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            width: '100%',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            color: '#0f172a',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '0.96rem',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
            opacity: loading ? 0.7 : 1,
          }}
          onMouseOver={(e) => {
            if (!loading) {
              e.currentTarget.style.borderColor = '#2563eb';
              e.currentTarget.style.background = '#f8fafc';
            }
          }}
          onMouseOut={(e) => {
            if (!loading) {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.background = '#ffffff';
            }
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
          {loading ? 'Connecting to Google...' : 'Continue with Google'}
        </button>
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
        🔒 One-click Google authentication powered by Supabase.
      </div>
    </div>
  );
}
