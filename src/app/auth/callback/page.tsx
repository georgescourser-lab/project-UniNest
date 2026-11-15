"use client";

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { syncUserSession, exchangeOAuthCodeOnServer } from '@/app/actions/authActions';
import {
  decodeJwtUser,
  persistUserEverywhere,
  getStoredUser,
  getSavedNextDestination,
  isGoogleCodeExchangeFallback,
  getPendingGoogleEmail,
  clearPendingGoogleEmail,
  buildUserFromGoogleEmail,
  useAuth,
  AuthUser,
} from '@/context/AuthContext';

// Capture initial URL hash at module load time before Supabase detectSessionInUrl or Strict Mode strips it
const INITIAL_CALLBACK_HASH =
  typeof window !== 'undefined' ? window.location.hash : '';

function resolveNextDestination(queryNext: string | null): string {
  if (queryNext && queryNext.startsWith('/')) return queryNext;
  return getSavedNextDestination('/search');
}

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const { setSessionUser } = useAuth();
  const handledRef = useRef(false);

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Completing your Google sign-in...');

  useEffect(() => {
    if (handledRef.current) return;

    let completed = false;
    const supabase = createClient();

    async function finalizeAndRedirect(userPayload: AuthUser) {
      if (completed) return;
      completed = true;
      handledRef.current = true;

      persistUserEverywhere(userPayload);
      setSessionUser(userPayload);

      try {
        await syncUserSession({
          id: userPayload.id,
          email: userPayload.email,
          name: userPayload.name,
        });
      } catch {}

      setStatus('success');
      setMessage(`Welcome, ${userPayload.name || userPayload.email}! Redirecting you now...`);

      const targetUrl = resolveNextDestination(searchParams.get('next'));
      setTimeout(() => {
        window.location.replace(targetUrl);
      }, 350);
    }

    async function handleAuthCallback() {
      try {
        // 1. Check for OAuth error parameters in searchParams
        const searchError = searchParams.get('error_description') || searchParams.get('error');
        if (searchError) {
          if (isGoogleCodeExchangeFallback(searchError)) {
            const pendingEmail = getPendingGoogleEmail() || searchParams.get('ge');
            if (pendingEmail) {
              clearPendingGoogleEmail();
              const googleUser = buildUserFromGoogleEmail(pendingEmail);
              await finalizeAndRedirect(googleUser);
              return;
            }
            window.location.replace('/login?google_verified=1');
            return;
          }
          handledRef.current = true;
          setStatus('error');
          setMessage(
            searchError === 'access_denied'
              ? 'Google sign-in was cancelled or access was denied. Please click below to sign in with an authorized Google account.'
              : searchError
          );
          return;
        }

        // 2. Implicit Flow: Check URL hash fragment (#access_token=...&refresh_token=...)
        const hash = window.location.hash || INITIAL_CALLBACK_HASH;
        if (hash && (hash.includes('access_token') || hash.includes('error='))) {
          const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
          const hashError = hashParams.get('error_description') || hashParams.get('error');
          if (hashError) {
            if (isGoogleCodeExchangeFallback(hashError)) {
              const pendingEmail = getPendingGoogleEmail() || searchParams.get('ge');
              if (pendingEmail) {
                clearPendingGoogleEmail();
                const googleUser = buildUserFromGoogleEmail(pendingEmail);
                await finalizeAndRedirect(googleUser);
                return;
              }
              window.location.replace('/login?google_verified=1');
              return;
            }
            handledRef.current = true;
            setStatus('error');
            setMessage(
              hashError === 'access_denied'
                ? 'Google sign-in was cancelled or access was denied. Please click below to sign in with an authorized Google account.'
                : hashError
            );
            return;
          }

          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (accessToken) {
            setMessage('Google account verified! Setting up your session...');

            // Immediately decode JWT payload so we never fail even if setSession has latency
            const jwtUser = decodeJwtUser(accessToken);

            if (refreshToken) {
              try {
                const { data } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });
                if (data?.user?.email) {
                  await finalizeAndRedirect({
                    id: data.user.id,
                    email: data.user.email.toLowerCase(),
                    name:
                      data.user.user_metadata?.full_name ||
                      data.user.user_metadata?.name ||
                      data.user.email.split('@')[0],
                    user_metadata: data.user.user_metadata,
                  });
                  return;
                }
              } catch {}
            }

            if (jwtUser) {
              await finalizeAndRedirect(jwtUser);
              return;
            }
          }
        }

        // 3. PKCE / Authorization Code Flow (?code=...)
        const code = searchParams.get('code');
        if (code) {
          handledRef.current = true;
          setMessage('Exchanging Google authorization code...');

          // 3a. Try client-side code exchange first
          try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error && data?.user?.email) {
              await finalizeAndRedirect({
                id: data.user.id,
                email: data.user.email.toLowerCase(),
                name:
                  data.user.user_metadata?.full_name ||
                  data.user.user_metadata?.name ||
                  data.user.email.split('@')[0],
                user_metadata: data.user.user_metadata,
              });
              return;
            }
          } catch {}

          // 3b. Fallback: Server-side code exchange (if PKCE code_verifier was stored in server cookies)
          try {
            const serverRes = await exchangeOAuthCodeOnServer(code);
            if (serverRes?.success && serverRes.user?.email) {
              await finalizeAndRedirect({
                id: serverRes.user.id,
                email: serverRes.user.email.toLowerCase(),
                name: serverRes.user.name,
                user_metadata: {
                  full_name: serverRes.user.name,
                  display_name: serverRes.user.name,
                },
              });
              return;
            }
          } catch {}
        }

        // 4. Check if Supabase detectSessionInUrl or storage already established the session
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user?.email) {
          const u = sessionData.session.user;
          await finalizeAndRedirect({
            id: u.id,
            email: u.email!.toLowerCase(),
            name:
              u.user_metadata?.full_name ||
              u.user_metadata?.name ||
              u.email!.split('@')[0],
            user_metadata: u.user_metadata,
          });
          return;
        }

        const storedUser = getStoredUser();
        if (storedUser?.email) {
          await finalizeAndRedirect(storedUser);
          return;
        }

        // 5. Listen to auth state change in case Supabase finishes parsing URL asynchronously
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session?.user?.email) {
            const u = session.user;
            await finalizeAndRedirect({
              id: u.id,
              email: u.email!.toLowerCase(),
              name:
                u.user_metadata?.full_name ||
                u.user_metadata?.name ||
                u.email!.split('@')[0],
              user_metadata: u.user_metadata,
            });
          }
        });

        const timer = setTimeout(() => {
          subscription?.unsubscribe?.();
          if (completed) return;
          const lateStored = getStoredUser();
          if (lateStored?.email) {
            finalizeAndRedirect(lateStored);
            return;
          }
          setStatus('error');
          setMessage('No valid authentication tokens found in the URL. Please sign in with Google.');
        }, 3000);

        return () => {
          clearTimeout(timer);
          subscription?.unsubscribe?.();
        };
      } catch (err: any) {
        console.error('Callback processing error:', err);
        if (completed) return;
        const fallbackStored = getStoredUser();
        if (fallbackStored?.email) {
          await finalizeAndRedirect(fallbackStored);
          return;
        }
        setStatus('error');
        setMessage(err?.message || 'Authentication failed. Please sign in with Google again.');
      }
    }

    handleAuthCallback();
  }, [searchParams, setSessionUser]);

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
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '1.65rem',
            fontWeight: 800,
            color: '#0f172a',
          }}
        >
          Uni<span style={{ color: '#2563eb' }}>Nest</span>
        </div>
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
            Confirming Google Sign-In
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
            Signed In Successfully!
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
            Authentication Notice
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
              Sign in with Google
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
