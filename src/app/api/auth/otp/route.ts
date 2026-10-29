import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { cookies } from 'next/headers';

const OTP_COOKIE_NAME = 'uninest_otp_challenge';
const SESSION_COOKIE_NAME = 'uninest_user_session';
const CLIENT_COOKIE_NAME = 'uninest_user_client';
const TEN_MINUTES_MS = 10 * 60 * 1000;
const THIRTY_DAYS_SEC = 60 * 60 * 24 * 30;

// In-memory store for same-instance verification alongside signed httpOnly cookie
const otpMemoryStore = new Map<string, { code: string; expiresAt: number }>();

function getResendApiKey(): string {
  return (
    process.env.RESEND_API_KEY ||
    process.env.SUPABASE_AUTH_SMTP_PASS ||
    process.env['resend-api'] ||
    ''
  ).trim();
}

function signChallenge(email: string, code: string, expiresAt: number): string {
  const secret = getResendApiKey();
  const data = `${email.toLowerCase()}:${code}:${expiresAt}`;
  const hmac = crypto.createHmac('sha256', secret).update(data).digest('hex');
  return `${expiresAt}.${hmac}`;
}

function verifyChallengeCookie(email: string, code: string, cookieVal?: string): boolean {
  if (!cookieVal) return false;
  const parts = cookieVal.split('.');
  if (parts.length !== 2) return false;
  const [expiresAtStr, signature] = parts;
  const expiresAt = Number(expiresAtStr);
  if (!expiresAt || Date.now() > expiresAt) return false;

  const expected = signChallenge(email.toLowerCase(), code.trim(), expiresAt).split('.')[1];
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action || 'send';
    const cleanEmail = String(body?.email || '').trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    if (action === 'send') {
      const sixDigitCode = String(crypto.randomInt(100000, 1000000));
      const expiresAt = Date.now() + TEN_MINUTES_MS;

      otpMemoryStore.set(cleanEmail, { code: sixDigitCode, expiresAt });

      const resendKey = getResendApiKey();
      const htmlBody = `<h2>Welcome to UniNest!</h2>
<p>Use the 6-digit verification code below to complete your sign up:</p>
<h1 style="letter-spacing: 6px; font-size: 32px; color: #0078D4;">${sixDigitCode}</h1>
<p>This code expires in 10 minutes.</p>`;

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'UniNest <noreply@uni-nest.app>',
          to: [cleanEmail],
          subject: 'Welcome to UniNest! Your 6-digit verification code',
          html: htmlBody,
        }),
      });

      const resendData = await resendRes.json().catch(() => ({}));

      if (!resendRes.ok) {
        return NextResponse.json(
          { error: resendData?.message || 'Failed to send OTP email via Resend.' },
          { status: resendRes.status }
        );
      }

      const signedValue = signChallenge(cleanEmail, sixDigitCode, expiresAt);
      const cookieStore = await cookies();
      cookieStore.set(OTP_COOKIE_NAME, signedValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 600,
      });

      return NextResponse.json({
        success: true,
        id: resendData?.id,
        message: `6-digit verification code sent to ${cleanEmail} from noreply@uni-nest.app.`,
      });
    }

    if (action === 'verify') {
      const cleanToken = String(body?.token || '').trim();
      if (!cleanToken || cleanToken.length !== 6) {
        return NextResponse.json({ error: 'Please enter a valid 6-digit verification code.' }, { status: 400 });
      }

      const cookieStore = await cookies();
      const challengeCookie = cookieStore.get(OTP_COOKIE_NAME)?.value;
      const memEntry = otpMemoryStore.get(cleanEmail);

      const isMemValid =
        memEntry && memEntry.code === cleanToken && Date.now() <= memEntry.expiresAt;
      const isCookieValid = verifyChallengeCookie(cleanEmail, cleanToken, challengeCookie);

      if (!isMemValid && !isCookieValid) {
        return NextResponse.json(
          { error: 'Invalid or expired 6-digit verification code. Please request a new code.' },
          { status: 400 }
        );
      }

      otpMemoryStore.delete(cleanEmail);
      cookieStore.delete(OTP_COOKIE_NAME);

      const userId = 'user_' + crypto.createHash('sha256').update(cleanEmail).digest('hex').slice(0, 16);
      const userName = cleanEmail.split('@')[0];
      const userPayload = {
        id: userId,
        email: cleanEmail,
        name: userName,
        createdAt: Date.now(),
      };
      const encodedPayload = encodeURIComponent(JSON.stringify(userPayload));

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

      return NextResponse.json({
        success: true,
        user: {
          id: userId,
          email: cleanEmail,
          user_metadata: {
            full_name: userName,
            display_name: userName,
          },
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Unexpected server error during OTP processing.' },
      { status: 500 }
    );
  }
}

