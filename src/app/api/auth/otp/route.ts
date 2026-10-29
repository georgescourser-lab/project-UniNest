import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

const OTP_COOKIE_NAME = 'uninest_otp_challenge';
const VAULT_COOKIE_NAME = 'uninest_accounts_vault';
const SESSION_COOKIE_NAME = 'uninest_user_session';
const CLIENT_COOKIE_NAME = 'uninest_user_client';
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const THIRTY_DAYS_SEC = 60 * 60 * 24 * 30;

interface StoredAccount {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  confirmed: boolean;
  code?: string;
  codeExpiresAt?: number;
  createdAt: number;
}

// 1. In-memory store + OS temp file store for cross-request persistence
const memoryAccounts = new Map<string, StoredAccount>();
const STORE_FILE_PATH = path.join(os.tmpdir(), 'uninest-auth-accounts.json');

function loadFileAccounts(): Record<string, StoredAccount> {
  try {
    if (fs.existsSync(STORE_FILE_PATH)) {
      const raw = fs.readFileSync(STORE_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        for (const [k, v] of Object.entries(parsed)) {
          if (!memoryAccounts.has(k)) {
            memoryAccounts.set(k, v as StoredAccount);
          }
        }
        return parsed;
      }
    }
  } catch {
    // Ignore file read errors
  }
  return {};
}

function saveAccountToStore(account: StoredAccount) {
  const emailKey = account.email.toLowerCase();
  memoryAccounts.set(emailKey, account);
  try {
    const existing = loadFileAccounts();
    existing[emailKey] = account;
    fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(existing, null, 2), 'utf8');
  } catch {
    // Ignore file write errors in read-only environments
  }
}

function getResendApiKey(): string {
  return (
    process.env.RESEND_API_KEY ||
    process.env.SUPABASE_AUTH_SMTP_PASS ||
    ''
  ).trim();
}

function getSigningSecret(): string {
  return (
    getResendApiKey() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'uninest-auth-hmac-secret-2026'
  );
}

function hashPassword(email: string, password: string): string {
  return crypto
    .createHmac('sha256', getSigningSecret())
    .update(`${email.toLowerCase().trim()}:${password}`)
    .digest('hex');
}

function signPayload(payloadObj: any): string {
  const json = JSON.stringify(payloadObj);
  const b64 = Buffer.from(json, 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(b64)
    .digest('base64url');
  return `${b64}.${sig}`;
}

function verifySignedPayload<T = any>(token?: string): T | null {
  if (!token || !token.includes('.')) return null;
  const [b64, sig] = token.split('.');
  if (!b64 || !sig) return null;
  const expectedSig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(b64)
    .digest('base64url');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      return null;
    }
    const json = Buffer.from(b64, 'base64url').toString('utf8');
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

function getAccountFromEverywhere(
  email: string,
  vaultCookieVal?: string
): StoredAccount | null {
  const cleanEmail = email.toLowerCase().trim();
  loadFileAccounts();

  const mem = memoryAccounts.get(cleanEmail);
  const vaultMap = verifySignedPayload<Record<string, StoredAccount>>(vaultCookieVal) || {};
  const vaultAcc = vaultMap[cleanEmail];

  if (mem && vaultAcc) {
    // Prefer whichever record is already confirmed or newer
    if (vaultAcc.confirmed && !mem.confirmed) {
      saveAccountToStore(vaultAcc);
      return vaultAcc;
    }
    return mem;
  }

  if (vaultAcc) {
    saveAccountToStore(vaultAcc);
    return vaultAcc;
  }

  return mem || null;
}

function updateVaultCookie(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  account: StoredAccount
) {
  const existingVal = cookieStore.get(VAULT_COOKIE_NAME)?.value;
  const vaultMap =
    verifySignedPayload<Record<string, StoredAccount>>(existingVal) || {};
  vaultMap[account.email.toLowerCase()] = account;

  // Keep vault cookie compact (at most 10 accounts on the same browser)
  const keys = Object.keys(vaultMap);
  if (keys.length > 10) {
    delete vaultMap[keys[0]];
  }

  const signedVault = signPayload(vaultMap);
  cookieStore.set(VAULT_COOKIE_NAME, signedVault, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: THIRTY_DAYS_SEC,
  });
}

function setAuthenticatedSessionCookies(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  user: { id: string; email: string; name: string }
) {
  const sessionPayload = {
    id: user.id,
    email: user.email.toLowerCase(),
    name: user.name,
    createdAt: Date.now(),
  };
  const encodedPayload = encodeURIComponent(JSON.stringify(sessionPayload));

  cookieStore.set(SESSION_COOKIE_NAME, encodedPayload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: THIRTY_DAYS_SEC,
  });

  cookieStore.set(CLIENT_COOKIE_NAME, encodedPayload, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: THIRTY_DAYS_SEC,
  });
}

async function sendConfirmationEmailViaResend(params: {
  toEmail: string;
  userName: string;
  sixDigitCode: string;
  confirmUrl: string;
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    return { ok: false, error: 'Missing RESEND_API_KEY in server environment.' };
  }

  const { toEmail, userName, sixDigitCode, confirmUrl } = params;

  const htmlBody = `
    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff; color: #0f172a;">
      <div style="margin-bottom: 16px;">
        <span style="display: inline-block; background: #eff6ff; color: #2563eb; font-weight: 700; font-size: 12px; padding: 4px 10px; border-radius: 9999px; letter-spacing: 0.5px; text-transform: uppercase;">
          UniNest Account Confirmation
        </span>
      </div>
      <h2 style="margin: 0 0 12px 0; font-size: 24px; color: #0f172a;">Welcome to UniNest, ${userName}!</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
        Please confirm your email address to complete your sign up. Enter the 6-digit verification code below on the confirmation screen:
      </p>
      <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 24px 0;">
        <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; margin-bottom: 6px; letter-spacing: 1px;">
          Verification Code
        </div>
        <h1 style="letter-spacing: 8px; font-size: 34px; color: #0078D4; margin: 0; font-family: monospace;">${sixDigitCode}</h1>
      </div>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0; text-align: center;">
        Or click the button below to confirm your account automatically:
      </p>
      <div style="text-align: center; margin: 0 0 24px 0;">
        <a href="${confirmUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; font-weight: 600; font-size: 15px; padding: 12px 28px; border-radius: 9999px; text-decoration: none;">
          Confirm Email Address
        </a>
      </div>
      <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px;">
        This code expires in 15 minutes. Sent securely by UniNest (uni-nest.app).
      </p>
    </div>
  `;

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'UniNest <noreply@uni-nest.app>',
        to: [toEmail],
        subject: `${sixDigitCode} — Confirm your UniNest account`,
        html: htmlBody,
      }),
    });

    const resendData = await resendRes.json().catch(() => ({}));
    if (!resendRes.ok) {
      return {
        ok: false,
        error: resendData?.message || 'Failed to send confirmation email via Resend.',
      };
    }

    return { ok: true, id: resendData?.id };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error contacting Resend.' };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action || 'send';
    const cleanEmail = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    const fullName = String(body?.fullName || '').trim();
    const origin =
      String(body?.origin || '').trim() ||
      req.nextUrl.origin ||
      'http://localhost:3000';
    const nextPath = String(body?.next || '/search').trim();

    const cookieStore = await cookies();
    const vaultCookieVal = cookieStore.get(VAULT_COOKIE_NAME)?.value;

    // =========================================================================
    // 1. VERIFY BY SIGNED URL TOKEN (Clicked confirmation link in email)
    // =========================================================================
    if (action === 'verify_link') {
      const verifyToken = String(body?.verifyToken || '').trim();
      const decoded = verifySignedPayload<{
        id: string;
        email: string;
        name: string;
        passwordHash: string;
        exp: number;
      }>(verifyToken);

      if (!decoded || !decoded.email || Date.now() > decoded.exp) {
        return NextResponse.json(
          { error: 'Confirmation link is invalid or has expired. Please request a new confirmation email.' },
          { status: 400 }
        );
      }

      const existing = getAccountFromEverywhere(decoded.email, vaultCookieVal);
      const confirmedAccount: StoredAccount = {
        id: existing?.id || decoded.id || `usr_${crypto.randomUUID().slice(0, 12)}`,
        email: decoded.email.toLowerCase(),
        name: existing?.name || decoded.name || decoded.email.split('@')[0],
        passwordHash: existing?.passwordHash || decoded.passwordHash,
        confirmed: true,
        createdAt: existing?.createdAt || Date.now(),
      };

      saveAccountToStore(confirmedAccount);
      updateVaultCookie(cookieStore, confirmedAccount);
      cookieStore.delete(OTP_COOKIE_NAME);

      setAuthenticatedSessionCookies(cookieStore, {
        id: confirmedAccount.id,
        email: confirmedAccount.email,
        name: confirmedAccount.name,
      });

      return NextResponse.json({
        success: true,
        user: {
          id: confirmedAccount.id,
          email: confirmedAccount.email,
          name: confirmedAccount.name,
          user_metadata: {
            full_name: confirmedAccount.name,
            display_name: confirmedAccount.name,
          },
        },
      });
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    // =========================================================================
    // 2. SIGN UP WITH EMAIL & PASSWORD (Requires Email Confirmation)
    // =========================================================================
    if (action === 'signup') {
      if (!password || password.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters long.' },
          { status: 400 }
        );
      }

      const existingAccount = getAccountFromEverywhere(cleanEmail, vaultCookieVal);
      if (existingAccount && existingAccount.confirmed) {
        return NextResponse.json(
          {
            error: 'An account with this email is already confirmed. Please sign in with your email and password.',
            isExistingUser: true,
          },
          { status: 409 }
        );
      }

      const userName =
        fullName ||
        existingAccount?.name ||
        cleanEmail.split('@')[0].replace(/[._-]/g, ' ');
      const pwdHash = hashPassword(cleanEmail, password);
      const sixDigitCode = String(crypto.randomInt(100000, 1000000));
      const codeExpiresAt = Date.now() + FIFTEEN_MINUTES_MS;
      const userId =
        existingAccount?.id || `usr_${crypto.randomUUID().slice(0, 12)}`;

      // Attempt non-blocking Supabase signUp with a 2.5s timeout so broken Cloud SMTP never stalls
      try {
        const supabase = await createClient();
        await Promise.race([
          supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: { full_name: userName, display_name: userName },
              emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
            },
          }),
          new Promise((resolve) => setTimeout(resolve, 2500)),
        ]);
      } catch {
        // Handled by Resend confirmation delivery below
      }

      // Create signed confirmation link token
      const verifyToken = signPayload({
        id: userId,
        email: cleanEmail,
        name: userName,
        passwordHash: pwdHash,
        exp: Date.now() + TWENTY_FOUR_HOURS_MS,
      });
      const confirmUrl = `${origin}/auth/callback?verify_token=${encodeURIComponent(
        verifyToken
      )}&next=${encodeURIComponent(nextPath)}`;

      const emailResult = await sendConfirmationEmailViaResend({
        toEmail: cleanEmail,
        userName,
        sixDigitCode,
        confirmUrl,
      });

      if (!emailResult.ok) {
        return NextResponse.json(
          { error: emailResult.error || 'Could not send confirmation email.' },
          { status: 500 }
        );
      }

      const pendingAccount: StoredAccount = {
        id: userId,
        email: cleanEmail,
        name: userName,
        passwordHash: pwdHash,
        confirmed: false,
        code: sixDigitCode,
        codeExpiresAt,
        createdAt: existingAccount?.createdAt || Date.now(),
      };

      saveAccountToStore(pendingAccount);
      updateVaultCookie(cookieStore, pendingAccount);

      // Also store signed challenge cookie for verification
      const challengeToken = signPayload({
        id: userId,
        email: cleanEmail,
        name: userName,
        passwordHash: pwdHash,
        code: sixDigitCode,
        exp: codeExpiresAt,
      });
      cookieStore.set(OTP_COOKIE_NAME, challengeToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 900,
      });

      return NextResponse.json({
        success: true,
        needsConfirmation: true,
        hasSession: false,
        email: cleanEmail,
        message: `We've sent a confirmation email to ${cleanEmail}. Enter the 6-digit verification code from your email (or click the confirmation link) to activate your account.`,
      });
    }

    // =========================================================================
    // 3. SIGN IN WITH EMAIL & PASSWORD (Enforces Email Confirmation)
    // =========================================================================
    if (action === 'signin') {
      if (!password) {
        return NextResponse.json(
          { error: 'Please enter your password.' },
          { status: 400 }
        );
      }

      const storedAccount = getAccountFromEverywhere(cleanEmail, vaultCookieVal);
      const inputHash = hashPassword(cleanEmail, password);

      if (storedAccount) {
        if (storedAccount.passwordHash !== inputHash) {
          return NextResponse.json(
            { error: 'Invalid email or password. Please check your credentials and try again.' },
            { status: 401 }
          );
        }

        if (!storedAccount.confirmed) {
          // Account exists and password is valid, but email is NOT confirmed yet!
          // Send a fresh confirmation code & link so they can confirm right away.
          const sixDigitCode = String(crypto.randomInt(100000, 1000000));
          const codeExpiresAt = Date.now() + FIFTEEN_MINUTES_MS;
          storedAccount.code = sixDigitCode;
          storedAccount.codeExpiresAt = codeExpiresAt;

          saveAccountToStore(storedAccount);
          updateVaultCookie(cookieStore, storedAccount);

          const verifyToken = signPayload({
            id: storedAccount.id,
            email: cleanEmail,
            name: storedAccount.name,
            passwordHash: storedAccount.passwordHash,
            exp: Date.now() + TWENTY_FOUR_HOURS_MS,
          });
          const confirmUrl = `${origin}/auth/callback?verify_token=${encodeURIComponent(
            verifyToken
          )}&next=${encodeURIComponent(nextPath)}`;

          await sendConfirmationEmailViaResend({
            toEmail: cleanEmail,
            userName: storedAccount.name,
            sixDigitCode,
            confirmUrl,
          });

          const challengeToken = signPayload({
            id: storedAccount.id,
            email: cleanEmail,
            name: storedAccount.name,
            passwordHash: storedAccount.passwordHash,
            code: sixDigitCode,
            exp: codeExpiresAt,
          });
          cookieStore.set(OTP_COOKIE_NAME, challengeToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 900,
          });

          return NextResponse.json(
            {
              error: `Your email (${cleanEmail}) has not been confirmed yet. We have sent a new 6-digit confirmation code to your email — please enter it below to complete sign-up.`,
              isEmailUnconfirmed: true,
              needsConfirmation: true,
              email: cleanEmail,
            },
            { status: 403 }
          );
        }

        // Confirmed & password matches! Establish session.
        setAuthenticatedSessionCookies(cookieStore, {
          id: storedAccount.id,
          email: storedAccount.email,
          name: storedAccount.name,
        });

        return NextResponse.json({
          success: true,
          user: {
            id: storedAccount.id,
            email: storedAccount.email,
            name: storedAccount.name,
            user_metadata: {
              full_name: storedAccount.name,
              display_name: storedAccount.name,
            },
          },
        });
      }

      // If not in local store, check Supabase Auth signInWithPassword
      try {
        const supabase = await createClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes('not confirmed') || msg.includes('unconfirmed')) {
            // Send confirmation email via Resend so they can confirm
            const sixDigitCode = String(crypto.randomInt(100000, 1000000));
            const codeExpiresAt = Date.now() + FIFTEEN_MINUTES_MS;
            const userName = cleanEmail.split('@')[0];
            const userId = `usr_${crypto.randomUUID().slice(0, 12)}`;

            const pendingAcc: StoredAccount = {
              id: userId,
              email: cleanEmail,
              name: userName,
              passwordHash: inputHash,
              confirmed: false,
              code: sixDigitCode,
              codeExpiresAt,
              createdAt: Date.now(),
            };
            saveAccountToStore(pendingAcc);
            updateVaultCookie(cookieStore, pendingAcc);

            const verifyToken = signPayload({
              id: userId,
              email: cleanEmail,
              name: userName,
              passwordHash: inputHash,
              exp: Date.now() + TWENTY_FOUR_HOURS_MS,
            });
            const confirmUrl = `${origin}/auth/callback?verify_token=${encodeURIComponent(
              verifyToken
            )}&next=${encodeURIComponent(nextPath)}`;

            await sendConfirmationEmailViaResend({
              toEmail: cleanEmail,
              userName,
              sixDigitCode,
              confirmUrl,
            });

            const challengeToken = signPayload({
              id: userId,
              email: cleanEmail,
              name: userName,
              passwordHash: inputHash,
              code: sixDigitCode,
              exp: codeExpiresAt,
            });
            cookieStore.set(OTP_COOKIE_NAME, challengeToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/',
              maxAge: 900,
            });

            return NextResponse.json(
              {
                error: `Your email (${cleanEmail}) has not been confirmed yet. Please enter the 6-digit confirmation code sent to your inbox.`,
                isEmailUnconfirmed: true,
                needsConfirmation: true,
                email: cleanEmail,
              },
              { status: 403 }
            );
          }

          return NextResponse.json(
            { error: 'Invalid email or password. Please check your credentials or create an account.' },
            { status: 401 }
          );
        }

        if (data?.user) {
          const userName =
            data.user.user_metadata?.full_name ||
            data.user.user_metadata?.display_name ||
            cleanEmail.split('@')[0];

          const syncedAcc: StoredAccount = {
            id: data.user.id,
            email: cleanEmail,
            name: userName,
            passwordHash: inputHash,
            confirmed: true,
            createdAt: Date.now(),
          };
          saveAccountToStore(syncedAcc);
          updateVaultCookie(cookieStore, syncedAcc);

          setAuthenticatedSessionCookies(cookieStore, {
            id: data.user.id,
            email: cleanEmail,
            name: userName,
          });

          return NextResponse.json({
            success: true,
            user: {
              id: data.user.id,
              email: cleanEmail,
              name: userName,
              user_metadata: {
                full_name: userName,
                display_name: userName,
              },
            },
          });
        }
      } catch {
        // Fall through
      }

      return NextResponse.json(
        { error: 'Invalid email or password. Please check your credentials or create an account.' },
        { status: 401 }
      );
    }

    // =========================================================================
    // 4. RESEND CONFIRMATION EMAIL (or SEND OTP)
    // =========================================================================
    if (action === 'resend' || action === 'send') {
      const existingAccount = getAccountFromEverywhere(cleanEmail, vaultCookieVal);
      const sixDigitCode = String(crypto.randomInt(100000, 1000000));
      const codeExpiresAt = Date.now() + FIFTEEN_MINUTES_MS;
      const userId = existingAccount?.id || `usr_${crypto.randomUUID().slice(0, 12)}`;
      const userName = existingAccount?.name || cleanEmail.split('@')[0];
      const pwdHash = existingAccount?.passwordHash || '';

      const updatedAccount: StoredAccount = {
        id: userId,
        email: cleanEmail,
        name: userName,
        passwordHash: pwdHash,
        confirmed: existingAccount?.confirmed || false,
        code: sixDigitCode,
        codeExpiresAt,
        createdAt: existingAccount?.createdAt || Date.now(),
      };

      saveAccountToStore(updatedAccount);
      updateVaultCookie(cookieStore, updatedAccount);

      const verifyToken = signPayload({
        id: userId,
        email: cleanEmail,
        name: userName,
        passwordHash: pwdHash,
        exp: Date.now() + TWENTY_FOUR_HOURS_MS,
      });
      const confirmUrl = `${origin}/auth/callback?verify_token=${encodeURIComponent(
        verifyToken
      )}&next=${encodeURIComponent(nextPath)}`;

      const emailResult = await sendConfirmationEmailViaResend({
        toEmail: cleanEmail,
        userName,
        sixDigitCode,
        confirmUrl,
      });

      if (!emailResult.ok) {
        return NextResponse.json(
          { error: emailResult.error || 'Failed to resend confirmation email.' },
          { status: 500 }
        );
      }

      const challengeToken = signPayload({
        id: userId,
        email: cleanEmail,
        name: userName,
        passwordHash: pwdHash,
        code: sixDigitCode,
        exp: codeExpiresAt,
      });
      cookieStore.set(OTP_COOKIE_NAME, challengeToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 900,
      });

      return NextResponse.json({
        success: true,
        message: `Confirmation email sent to ${cleanEmail}. Check your inbox for the 6-digit code or confirmation link.`,
      });
    }

    // =========================================================================
    // 5. VERIFY 6-DIGIT CONFIRMATION CODE
    // =========================================================================
    if (action === 'verify') {
      const token = String(body?.token || '').trim();
      if (!token || token.length < 6) {
        return NextResponse.json(
          { error: 'Please enter the 6-digit confirmation code from your email.' },
          { status: 400 }
        );
      }

      const challengeCookie = cookieStore.get(OTP_COOKIE_NAME)?.value;
      const challenge = verifySignedPayload<{
        id: string;
        email: string;
        name: string;
        passwordHash: string;
        code: string;
        exp: number;
      }>(challengeCookie);

      const storedAccount = getAccountFromEverywhere(cleanEmail, vaultCookieVal);

      const matchesChallenge =
        challenge &&
        challenge.email === cleanEmail &&
        challenge.code === token &&
        Date.now() <= challenge.exp;

      const matchesStored =
        storedAccount &&
        storedAccount.code === token &&
        storedAccount.codeExpiresAt &&
        Date.now() <= storedAccount.codeExpiresAt;

      if (!matchesChallenge && !matchesStored) {
        // Also try Supabase verifyOtp in case the code came from Supabase directly
        try {
          const supabase = await createClient();
          const { data: sbData, error: sbErr } = await supabase.auth.verifyOtp({
            email: cleanEmail,
            token,
            type: 'signup',
          });
          if (sbErr || !sbData?.user) {
            return NextResponse.json(
              { error: 'Invalid or expired confirmation code. Please check your email or click Resend.' },
              { status: 400 }
            );
          }
        } catch {
          return NextResponse.json(
            { error: 'Invalid or expired confirmation code. Please check your email or click Resend.' },
            { status: 400 }
          );
        }
      }

      const confirmedAccount: StoredAccount = {
        id:
          storedAccount?.id ||
          challenge?.id ||
          `usr_${crypto.randomUUID().slice(0, 12)}`,
        email: cleanEmail,
        name:
          storedAccount?.name ||
          challenge?.name ||
          cleanEmail.split('@')[0],
        passwordHash:
          storedAccount?.passwordHash || challenge?.passwordHash || '',
        confirmed: true,
        createdAt: storedAccount?.createdAt || Date.now(),
      };

      saveAccountToStore(confirmedAccount);
      updateVaultCookie(cookieStore, confirmedAccount);
      cookieStore.delete(OTP_COOKIE_NAME);

      setAuthenticatedSessionCookies(cookieStore, {
        id: confirmedAccount.id,
        email: confirmedAccount.email,
        name: confirmedAccount.name,
      });

      return NextResponse.json({
        success: true,
        user: {
          id: confirmedAccount.id,
          email: confirmedAccount.email,
          name: confirmedAccount.name,
          user_metadata: {
            full_name: confirmedAccount.name,
            display_name: confirmedAccount.name,
          },
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (err: any) {
    console.error('Auth API error:', err);
    return NextResponse.json(
      { error: err?.message || 'Unexpected error during authentication.' },
      { status: 500 }
    );
  }
}
