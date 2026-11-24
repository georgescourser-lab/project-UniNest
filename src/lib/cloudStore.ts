import fs from 'fs';
import path from 'path';
import os from 'os';

export const RESET_EPOCH_ID = 1795469500000;
const SYSTEM_STATE_ROW_ID = 1;
const SYSTEM_STATE_REF = '__UNINEST_CLOUD_STATE__';

export interface CloudProperty {
  id: number;
  title: string;
  type: string;
  rent: string;
  location: string;
  distance: string;
  image: string | null;
  images: string[];
  videos: string[];
  amenities: string[];
  agent_id?: number | null;
  description?: string;
  agents?: any;
  created_at?: string;
  is_sold?: boolean;
}

export interface CloudMarketplaceItem {
  id: number;
  listingRef: string;
  title: string;
  category: string;
  price: string;
  originalPrice?: string | null;
  condition: string;
  campus: string;
  campusName?: string;
  location: string;
  image: string;
  description: string;
  verificationMethod?: string;
  ownerLegalName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  ownerPrivateAddress?: string;
  assignedAgentId?: number;
  assignedAgentName?: string;
  submittedAt: string;
  status: 'Pending Agent Verification' | 'Live' | 'Sold' | 'Rejected';
  verifiedListing?: boolean;
  postedAt?: string;
}

export interface CloudInquiry {
  refCode: string;
  createdAt: string;
  itemId?: number;
  itemTitle: string;
  itemPrice: string;
  campus: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  preferredDate: string;
  preferredTime: string;
  preferredHub: string;
  notes?: string;
  status: string;
  agentName: string;
  agentNotes?: string;
  dealUpdate?: string;
}

export interface CloudDatabase {
  properties: CloudProperty[];
  soldProperties?: CloudProperty[];
  marketplace: CloudMarketplaceItem[];
  inquiries: CloudInquiry[];
  deletedPropertyIds?: number[];
  deletedMarketplaceRefs?: string[];
  resetEpoch?: number;
  updatedAt?: string;
}

const STORE_BROADCAST_ID = '52b03fe2-60c7-497b-a552-7854c8bb11c1';
const STORE_BROADCAST_NAME = 'uninest_live_cloud_store_v1';
const AUDIENCE_ID = '55c809d4-043e-4917-bc4d-479d5e2f9dd0';

declare global {
  // eslint-disable-next-line no-var
  var __uninestLiveCloudDb: CloudDatabase | undefined;
  // eslint-disable-next-line no-var
  var __uninestLiveCloudDbTimestamp: number | undefined;
  // eslint-disable-next-line no-var
  var __uninestStoreBroadcastId: string | undefined;
  // eslint-disable-next-line no-var
  var __uninestInFlightCloudFetch: Promise<CloudDatabase | null> | undefined;
  // eslint-disable-next-line no-var
  var __uninestPgPool: any;
  // eslint-disable-next-line no-var
  var __uninestPgPoolFailedAt: number | undefined;
  // eslint-disable-next-line no-var
  var __uninestPgEpochCleaned: boolean | undefined;
}

/**
 * Dynamically loads `pg.Pool` at runtime without static import so Next.js 16
 * Turbopack on Windows/OneDrive never creates a broken NTFS junction point,
 * while Vercel serverless functions use `process.env.DATABASE_URL` natively.
 */
function getPgPool(): any {
  if (!process.env.DATABASE_URL) return null;
  if (
    globalThis.__uninestPgPoolFailedAt &&
    Date.now() - globalThis.__uninestPgPoolFailedAt < 60000
  ) {
    return null;
  }
  if (!globalThis.__uninestPgPool) {
    try {
      const dynamicRequire = eval('require');
      const pgMod = dynamicRequire('pg');
      const PoolClass = pgMod?.Pool || pgMod?.default?.Pool;
      if (!PoolClass) return null;
      globalThis.__uninestPgPool = new PoolClass({
        connectionString: process.env.DATABASE_URL,
        max: 3,
        idleTimeoutMillis: 15000,
        connectionTimeoutMillis: 2000,
      });
    } catch {
      globalThis.__uninestPgPoolFailedAt = Date.now();
      return null;
    }
  }
  return globalThis.__uninestPgPool;
}

function getResendKey(): string {
  const fromEnv = (
    process.env.RESEND_API_KEY ||
    process.env.SUPABASE_AUTH_SMTP_PASS ||
    process.env['resend-api'] ||
    ''
  )
    .trim()
    .replace(/^["']|["']$/g, '');

  if (fromEnv && fromEnv.startsWith('re_')) {
    return fromEnv;
  }

  const envFiles = ['.env.local', '.env'];
  for (const fileName of envFiles) {
    try {
      const envPath = path.join(process.cwd(), fileName);
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const match = content.match(
          /^\s*(?:RESEND_API_KEY|SUPABASE_AUTH_SMTP_PASS)\s*=\s*["']?([^"'\r\n#]+)["']?/m
        );
        if (match && match[1]) {
          const key = match[1].trim();
          if (key.startsWith('re_')) {
            process.env.RESEND_API_KEY = key;
            return key;
          }
        }
      }
    } catch {}
  }

  return '';
}

function createEmptyDb(): CloudDatabase {
  return {
    properties: [],
    soldProperties: [],
    marketplace: [],
    inquiries: [],
    deletedPropertyIds: [],
    deletedMarketplaceRefs: [],
    resetEpoch: RESET_EPOCH_ID,
    updatedAt: new Date().toISOString(),
  };
}

function splitMarketplaceItem(item: CloudMarketplaceItem) {
  const {
    ownerLegalName,
    ownerPhone,
    ownerEmail,
    ownerPrivateAddress,
    ...publicData
  } = item;

  return {
    publicData,
    privateData: {
      ownerLegalName: ownerLegalName || '',
      ownerPhone: ownerPhone || '',
      ownerEmail: ownerEmail || '',
      ownerPrivateAddress: ownerPrivateAddress || '',
    },
  };
}

function sanitizeDb(raw: any): CloudDatabase | null {
  if (!raw || typeof raw !== 'object') return null;

  const deletedPropIds = new Set<number>(
    Array.isArray(raw.deletedPropertyIds)
      ? raw.deletedPropertyIds.map((id: any) => Number(id)).filter((n: number) => !isNaN(n))
      : []
  );
  const deletedMktRefs = new Set<string>(
    Array.isArray(raw.deletedMarketplaceRefs)
      ? raw.deletedMarketplaceRefs.map((r: any) => String(r).trim()).filter(Boolean)
      : []
  );

  const properties: CloudProperty[] = Array.isArray(raw.properties)
    ? raw.properties.filter((p: any) => {
        if (!p || typeof p.id !== 'number') return false;
        if (p.id < RESET_EPOCH_ID) return false;
        if (p.is_sold) return false;
        if (deletedPropIds.has(Number(p.id))) return false;
        return true;
      })
    : [];

  const soldProperties: CloudProperty[] = [
    ...(Array.isArray(raw.soldProperties) ? raw.soldProperties : []),
    ...(Array.isArray(raw.properties) ? raw.properties.filter((p: any) => p && p.is_sold) : []),
  ].filter((p: any) => p && typeof p.id === 'number' && p.id >= RESET_EPOCH_ID);

  const marketplace: CloudMarketplaceItem[] = Array.isArray(raw.marketplace)
    ? raw.marketplace.filter((m: any) => {
        if (!m || !m.id) return false;
        if (Number(m.id) < RESET_EPOCH_ID) return false;
        if (deletedMktRefs.has(String(m.id))) return false;
        if (m.listingRef && deletedMktRefs.has(String(m.listingRef))) return false;
        return true;
      })
    : [];

  const inquiries: CloudInquiry[] = Array.isArray(raw.inquiries)
    ? raw.inquiries.filter((i: any) => i && i.refCode)
    : [];

  return {
    properties,
    soldProperties,
    marketplace,
    inquiries,
    deletedPropertyIds: Array.from(deletedPropIds),
    deletedMarketplaceRefs: Array.from(deletedMktRefs),
    resetEpoch: RESET_EPOCH_ID,
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

function mergeDatabases(...sources: (CloudDatabase | null | undefined)[]): CloudDatabase {
  const valid = sources.map(sanitizeDb).filter(Boolean) as CloudDatabase[];
  if (valid.length === 0) return createEmptyDb();

  const deletedPropIds = new Set<number>();
  const deletedMktRefs = new Set<string>();

  for (const src of valid) {
    (src.deletedPropertyIds || []).forEach((id) => deletedPropIds.add(Number(id)));
    (src.deletedMarketplaceRefs || []).forEach((ref) => deletedMktRefs.add(String(ref)));
  }

  const sortedSources = [...valid].sort((a, b) => {
    const tA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const tB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return tB - tA;
  });

  const soldPropMap = new Map<number, CloudProperty>();
  for (const src of sortedSources) {
    for (const sp of src.soldProperties || []) {
      const id = Number(sp.id);
      if (id < RESET_EPOCH_ID) continue;
      deletedPropIds.add(id);
      if (!soldPropMap.has(id)) {
        soldPropMap.set(id, { ...sp, is_sold: true });
      }
    }
  }

  const propMap = new Map<number, CloudProperty>();
  for (const src of sortedSources) {
    for (const p of src.properties || []) {
      const id = Number(p.id);
      if (id < RESET_EPOCH_ID) continue;
      if (p.is_sold) {
        deletedPropIds.add(id);
        if (!soldPropMap.has(id)) soldPropMap.set(id, { ...p, is_sold: true });
        continue;
      }
      if (deletedPropIds.has(id)) continue;
      const existing = propMap.get(id);
      if (!existing) {
        propMap.set(id, p);
      } else {
        const bestImages =
          Array.isArray(existing.images) && existing.images.length > 0
            ? existing.images
            : Array.isArray(p.images)
            ? p.images
            : [];
        propMap.set(id, {
          ...p,
          ...existing,
          is_sold: false,
          image: existing.image || p.image || bestImages[0] || null,
          images: bestImages,
        });
      }
    }
  }

  const mktMap = new Map<string, CloudMarketplaceItem>();
  const statusRank: Record<string, number> = {
    Sold: 4,
    Rejected: 3,
    Live: 2,
    'Pending Agent Verification': 1,
  };

  for (const src of sortedSources) {
    for (const m of src.marketplace || []) {
      const idNum = Number(m.id);
      const refKey = m.listingRef || String(m.id);
      if (idNum < RESET_EPOCH_ID) continue;
      if (deletedMktRefs.has(String(m.id)) || (m.listingRef && deletedMktRefs.has(m.listingRef))) {
        continue;
      }
      const existing = mktMap.get(refKey);
      if (!existing) {
        mktMap.set(refKey, m);
      } else {
        const rankExisting = statusRank[existing.status] || 0;
        const rankIncoming = statusRank[m.status] || 0;
        const winner = rankIncoming > rankExisting ? { ...existing, ...m } : { ...m, ...existing };
        // Preserve private seller fields if present on either copy
        if (!winner.ownerPhone && (existing.ownerPhone || m.ownerPhone)) {
          winner.ownerPhone = existing.ownerPhone || m.ownerPhone;
        }
        if (!winner.ownerLegalName && (existing.ownerLegalName || m.ownerLegalName)) {
          winner.ownerLegalName = existing.ownerLegalName || m.ownerLegalName;
        }
        if (!winner.ownerEmail && (existing.ownerEmail || m.ownerEmail)) {
          winner.ownerEmail = existing.ownerEmail || m.ownerEmail;
        }
        if (!winner.ownerPrivateAddress && (existing.ownerPrivateAddress || m.ownerPrivateAddress)) {
          winner.ownerPrivateAddress = existing.ownerPrivateAddress || m.ownerPrivateAddress;
        }
        mktMap.set(refKey, winner);
      }
    }
  }

  const inqMap = new Map<string, CloudInquiry>();
  for (const src of sortedSources) {
    for (const inq of src.inquiries || []) {
      if (!inq || !inq.refCode) continue;
      const key = inq.refCode.trim().toUpperCase();
      if (!inqMap.has(key)) {
        inqMap.set(key, inq);
      }
    }
  }

  return {
    properties: Array.from(propMap.values()).sort((a, b) => Number(b.id) - Number(a.id)),
    soldProperties: Array.from(soldPropMap.values()).sort((a, b) => Number(b.id) - Number(a.id)),
    marketplace: Array.from(mktMap.values()).sort((a, b) => Number(b.id) - Number(a.id)),
    inquiries: Array.from(inqMap.values()),
    deletedPropertyIds: Array.from(deletedPropIds),
    deletedMarketplaceRefs: Array.from(deletedMktRefs),
    resetEpoch: RESET_EPOCH_ID,
    updatedAt: sortedSources[0]?.updatedAt || new Date().toISOString(),
  };
}

// ============================================================================
// 1. Supabase PostgreSQL Direct Pool + Supabase HTTPS REST Reader
// ============================================================================

async function readFromPostgresOrRest(): Promise<CloudDatabase | null> {
  const pool = getPgPool();
  if (pool) {
    try {
      if (!globalThis.__uninestPgEpochCleaned) {
        globalThis.__uninestPgEpochCleaned = true;
        await pool
          .query(
            `DELETE FROM public.marketplace_items WHERE id < $1 AND id <> $2`,
            [RESET_EPOCH_ID, SYSTEM_STATE_ROW_ID]
          )
          .catch(() => {});
      }

      const result = await pool.query(
        `SELECT id, listing_ref, status, data, private_data, updated_at
           FROM public.marketplace_items
          ORDER BY updated_at DESC, created_at DESC`
      );

      let systemState: any = null;
      const items: CloudMarketplaceItem[] = [];

      for (const row of result.rows) {
        const numId = Number(row.id);
        if (numId === SYSTEM_STATE_ROW_ID || row.listing_ref === SYSTEM_STATE_REF) {
          if (row.data && Number(row.data.resetEpoch) >= RESET_EPOCH_ID) {
            systemState = row.data;
          }
          continue;
        }
        if (numId < RESET_EPOCH_ID) continue;
        items.push({
          ...row.data,
          ...row.private_data,
          id: numId,
          listingRef: row.listing_ref,
          status: row.status,
        });
      }

      return sanitizeDb({
        properties: Array.isArray(systemState?.properties) ? systemState.properties : [],
        soldProperties: Array.isArray(systemState?.soldProperties) ? systemState.soldProperties : [],
        marketplace: items,
        inquiries: Array.isArray(systemState?.inquiries) ? systemState.inquiries : [],
        deletedPropertyIds: Array.isArray(systemState?.deletedPropertyIds)
          ? systemState.deletedPropertyIds
          : [],
        deletedMarketplaceRefs: Array.isArray(systemState?.deletedMarketplaceRefs)
          ? systemState.deletedMarketplaceRefs
          : [],
        resetEpoch: RESET_EPOCH_ID,
        updatedAt: systemState?.updatedAt || new Date().toISOString(),
      });
    } catch (err) {
      globalThis.__uninestPgPoolFailedAt = Date.now();
      console.warn('Postgres pool read notice (falling back to HTTPS REST):', (err as any)?.message);
    }
  }

  // Fallback: Read granted columns from public.marketplace_items over Supabase HTTPS REST API
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const restRes = await fetch(
        `${supabaseUrl}/rest/v1/marketplace_items?select=id,listing_ref,status,data,updated_at&order=updated_at.desc`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
          cache: 'no-store',
        }
      );
      if (restRes.ok) {
        const rows = await restRes.json();
        if (Array.isArray(rows)) {
          let systemState: any = null;
          const items: CloudMarketplaceItem[] = [];
          for (const row of rows) {
            const numId = Number(row.id);
            if (numId === SYSTEM_STATE_ROW_ID || row.listing_ref === SYSTEM_STATE_REF) {
              if (row.data && Number(row.data.resetEpoch) >= RESET_EPOCH_ID) {
                systemState = row.data;
              }
              continue;
            }
            if (numId < RESET_EPOCH_ID) continue;
            items.push({
              ...row.data,
              id: numId,
              listingRef: row.listing_ref,
              status: row.status,
            });
          }
          if (systemState || items.length > 0) {
            return sanitizeDb({
              properties: Array.isArray(systemState?.properties) ? systemState.properties : [],
              soldProperties: Array.isArray(systemState?.soldProperties) ? systemState.soldProperties : [],
              marketplace: items,
              inquiries: Array.isArray(systemState?.inquiries) ? systemState.inquiries : [],
              deletedPropertyIds: Array.isArray(systemState?.deletedPropertyIds)
                ? systemState.deletedPropertyIds
                : [],
              deletedMarketplaceRefs: Array.isArray(systemState?.deletedMarketplaceRefs)
                ? systemState.deletedMarketplaceRefs
                : [],
              resetEpoch: RESET_EPOCH_ID,
              updatedAt: systemState?.updatedAt || new Date().toISOString(),
            });
          }
        }
      }
    } catch {}
  }

  return null;
}

async function writeToPostgres(db: CloudDatabase): Promise<boolean> {
  const pool = getPgPool();
  if (!pool) return false;

  try {
    // 1. Upsert the system state row (properties, inquiries, tombstones)
    const statePayload = {
      properties: db.properties || [],
      soldProperties: db.soldProperties || [],
      inquiries: db.inquiries || [],
      deletedPropertyIds: db.deletedPropertyIds || [],
      deletedMarketplaceRefs: db.deletedMarketplaceRefs || [],
      resetEpoch: RESET_EPOCH_ID,
      updatedAt: db.updatedAt || new Date().toISOString(),
    };

    await pool.query(
      `INSERT INTO public.marketplace_items (id, listing_ref, status, data, private_data, updated_at)
       VALUES ($1, $2, 'System', $3::jsonb, '{}'::jsonb, now())
       ON CONFLICT (listing_ref) DO UPDATE SET
         id = EXCLUDED.id,
         status = EXCLUDED.status,
         data = EXCLUDED.data,
         updated_at = now()`,
      [SYSTEM_STATE_ROW_ID, SYSTEM_STATE_REF, JSON.stringify(statePayload)]
    );

    // 2. Delete any tombstoned or pre-epoch marketplace items
    await pool.query(
      `DELETE FROM public.marketplace_items WHERE id < $1 AND id <> $2`,
      [RESET_EPOCH_ID, SYSTEM_STATE_ROW_ID]
    );

    if (db.deletedMarketplaceRefs && db.deletedMarketplaceRefs.length > 0) {
      await pool.query(
        `DELETE FROM public.marketplace_items
          WHERE (id::text = ANY($1::text[]) OR listing_ref = ANY($1::text[]))
            AND id <> $2`,
        [db.deletedMarketplaceRefs, SYSTEM_STATE_ROW_ID]
      );
    }

    // 3. Upsert all current marketplace items
    for (const item of db.marketplace || []) {
      if (Number(item.id) < RESET_EPOCH_ID) continue;
      const { publicData, privateData } = splitMarketplaceItem(item);
      await pool.query(
        `INSERT INTO public.marketplace_items (id, listing_ref, status, data, private_data, updated_at)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, now())
         ON CONFLICT (listing_ref) DO UPDATE SET
           id = EXCLUDED.id,
           status = EXCLUDED.status,
           data = EXCLUDED.data,
           private_data = CASE
             WHEN EXCLUDED.private_data = '{}'::jsonb OR EXCLUDED.private_data->>'ownerPhone' = ''
             THEN public.marketplace_items.private_data
             ELSE EXCLUDED.private_data
           END,
           updated_at = now()`,
        [
          item.id,
          item.listingRef,
          item.status,
          JSON.stringify(publicData),
          JSON.stringify(privateData),
        ]
      );
    }

    return true;
  } catch (err) {
    globalThis.__uninestPgPoolFailedAt = Date.now();
    console.warn('Postgres pool write notice:', (err as any)?.message);
    return false;
  }
}

// ============================================================================
// 2. Local File Backup & Resend Broadcast Cloud Fallback
// ============================================================================

function readLocalBackup(): CloudDatabase | null {
  const candidates: CloudDatabase[] = [];
  const paths = [
    path.join(os.tmpdir(), 'uninest-cloud-database.json'),
    path.join(process.cwd(), 'data', 'cloud-database.json'),
  ];

  for (const p of paths) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        const parsed = sanitizeDb(JSON.parse(raw));
        if (parsed) candidates.push(parsed);
      }
    } catch {}
  }

  if (candidates.length === 0) return null;
  return mergeDatabases(...candidates);
}

function writeLocalBackup(db: CloudDatabase) {
  const payload = JSON.stringify(db, null, 2);

  try {
    const tmpPath = path.join(os.tmpdir(), 'uninest-cloud-database.json');
    fs.writeFileSync(tmpPath, payload, 'utf8');
  } catch {}

  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(path.join(dataDir, 'cloud-database.json'), payload, 'utf8');
  } catch {}
}

async function fetchFromResendBroadcast(): Promise<CloudDatabase | null> {
  const key = getResendKey();
  if (!key) return null;

  const targetId = globalThis.__uninestStoreBroadcastId || STORE_BROADCAST_ID;
  try {
    const res = await fetch(`https://api.resend.com/broadcasts/${targetId}`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: 'no-store',
    });
    if (res.ok) {
      const doc = await res.json();
      if (doc?.text) {
        return sanitizeDb(JSON.parse(doc.text));
      }
    }
  } catch {}

  return null;
}

async function persistToResendBroadcast(db: CloudDatabase): Promise<boolean> {
  const key = getResendKey();
  if (!key) return false;

  const targetId = globalThis.__uninestStoreBroadcastId || STORE_BROADCAST_ID;
  const payload = JSON.stringify(db);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const patchRes = await fetch(`https://api.resend.com/broadcasts/${targetId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: payload }),
      });
      if (patchRes.ok) return true;
      if (patchRes.status === 429 && attempt === 0) {
        await new Promise((r) => setTimeout(r, 1100));
        continue;
      }
      if (patchRes.status !== 404) return false;
    } catch {
      return false;
    }
  }

  try {
    const createRes = await fetch('https://api.resend.com/broadcasts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audience_id: AUDIENCE_ID,
        from: 'UniNest Store <noreply@uni-nest.app>',
        subject: STORE_BROADCAST_NAME,
        name: STORE_BROADCAST_NAME,
        html: '<p>UniNest Live Cloud Store</p>',
        text: payload,
      }),
    });
    if (createRes.ok) {
      const created = await createRes.json();
      if (created?.id) {
        globalThis.__uninestStoreBroadcastId = created.id;
        return true;
      }
    }
  } catch {}

  return false;
}

async function fetchFromAllCloudBackends(): Promise<CloudDatabase | null> {
  if (globalThis.__uninestInFlightCloudFetch) {
    return globalThis.__uninestInFlightCloudFetch;
  }

  const doFetch = async (): Promise<CloudDatabase | null> => {
    const [pgOrRestDb, resendDb] = await Promise.all([
      readFromPostgresOrRest(),
      fetchFromResendBroadcast(),
    ]);
    if (!pgOrRestDb && !resendDb) return null;
    return mergeDatabases(pgOrRestDb, resendDb);
  };

  globalThis.__uninestInFlightCloudFetch = doFetch().finally(() => {
    globalThis.__uninestInFlightCloudFetch = undefined;
  });

  return globalThis.__uninestInFlightCloudFetch;
}

/**
 * Get entire live database, merging in-memory, disk backup, Supabase Postgres, and Resend Cloud Store.
 */
export async function getCloudDatabase(forceRefresh = false): Promise<CloudDatabase> {
  const now = Date.now();
  const cached = globalThis.__uninestLiveCloudDb;
  const ts = globalThis.__uninestLiveCloudDbTimestamp || 0;

  if (!forceRefresh && cached && now - ts < 5000) {
    return cached;
  }

  const localDb = readLocalBackup();
  const cloudDb = await fetchFromAllCloudBackends();

  const merged = mergeDatabases(cached, localDb, cloudDb);
  globalThis.__uninestLiveCloudDb = merged;
  globalThis.__uninestLiveCloudDbTimestamp = now;
  writeLocalBackup(merged);
  return merged;
}

/**
 * Save updated database to in-memory cache, local backup, Supabase Postgres, and Resend Cloud Store.
 */
export async function saveCloudDatabase(db: CloudDatabase): Promise<void> {
  const sanitized = sanitizeDb(db) || createEmptyDb();
  sanitized.updatedAt = new Date().toISOString();
  globalThis.__uninestLiveCloudDb = sanitized;
  globalThis.__uninestLiveCloudDbTimestamp = Date.now();
  writeLocalBackup(sanitized);

  await Promise.all([
    writeToPostgres(sanitized),
    persistToResendBroadcast(sanitized),
  ]);
}

// ============================================================================
// Helper Operations for Properties (Houses)
// ============================================================================

export async function addCloudProperty(prop: CloudProperty): Promise<CloudProperty> {
  const db = await getCloudDatabase(true);
  db.deletedPropertyIds = (db.deletedPropertyIds || []).filter((id) => Number(id) !== Number(prop.id));
  const existingIndex = db.properties.findIndex((p) => Number(p.id) === Number(prop.id));
  if (existingIndex >= 0) {
    db.properties[existingIndex] = prop;
  } else {
    db.properties.unshift(prop);
  }
  await saveCloudDatabase(db);
  return prop;
}

export async function removeCloudProperty(id: number): Promise<boolean> {
  const db = await getCloudDatabase(true);
  const numId = Number(id);
  const deletedSet = new Set<number>(db.deletedPropertyIds || []);
  deletedSet.add(numId);
  db.deletedPropertyIds = Array.from(deletedSet);

  const initialLen = db.properties.length;
  db.properties = db.properties.filter((p) => Number(p.id) !== numId);
  await saveCloudDatabase(db);
  return db.properties.length !== initialLen || true;
}

export async function markCloudPropertySold(id: number): Promise<boolean> {
  const db = await getCloudDatabase(true);
  const numId = Number(id);
  const prop = db.properties.find((p) => Number(p.id) === numId);

  // 1. Archive into soldProperties so /sold still shows the completed deal
  if (prop) {
    const soldList = Array.isArray(db.soldProperties) ? db.soldProperties : [];
    if (!soldList.some((sp) => Number(sp.id) === numId)) {
      soldList.unshift({ ...prop, is_sold: true });
    }
    db.soldProperties = soldList;
  }

  // 2. Delete the property away from active `db.properties` and add to `deletedPropertyIds`
  const deletedSet = new Set<number>(db.deletedPropertyIds || []);
  deletedSet.add(numId);
  db.deletedPropertyIds = Array.from(deletedSet);
  db.properties = db.properties.filter((p) => Number(p.id) !== numId);

  await saveCloudDatabase(db);
  return true;
}

// ============================================================================
// Helper Operations for Marketplace Items
// ============================================================================

export async function addCloudMarketplaceItem(item: CloudMarketplaceItem): Promise<CloudMarketplaceItem> {
  const db = await getCloudDatabase(true);
  db.deletedMarketplaceRefs = (db.deletedMarketplaceRefs || []).filter(
    (r) => r !== String(item.id) && r !== item.listingRef
  );
  const existingIdx = db.marketplace.findIndex(
    (m) => Number(m.id) === Number(item.id) || (m.listingRef && m.listingRef === item.listingRef)
  );
  if (existingIdx >= 0) {
    db.marketplace[existingIdx] = { ...db.marketplace[existingIdx], ...item };
  } else {
    db.marketplace.unshift(item);
  }
  await saveCloudDatabase(db);
  return item;
}

export async function updateCloudMarketplaceItem(
  listingRefOrId: string | number,
  patch: Partial<CloudMarketplaceItem>
): Promise<CloudMarketplaceItem | null> {
  const db = await getCloudDatabase(true);
  const item = db.marketplace.find(
    (m) => String(m.id) === String(listingRefOrId) || m.listingRef === String(listingRefOrId)
  );
  if (!item) return null;

  Object.assign(item, patch);
  await saveCloudDatabase(db);
  return item;
}

export async function removeCloudMarketplaceItem(listingRefOrId: string | number): Promise<boolean> {
  const db = await getCloudDatabase(true);
  const targetStr = String(listingRefOrId);
  const deletedSet = new Set<string>(db.deletedMarketplaceRefs || []);
  deletedSet.add(targetStr);

  const matched = db.marketplace.find(
    (m) => String(m.id) === targetStr || m.listingRef === targetStr
  );
  if (matched) {
    deletedSet.add(String(matched.id));
    if (matched.listingRef) deletedSet.add(matched.listingRef);
  }
  db.deletedMarketplaceRefs = Array.from(deletedSet);

  const initialLen = db.marketplace.length;
  db.marketplace = db.marketplace.filter(
    (m) => String(m.id) !== targetStr && m.listingRef !== targetStr
  );
  await saveCloudDatabase(db);
  return db.marketplace.length !== initialLen || true;
}

// ============================================================================
// Helper Operations for Inquiries
// ============================================================================

export async function addCloudInquiry(inq: CloudInquiry): Promise<CloudInquiry> {
  const db = await getCloudDatabase(true);
  db.inquiries.unshift(inq);
  await saveCloudDatabase(db);
  return inq;
}

export async function updateCloudInquiry(
  refCode: string,
  patch: Partial<CloudInquiry>
): Promise<CloudInquiry | null> {
  const db = await getCloudDatabase(true);
  const inq = db.inquiries.find((i) => i.refCode.toUpperCase() === refCode.toUpperCase());
  if (!inq) return null;

  Object.assign(inq, patch);
  await saveCloudDatabase(db);
  return inq;
}
