"use client";

import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { login } from '@/app/actions/authActions';

export default function LoginPage() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(login, null);
  
  // This state just handles initial messages like ?signup=success
  const [initialMessage, setInitialMessage] = useState(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('signup=success')) {
      return 'Account created. Please log in to continue.';
    }
    if (typeof window !== 'undefined' && window.location.search.includes('error=')) {
      return new URLSearchParams(window.location.search).get('error') || '';
    }
    return '';
  });

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-card-header">
          <p className="auth-kicker">Welcome back</p>
          <h1>Log in to UniNest</h1>
          <p className="auth-helper">Access saved listings, contact agents, and manage your student housing journey.</p>
        </div>

        <form className="auth-form" action={formAction}>
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              placeholder="student@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </label>

          {(state?.error || initialMessage) ? (
            <p className="auth-error" role="alert">{state?.error || initialMessage}</p>
          ) : null}

          <button className="btn btn-primary auth-submit" type="submit" disabled={pending}>
            {pending ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="auth-switch">
          Don&apos;t have an account? <Link href="/signup">Sign up</Link>
        </p>
      </section>
    </main>
  );
}
