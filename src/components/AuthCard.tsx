'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { getGoogleOAuthUrl } from '@/app/actions/authActions';
import { useAuth, getValidOAuthRedirectUrl } from '@/context/AuthContext';

interface AuthCardProps {
  initialTab?: 'signin' | 'signup';
}

function formatOAuthError(rawError: string | null): string | null {
  if (!rawError) return null;
  if (rawError === 'access_denied') {
    return 'Google sign-in was cancelled or access was denied. Please click "Continue with Google" below and choose an authorized Google account.';
  }
  return rawError;
}

export default function AuthCard({ initialTab = 'signin' }: AuthCardProps) {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next') || '/search';
  const { user, isVerifiedAgent, logout } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    const queryErr = searchParams.get('error_description') || searchParams.get('error');
    return formatOAuthError(queryErr);
  });

  useEffect(() => {
    const queryErr = searchParams.get('error_description') || searchParams.get('error');
    if (queryErr) {
      setError(formatOAuthError(queryErr));
    } else if (typeof window !== 'undefined' && window.location.hash.includes('error=')) {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const hashErr = hashParams.get('error_description') || hashParams.get('error');
      if (hashErr) {
        setError(formatOAuthError(hashErr));
      }
    }
  }, [searchParams]);

  const handleGoogleSignIn = async (selectAccount = false) => {
    setError(null);
    setLoading(true);
    try {
      const origin = window.location.origin;
      try {
        localStorage.setItem('uninest_auth_next', nextParam);
        document.cookie = `uninest_auth_next=${encodeURIComponent(nextParam)}; path=/; max-age=900; SameSite=Lax`;
      } catch {}

      const redirectTo = getValidOAuthRedirectUrl(origin, nextParam);

      // Use browser Supabase client first (implicit flow, keeps session & verifier in browser storage)
      try {
        const supabase = createClient();
        const { data, error: oauthErr } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            ...(selectAccount
              ? {
                  queryParams: {
                    prompt: 'select_account',
                  },
                }
              : {}),
          },
        });
        if (!oauthErr && data?.url) {
          window.location.href = data.url;
          return;
        }
      } catch {
        // Fallback to server action below
      }

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

  return (
    <div
      style={{
        maxWidth: '440px',
        width: '100%',
        margin: '0 auto',
        background: '#ffffff',
        borderRadius: '20px',
        boxShadow:
          '0 20px 45px rgba(15, 23, 42, 0.08), 0 4px 12px rgba(15, 23, 42, 0.04)',
        border: '1px solid #e2e8f0',
        padding: '2.5rem 2rem',
        textAlign: 'center',
      }}
    >
      {/* Brand Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '1.65rem',
            fontWeight: 800,
            color: '#0f172a',
            marginBottom: '0.5rem',
          }}
        >
          Uni<span style={{ color: '#2563eb' }}>Nest</span>
        </div>
        <h1
          style={{
            fontSize: '1.35rem',
            fontWeight: 700,
            color: '#0f172a',
            margin: '0 0 0.5rem 0',
          }}
        >
          {initialTab === 'signup' ? 'Join UniNest with Google' : 'Sign in to UniNest'}
        </h1>
        <p style={{ fontSize: '0.92rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
          Use your Google account to securely browse student housing, book verified agent viewings, and trade on the campus marketplace.
        </p>
      </div>

      {/* Already Signed-In Notice */}
      {user && (
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.25rem',
            textAlign: 'left',
          }}
        >
          <div style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 700, marginBottom: '0.25rem' }}>
            ✓ Signed in as {user.name || user.email}
            {isVerifiedAgent ? ' (Verified Agent)' : ' (Student / Client)'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#15803d', marginBottom: '0.75rem' }}>
            {user.email}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link
              href={nextParam || '/search'}
              className="btn btn-primary"
              style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem', textDecoration: 'none' }}
            >
              Continue to {nextParam === '/post-property' ? 'Post House' : 'UniNest'} &rarr;
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
            >
              Switch Google Account
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
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
            textAlign: 'left',
          }}
        >
          {error}
        </div>
      )}

      {/* Google OAuth Button */}
      <button
        type="button"
        onClick={() => handleGoogleSignIn(false)}
        disabled={loading}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          padding: '0.9rem 1.25rem',
          borderRadius: '12px',
          border: '1.5px solid #cbd5e1',
          background: '#ffffff',
          color: '#0f172a',
          fontWeight: 700,
          fontSize: '0.98rem',
          cursor: loading ? 'not-allowed' : 'pointer',
          boxShadow: '0 2px 6px rgba(15, 23, 42, 0.05)',
          transition: 'all 0.15s ease',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24">
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
        {loading ? 'Redirecting to Google...' : 'Continue with Google'}
      </button>

      <div style={{ marginTop: '0.75rem' }}>
        <button
          type="button"
          onClick={() => handleGoogleSignIn(true)}
          disabled={loading}
          style={{
            background: 'none',
            border: 'none',
            color: '#2563eb',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            textDecoration: 'underline',
            padding: '0.25rem 0.5rem',
          }}
        >
          Choose a different Google account
        </button>
      </div>

      <div
        style={{
          marginTop: '1.5rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid #f1f5f9',
          fontSize: '0.8rem',
          color: '#94a3b8',
          lineHeight: 1.5,
        }}
      >
        🔒 One-click verified Google authentication. Passwords are never stored by UniNest.
      </div>
    </div>
  );
}
