import { NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      error: 'Email and password authentication is disabled. Please sign in with Google.',
    },
    { status: 403 }
  );
}
