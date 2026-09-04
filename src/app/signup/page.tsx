"use client";

import { useActionState } from 'react';
import Link from 'next/link';
import { signup } from '@/app/actions/authActions';

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, null);

  return (
    <main className="auth-page auth-page-signup">
      <section className="auth-card">
        <div className="auth-card-header">
          <p className="auth-kicker">Get started</p>
          <h1>Create your UniNest account</h1>
          <p className="auth-helper">Save listings, stay organized, and contact trusted agents faster.</p>
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
              placeholder="Create a secure password"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>

          {state?.error ? <p className="auth-error" role="alert">{state.error}</p> : null}

          <button className="btn btn-primary auth-submit" type="submit" disabled={pending}>
            {pending ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </section>
    </main>
  );
}
