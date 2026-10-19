"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getGoogleOAuthUrl, signupWithPassword } from '@/app/actions/authActions';

export default function SpotifySignup() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next') || '/search';

  // Current Step: 1 = Email, 2 = Password, 3 = About You, 4 = Terms, 5 = Account Created
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // About You Fields
  const [name, setName] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [gender, setGender] = useState('');

  // Terms & Marketing Fields
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [shareDataOptIn, setShareDataOptIn] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // UI state
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Live Password Rules Validation
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumberOrSpecial = /[0-9!@#$%^&*(),.?":{}|<>]/.test(password);
  const hasMinLength = password.length >= 10;
  const isPasswordValid = hasLetter && hasNumberOrSpecial && hasMinLength;

  // 1. Social Login (Google)
  const handleGoogleSignUp = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const origin = window.location.origin;
      const res = await getGoogleOAuthUrl(origin, nextParam);

      if (res.error) {
        if (res.error.toLowerCase().includes('not enabled')) {
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
      setErrorMsg(err.message || 'Google sign up failed.');
      setLoading(false);
    }
  };

  // Step 1 Validation -> Step 2
  const handleEmailNext = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      setErrorMsg('This email is invalid. Make sure it looks like name@example.com.');
      return;
    }
    setStep(2);
  };

  // Step 2 Validation -> Step 3
  const handlePasswordNext = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!isPasswordValid) {
      setErrorMsg('Please ensure all password requirements are satisfied.');
      return;
    }
    setStep(3);
  };

  // Step 3 Validation -> Step 4
  const handleAboutNext = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!name.trim()) {
      setErrorMsg('Please enter your name.');
      return;
    }
    const d = parseInt(day, 10);
    const y = parseInt(year, 10);
    if (!d || d < 1 || d > 31 || !month || !y || y < 1920 || y > 2026) {
      setErrorMsg('Please enter a valid date of birth.');
      return;
    }
    if (!gender) {
      setErrorMsg('Please select your gender.');
      return;
    }
    setStep(4);
  };

  // Step 4 Final Submit -> Account Creation
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!termsAccepted) {
      setErrorMsg('Please agree to the Terms and Conditions and Privacy Policy to continue.');
      return;
    }

    setLoading(true);
    try {
      const origin = window.location.origin;
      const birthDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const res = await signupWithPassword(email, password, origin, nextParam, {
        fullName: name.trim(),
        birthDate,
        gender,
        marketingOptIn,
      });

      if (res.error) {
        setErrorMsg(res.error);
        setLoading(false);
        return;
      }

      setStep(5);
      setTimeout(() => {
        window.location.href = nextParam;
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Account creation failed. Please try again.');
      setLoading(false);
    }
  };

  // Navigation: Go Back
  const handleBack = () => {
    setErrorMsg('');
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
    else if (step === 4) setStep(3);
  };

  // Progress Bar percentage
  const progressPercent = step === 1 ? 25 : step === 2 ? 50 : step === 3 ? 75 : 100;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '440px',
        margin: '0 auto',
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '16px',
        padding: '2.5rem 2rem',
        boxShadow: '0 4px 24px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
        fontFamily: 'inherit',
      }}
    >
      {/* Top Header / Brand Logo */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.4rem' }}>🏠</span>
          <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>UniNest</span>
        </Link>
      </div>

      {/* Progress Bar (Visible on Steps 1 - 4) */}
      {step < 5 && (
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: 0,
                }}
              >
                <span>&larr;</span> Back
              </button>
            ) : (
              <div />
            )}
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>
              Step {step} of 4
            </span>
          </div>
          <div style={{ width: '100%', height: '5px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: '#1ed760',
                borderRadius: '999px',
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </div>
        </div>
      )}

      {/* Error message */}
      {errorMsg && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fee2e2',
            color: '#b91c1c',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            fontSize: '0.88rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ================= STEP 1: ENTER EMAIL ================= */}
      {step === 1 && (
        <div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#111827',
              textAlign: 'center',
              lineHeight: 1.25,
              marginBottom: '1.5rem',
              letterSpacing: '-0.02em',
            }}
          >
            Sign up to start finding your student home
          </h1>

          {/* Social Sign Up (Google) */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={loading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              background: '#ffffff',
              border: '1.5px solid #d1d5db',
              color: '#1f2937',
              padding: '0.75rem 1rem',
              borderRadius: '500px',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: 'pointer',
              marginBottom: '1.25rem',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = '#111827';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Sign up with Google
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '1.25rem 0', color: '#94a3b8', fontSize: '0.85rem' }}>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            <span style={{ padding: '0 0.85rem', color: '#64748b', fontWeight: 600 }}>or</span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          </div>

          <form onSubmit={handleEmailNext}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                htmlFor="signup-email-input"
                style={{
                  display: 'block',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  color: '#111827',
                  marginBottom: '0.45rem',
                }}
              >
                Email address
              </label>
              <input
                id="signup-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                required
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem',
                  border: '1.5px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.95rem',
                  color: '#111827',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#1ed760';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db';
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                background: '#1ed760',
                border: 'none',
                borderRadius: '500px',
                color: '#000000',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, background-color 0.15s ease',
                marginTop: '0.5rem',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#1fdf64';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#1ed760';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              Next
            </button>
          </form>

          {/* Already have an account link */}
          <div style={{ textAlign: 'center', marginTop: '2rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Already have an account? </span>
            <Link
              href={`/login?next=${encodeURIComponent(nextParam)}`}
              style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827', textDecoration: 'underline' }}
            >
              Log in here
            </Link>
          </div>
        </div>
      )}

      {/* ================= STEP 2: CREATE PASSWORD ================= */}
      {step === 2 && (
        <div>
          <h1
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: '#111827',
              marginBottom: '0.35rem',
              letterSpacing: '-0.02em',
            }}
          >
            Create a password
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1.25rem' }}>
            Creating password for <strong>{email}</strong>
          </p>

          <form onSubmit={handlePasswordNext}>
            <div style={{ marginBottom: '1.25rem', position: 'relative' }}>
              <label
                htmlFor="signup-password-input"
                style={{
                  display: 'block',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  color: '#111827',
                  marginBottom: '0.45rem',
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="signup-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a secure password"
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '0.8rem 2.75rem 0.8rem 1rem',
                    border: '1.5px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.95rem',
                    color: '#111827',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1ed760';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    padding: 0,
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Rules shown live */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                marginBottom: '1.5rem',
              }}
            >
              <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
                Your password must contain at least:
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.4rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: hasLetter ? '#15803d' : '#64748b' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{hasLetter ? '✓' : '◯'}</span>
                  1 letter
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: hasNumberOrSpecial ? '#15803d' : '#64748b' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{hasNumberOrSpecial ? '✓' : '◯'}</span>
                  1 number or special character (e.g. # ? ! &)
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: hasMinLength ? '#15803d' : '#64748b' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{hasMinLength ? '✓' : '◯'}</span>
                  10 characters
                </li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={!isPasswordValid}
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                background: isPasswordValid ? '#1ed760' : '#e2e8f0',
                border: 'none',
                borderRadius: '500px',
                color: isPasswordValid ? '#000000' : '#94a3b8',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: isPasswordValid ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => {
                if (isPasswordValid) {
                  e.currentTarget.style.backgroundColor = '#1fdf64';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }
              }}
              onMouseOut={(e) => {
                if (isPasswordValid) {
                  e.currentTarget.style.backgroundColor = '#1ed760';
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
            >
              Next
            </button>
          </form>
        </div>
      )}

      {/* ================= STEP 3: ABOUT YOU ================= */}
      {step === 3 && (
        <div>
          <h1
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: '#111827',
              marginBottom: '0.35rem',
              letterSpacing: '-0.02em',
            }}
          >
            Tell us about yourself
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '1.25rem' }}>
            This helps verify student identity and match roommates.
          </p>

          <form onSubmit={handleAboutNext}>
            {/* Name */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                htmlFor="signup-name-input"
                style={{
                  display: 'block',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  color: '#111827',
                  marginBottom: '0.25rem',
                }}
              >
                Name
              </label>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.45rem' }}>
                This name will appear on your profile
              </p>
              <input
                id="signup-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Kamau"
                required
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem',
                  border: '1.5px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.95rem',
                  color: '#111827',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Date of Birth */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  color: '#111827',
                  marginBottom: '0.25rem',
                }}
              >
                Date of birth
              </label>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.45rem' }}>
                Used to verify student status
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 90px', gap: '0.5rem' }}>
                <input
                  type="number"
                  placeholder="DD"
                  min="1"
                  max="31"
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  required
                  style={{
                    padding: '0.8rem 0.5rem',
                    border: '1.5px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.95rem',
                    textAlign: 'center',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  required
                  style={{
                    padding: '0.8rem 0.5rem',
                    border: '1.5px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.95rem',
                    background: '#ffffff',
                    color: month ? '#111827' : '#94a3b8',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="" disabled>Month</option>
                  <option value="1">January</option>
                  <option value="2">February</option>
                  <option value="3">March</option>
                  <option value="4">April</option>
                  <option value="5">May</option>
                  <option value="6">June</option>
                  <option value="7">July</option>
                  <option value="8">August</option>
                  <option value="9">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </select>
                <input
                  type="number"
                  placeholder="YYYY"
                  min="1920"
                  max="2026"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  required
                  style={{
                    padding: '0.8rem 0.5rem',
                    border: '1.5px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.95rem',
                    textAlign: 'center',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Gender */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  color: '#111827',
                  marginBottom: '0.45rem',
                }}
              >
                What&apos;s your gender?
              </label>
              <div style={{ display: 'grid', gap: '0.4rem' }}>
                {['Man', 'Woman', 'Non-binary', 'Something else', 'Prefer not to say'].map((option) => (
                  <label
                    key={option}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      padding: '0.55rem 0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      background: gender === option ? '#f0fdf4' : '#ffffff',
                      borderColor: gender === option ? '#1ed760' : '#e2e8f0',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      color: '#1f2937',
                    }}
                  >
                    <input
                      type="radio"
                      name="gender"
                      value={option}
                      checked={gender === option}
                      onChange={() => setGender(option)}
                      style={{ accentColor: '#1ed760' }}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                background: '#1ed760',
                border: 'none',
                borderRadius: '500px',
                color: '#000000',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#1fdf64';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#1ed760';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              Next
            </button>
          </form>
        </div>
      )}

      {/* ================= STEP 4: TERMS & MARKETING ================= */}
      {step === 4 && (
        <div>
          <h1
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: '#111827',
              marginBottom: '0.45rem',
              letterSpacing: '-0.02em',
            }}
          >
            Terms & Conditions
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '1.25rem' }}>
            Please review and confirm to complete your registration.
          </p>

          <form onSubmit={handleFinalSubmit}>
            <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
              {/* Marketing Opt-in */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={marketingOptIn}
                  onChange={(e) => setMarketingOptIn(e.target.checked)}
                  style={{ accentColor: '#1ed760', width: '18px', height: '18px', marginTop: '2px' }}
                />
                <span style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.45 }}>
                  I would like to receive marketing communications, housing updates, and roommate tips from UniNest.
                </span>
              </label>

              {/* Data sharing opt-in */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={shareDataOptIn}
                  onChange={(e) => setShareDataOptIn(e.target.checked)}
                  style={{ accentColor: '#1ed760', width: '18px', height: '18px', marginTop: '2px' }}
                />
                <span style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.45 }}>
                  Share my registration data with authorized accommodation providers and agents for viewing appointments.
                </span>
              </label>

              {/* Required Terms Agreement */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  padding: '0.75rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              >
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  required
                  style={{ accentColor: '#1ed760', width: '18px', height: '18px', marginTop: '2px' }}
                />
                <span style={{ fontSize: '0.85rem', color: '#0f172a', lineHeight: 1.45, fontWeight: 500 }}>
                  I agree to the UniNest{' '}
                  <Link href="#" style={{ color: '#16a34a', fontWeight: 700, textDecoration: 'underline' }}>
                    Terms and Conditions of Use
                  </Link>{' '}
                  and{' '}
                  <Link href="#" style={{ color: '#16a34a', fontWeight: 700, textDecoration: 'underline' }}>
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !termsAccepted}
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                background: termsAccepted ? '#1ed760' : '#e2e8f0',
                border: 'none',
                borderRadius: '500px',
                color: termsAccepted ? '#000000' : '#94a3b8',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: termsAccepted && !loading ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => {
                if (termsAccepted && !loading) {
                  e.currentTarget.style.backgroundColor = '#1fdf64';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }
              }}
              onMouseOut={(e) => {
                if (termsAccepted && !loading) {
                  e.currentTarget.style.backgroundColor = '#1ed760';
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
            >
              {loading ? 'Creating Account...' : 'Sign up'}
            </button>
          </form>
        </div>
      )}

      {/* ================= STEP 5: ACCOUNT CREATED ================= */}
      {step === 5 && (
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              background: '#1ed760',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              color: '#000000',
              fontSize: '2rem',
              boxShadow: '0 4px 12px rgba(30, 215, 96, 0.4)',
            }}
          >
            ✓
          </div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#111827',
              marginBottom: '0.5rem',
              letterSpacing: '-0.02em',
            }}
          >
            Account created!
          </h1>
          <p style={{ fontSize: '0.95rem', color: '#4b5563', lineHeight: 1.5, marginBottom: '1.5rem' }}>
            Welcome to UniNest, <strong>{name || email}</strong>! We&apos;re preparing your personalized housing dashboard now...
          </p>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#15803d',
              fontSize: '0.88rem',
              fontWeight: 600,
            }}
          >
            <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
            Redirecting to your destination...
          </div>
        </div>
      )}
    </div>
  );
}
