'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getGoogleOAuthUrl } from '@/app/actions/authActions';

interface AuthCardProps {
  initialTab?: 'signin' | 'signup';
}

export default function AuthCard({ initialTab = 'signin' }: AuthCardProps) {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next') || '/search';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
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
        onClick={handleGoogleSignIn}
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
