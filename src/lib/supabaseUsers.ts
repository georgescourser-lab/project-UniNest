import crypto from 'crypto';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const VERIFIED_AGENT_EMAILS = [
  'georgescourser@gmail.com',
  'oderocarilus@gmail.com',
];

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Generates a deterministic RFC-4122 v4-formatted UUID from an email address
 * so fallback/OAuth users always have a valid Postgres UUID.
 */
export function deterministicUuidFromEmail(rawEmail: string): string {
  const clean = rawEmail.trim().toLowerCase();
  const hash = crypto.createHash('sha256').update(`uninest-user:${clean}`).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function normalizeUserUuid(id: string | undefined, email: string): string {
  if (id && UUID_REGEX.test(id.trim())) {
    return id.trim().toLowerCase();
  }
  return deterministicUuidFromEmail(email);
}

function deriveSupabasePassword(email: string): string {
  const digest = crypto
    .createHmac('sha256', 'uninest-supabase-auth-sync-v1')
    .update(email.trim().toLowerCase())
    .digest('hex')
    .slice(0, 20);
  return `UniNest#${digest}!9`;
}

declare global {
  // eslint-disable-next-line no-var
  var __uninestSyncedUserEmails: Set<string> | undefined;
  // eslint-disable-next-line no-var
  var __uninestUserPgPool: any;
  // eslint-disable-next-line no-var
  var __uninestUserPgFailedAt: number | undefined;
}

function getPgPool(): any {
  if (!process.env.DATABASE_URL) return null;
  if (
    globalThis.__uninestUserPgFailedAt &&
    Date.now() - globalThis.__uninestUserPgFailedAt < 60000
  ) {
    return null;
  }
  if (!globalThis.__uninestUserPgPool) {
    try {
      const dynamicRequire = eval('require');
      const pgMod = dynamicRequire('pg');
      const PoolClass = pgMod?.Pool || pgMod?.default?.Pool;
      if (!PoolClass) return null;
      globalThis.__uninestUserPgPool = new PoolClass({
        connectionString: process.env.DATABASE_URL,
        max: 2,
        idleTimeoutMillis: 15000,
        connectionTimeoutMillis: 2500,
      });
    } catch {
      globalThis.__uninestUserPgFailedAt = Date.now();
      return null;
    }
  }
  return globalThis.__uninestUserPgPool;
}

/**
 * Ensures any user who signs up or signs in on UniNest is registered in Supabase:
 * 1. `auth.users` (Supabase Dashboard -> Authentication -> Users)
 * 2. `public.users` (Supabase Dashboard -> Table Editor -> users)
 */
export async function ensureUserInSupabase(user: {
  id?: string;
  email: string;
  name?: string;
}): Promise<{ id: string; email: string; name: string; synced: boolean }> {
  const cleanEmail = (user.email || '').trim().toLowerCase();
  const displayName =
    (user.name || '').trim() ||
    (cleanEmail === 'georgescourser@gmail.com'
      ? 'George Scourser'
      : cleanEmail === 'oderocarilus@gmail.com'
      ? 'Odero Carilus'
      : cleanEmail.split('@')[0] || 'Student');
  const resolvedId = normalizeUserUuid(user.id, cleanEmail);

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { id: resolvedId, email: cleanEmail, name: displayName, synced: false };
  }

  const role = VERIFIED_AGENT_EMAILS.includes(cleanEmail) ? 'agent' : 'student';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  let synced = false;

  // 1. If SUPABASE_SERVICE_ROLE_KEY is configured, create/update directly via Auth Admin API
  if (supabaseUrl && serviceRoleKey) {
    try {
      const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
        email: cleanEmail,
        password: deriveSupabasePassword(cleanEmail),
        email_confirm: true,
        user_metadata: {
          full_name: displayName,
          display_name: displayName,
          role,
        },
      });
      if (!createErr && created?.user) {
        synced = true;
      } else if (createErr && /already|exists|registered/i.test(createErr.message)) {
        synced = true;
      }
    } catch {}
  }

  // 2. Call Supabase RPC `register_uninest_user` and upsert `public.users` + `auth.signUp` via publishable key
  if (supabaseUrl && publishableKey) {
    const statelessClient = createSupabaseClient(supabaseUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    // 2a. Try SECURITY DEFINER RPC function `public.register_uninest_user` (installed via supabase/users-sync.sql)
    try {
      const { error: rpcErr } = await statelessClient.rpc('register_uninest_user', {
        p_email: cleanEmail,
        p_full_name: displayName,
      });
      if (!rpcErr) {
        synced = true;
      }
    } catch {}

    // 2b. Try upserting into `public.users` table via Data API
    try {
      const { error: tableErr } = await statelessClient.from('users').upsert(
        {
          id: resolvedId,
          email: cleanEmail,
          full_name: displayName,
          role,
          last_sign_in_at: new Date().toISOString(),
        },
        { onConflict: 'email' }
      );
      if (!tableErr) {
        synced = true;
      }
    } catch {}

    // 2c. Register in Supabase Auth (`auth.users`) via `supabase.auth.signUp` (once per server lifecycle per email)
    if (!globalThis.__uninestSyncedUserEmails) {
      globalThis.__uninestSyncedUserEmails = new Set<string>();
    }
    if (!synced && !globalThis.__uninestSyncedUserEmails.has(cleanEmail)) {
      try {
        const signUpRes: any = await Promise.race([
          statelessClient.auth.signUp({
            email: cleanEmail,
            password: deriveSupabasePassword(cleanEmail),
            options: {
              data: {
                full_name: displayName,
                display_name: displayName,
                role,
              },
            },
          }),
          new Promise((resolve) => setTimeout(() => resolve({ timedOut: true }), 2500)),
        ]);
        if (signUpRes && !signUpRes.timedOut) {
          if (!signUpRes.error && signUpRes.data?.user) {
            synced = true;
            globalThis.__uninestSyncedUserEmails.add(cleanEmail);
          } else if (
            signUpRes.error &&
            /already registered|already exists/i.test(signUpRes.error.message || '')
          ) {
            synced = true;
            globalThis.__uninestSyncedUserEmails.add(cleanEmail);
          }
        }
      } catch {}
    }
  }

  // 3. Direct Postgres connection fallback (when DATABASE_URL is connected)
  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.users (
          id uuid PRIMARY KEY,
          email text UNIQUE NOT NULL,
          full_name text,
          role text NOT NULL DEFAULT 'student',
          created_at timestamptz NOT NULL DEFAULT now(),
          last_sign_in_at timestamptz NOT NULL DEFAULT now()
        );
      `);
      await pool.query(
        `INSERT INTO public.users (id, email, full_name, role, created_at, last_sign_in_at)
         VALUES ($1::uuid, $2, $3, $4, now(), now())
         ON CONFLICT (email) DO UPDATE SET
           full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
           role = EXCLUDED.role,
           last_sign_in_at = now()`,
        [resolvedId, cleanEmail, displayName, role]
      );
      await pool
        .query(
          `INSERT INTO auth.users (
             instance_id, id, aud, role, email, encrypted_password,
             email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
             created_at, updated_at, is_sso_user, is_anonymous
           )
           SELECT
             '00000000-0000-0000-0000-000000000000'::uuid,
             $1::uuid,
             'authenticated',
             'authenticated',
             $2,
             '',
             now(),
             '{"provider":"google","providers":["google","email"]}'::jsonb,
             jsonb_build_object('full_name', $3::text, 'display_name', $3::text, 'email', $2::text, 'email_verified', true),
             now(),
             now(),
             false,
             false
           WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = $2)`,
          [resolvedId, cleanEmail, displayName]
        )
        .catch(() => {});
      synced = true;
    } catch {
      globalThis.__uninestUserPgFailedAt = Date.now();
    }
  }

  return { id: resolvedId, email: cleanEmail, name: displayName, synced };
}
