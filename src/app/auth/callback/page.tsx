"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { syncUserSession } from '@/app/actions/authActions';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next') || '/search';

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your account details...');

  useEffect(() => {
    let isMounted = true;

    async function handleAuthCallback() {
      try {
        const supabase = createClient();

        // 1. Check for error parameters in searchParams or hash
        const searchError = searchParams.get('error_description') || searchParams.get('error');
        if (searchError) {
          if (!isMounted) return;
          setStatus('error');
          setMessage(searchError);
          return;
        }

        // 1b. Check for signed email confirmation link token (?verify_token=...)
        const verifyToken = searchParams.get('verify_token');
        if (verifyToken) {
          setMessage('Confirming your email address...');
          const res = await fetch('/api/auth/otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'verify_link', verifyToken }),
          });
          const data = await res.json();
          if (!res.ok || data.error) {
            if (!isMounted) return;
            setStatus('error');
            setMessage(data.error || 'Confirmation link is invalid or expired.');
            return;
          }

          if (data?.user) {
            const userPayload = {
              id: data.user.id,
              email: data.user.email || '',
              name: data.user.name || data.user.email?.split('@')[0] || 'Student',
            };
            try {
              localStorage.setItem('uninest_user', JSON.stringify(userPayload));
              document.cookie = `uninest_user_client=${encodeURIComponent(JSON.stringify(userPayload))}; path=/; max-age=2592000; SameSite=Lax`;
            } catch (e) {}

            await syncUserSession(userPayload);

            if (!isMounted) return;
            setStatus('success');
            setMessage('Email confirmed! Welcome to UniNest. Redirecting...');
            setTimeout(() => {
              window.location.href = nextParam;
            }, 600);
            return;
          }
        }

        // 2. Implicit Flow: Check URL hash fragment (#access_token=...&refresh_token=...)
        const hash = window.location.hash;
        if (hash && hash.includes('access_token')) {
          const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
          const hashError = hashParams.get('error_description') || hashParams.get('error');
          if (hashError) {
            if (!isMounted) return;
            setStatus('error');
            setMessage(hashError);
            return;
          }

          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (accessToken && refreshToken) {
            setMessage('Account verified! Setting up your session...');
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) throw error;

            if (data?.user) {
              const userPayload = {
                id: data.user.id,
                email: data.user.email || '',
                name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Student',
              };

              // Persist locally & server-side cookies
              try {
                localStorage.setItem('uninest_user', JSON.stringify(userPayload));
                document.cookie = `uninest_user_client=${encodeURIComponent(JSON.stringify(userPayload))}; path=/; max-age=2592000; SameSite=Lax`;
              } catch (e) {}

              await syncUserSession(userPayload);

              if (!isMounted) return;
              setStatus('success');
              setMessage('Welcome to UniNest! Redirecting you now...');

              // Clean URL and redirect
              setTimeout(() => {
                window.location.href = nextParam;
              }, 600);
              return;
            }
          }
        }

        // 3. PKCE/OAuth fallback: Check for code in searchParams (?code=...)
        const code = searchParams.get('code');
        if (code) {
          setMessage('Exchanging authorization code...');
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          if (data?.user) {
            const userPayload = {
              id: data.user.id,
              email: data.user.email || '',
              name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Student',
            };

            try {
              localStorage.setItem('uninest_user', JSON.stringify(userPayload));
              document.cookie = `uninest_user_client=${encodeURIComponent(JSON.stringify(userPayload))}; path=/; max-age=2592000; SameSite=Lax`;
            } catch (e) {}

            await syncUserSession(userPayload);

            if (!isMounted) return;
            setStatus('success');
            setMessage('Signed in successfully! Redirecting...');
            setTimeout(() => {
              window.location.href = nextParam;
            }, 600);
            return;
          }
        }

        // 4. Session check fallback: inspect if user is already authenticated
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          const u = sessionData.session.user;
          const userPayload = {
            id: u.id,
            email: u.email || '',
            name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Student',
          };
          await syncUserSession(userPayload);
          if (!isMounted) return;
          setStatus('success');
          setMessage('Session verified! Redirecting...');
          setTimeout(() => {
            window.location.href = nextParam;
          }, 500);
          return;
        }

        // 5. If after a brief wait no credentials arrived
        const timer = setTimeout(() => {
          if (!isMounted) return;
          setStatus('error');
          setMessage('No valid confirmation tokens found in the URL. Please log in with your email and password.');
        }, 2500);

        return () => clearTimeout(timer);
      } catch (err: any) {
        console.error('Callback processing error:', err);
        if (!isMounted) return;
        setStatus('error');
        setMessage(err?.message || 'Authentication failed. Please try logging in again.');
      }
    }

    handleAuthCallback();

    return () => {
      isMounted = false;
    };
  }, [router, searchParams, nextParam]);

  return (
    <div
      style={{
        maxWidth: '440px',
        width: '100%',
        margin: '2rem auto',
        padding: '2.25rem 2rem',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
        textAlign: 'center',
        border: '1px solid #f1f5f9',
      }}
    >
      <div style={{ marginBottom: '1.25rem' }}>
        <img
          src="/images/logo.png"
          alt="UniNest Logo"
          style={{ width: '130px', height: 'auto', margin: '0 auto', display: 'block' }}
        />
      </div>

      {status === 'verifying' && (
        <div>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3.5px solid #e2e8f0',
              borderTopColor: '#2563eb',
              borderRadius: '50%',
              margin: '0 auto 1.25rem',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
            Confirming Authentication
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5 }}>{message}</p>
        </div>
      )}

      {status === 'success' && (
        <div>
          <div
            style={{
              width: '48px',
              height: '48px',
              background: '#dcfce7',
              color: '#166534',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 700,
              margin: '0 auto 1.25rem',
            }}
          >
            ✓
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#166534', marginBottom: '0.4rem' }}>
            Success!
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#166534', lineHeight: 1.5 }}>{message}</p>
        </div>
      )}

      {status === 'error' && (
        <div>
          <div
            style={{
              width: '48px',
              height: '48px',
              background: '#fee2e2',
              color: '#991b1b',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 700,
              margin: '0 auto 1.25rem',
            }}
          >
            !
          </div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
            Verification Notice
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#b91c1c', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            {message}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <Link
              href="/login"
              style={{
                display: 'inline-block',
                background: '#2563eb',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.88rem',
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                textDecoration: 'none',
              }}
            >
              Go to Log In
            </Link>
            <Link
              href="/signup"
              style={{
                display: 'inline-block',
                background: '#f1f5f9',
                color: '#334155',
                fontWeight: 600,
                fontSize: '0.88rem',
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                textDecoration: 'none',
                border: '1px solid #cbd5e1',
              }}
            >
              Sign Up
            </Link>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <main
      style={{
        minHeight: 'calc(100vh - 80px)',
        padding: '5rem 1rem 3rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
      }}
    >
      <Suspense
        fallback={
          <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
            Loading authentication handler...
          </div>
        }
      >
        <AuthCallbackContent />
      </Suspense>
    </main>
  );
}
