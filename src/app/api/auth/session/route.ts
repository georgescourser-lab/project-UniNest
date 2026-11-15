import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'uninest_user_session';
const CLIENT_COOKIE_NAME = 'uninest_user_client';
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const user = body?.user;
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Invalid user payload' }, { status: 400 });
    }

    const payload = {
      id: user.id || `usr_${Date.now()}`,
      email: String(user.email).trim().toLowerCase(),
      name:
        user.name ||
        user.user_metadata?.full_name ||
        String(user.email).split('@')[0],
      createdAt: Date.now(),
    };

    const encodedPayload = encodeURIComponent(JSON.stringify(payload));
    const cookieStore = await cookies();

    cookieStore.set(SESSION_COOKIE_NAME, encodedPayload, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: THIRTY_DAYS,
    });

    cookieStore.set(CLIENT_COOKIE_NAME, encodedPayload, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: THIRTY_DAYS,
    });

    return NextResponse.json({ success: true, user: payload });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to sync session' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    cookieStore.delete(CLIENT_COOKIE_NAME);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to clear session' },
      { status: 500 }
    );
  }
}

