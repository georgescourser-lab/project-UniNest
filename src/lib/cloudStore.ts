import fs from 'fs';
import path from 'path';
import os from 'os';
import { Pool } from 'pg';

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
  marketplace: CloudMarketplaceItem[];
  inquiries: CloudInquiry[];
  updatedAt?: string;
}

const STORE_BROADCAST_ID = '52b03fe2-60c7-497b-a552-7854c8bb11c1';
const STORE_BROADCAST_NAME = 'uninest_live_cloud_store_v1';
const AUDIENCE_ID = '55c809d4-043e-4917-bc4d-479d5e2f9dd0';

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

  // Fallback: read .env.local and .env from disk directly
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

declare global {
  // eslint-disable-next-line no-var
  var __uninestLiveCloudDb: CloudDatabase | undefined;
  // eslint-disable-next-line no-var
  var __uninestLiveCloudDbTimestamp: number | undefined;
  // eslint-disable-next-line no-var
  var __uninestStoreBroadcastId: string | undefined;
  var __uninestMarketplacePool: Pool | undefined;
  var __uninestMarketplaceDatabaseUnavailable: boolean | undefined;
}

function getMarketplacePool(): Pool | null {
  if (!process.env.DATABASE_URL || globalThis.__uninestMarketplaceDatabaseUnavailable) return null;
  if (!globalThis.__uninestMarketplacePool) {
    globalThis.__uninestMarketplacePool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30000,
    });
  }
  return globalThis.__uninestMarketplacePool;
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

async function readMarketplaceItemsFromDatabase(): Promise<CloudMarketplaceItem[] | null> {
  const pool = getMarketplacePool();
  if (!pool) return null;

  try {
    const result = await pool.query(
      `select id, listing_ref, status, data, private_data
         from public.marketplace_items
        order by updated_at desc, created_at desc`
    );

    return result.rows.map((row) => ({
      ...row.data,
      ...row.private_data,
      id: Number(row.id),
      listingRef: row.listing_ref,
      status: row.status,
    }));
  } catch (error) {
    globalThis.__uninestMarketplaceDatabaseUnavailable = true;
    console.error('Marketplace database read failed; using cloud-store fallback:', error);
    return null;
  }
}

async function writeMarketplaceItemToDatabase(item: CloudMarketplaceItem): Promise<void> {
  const pool = getMarketplacePool();
  if (!pool) return;

  const { publicData, privateData } = splitMarketplaceItem(item);
  await pool.query(
    `insert into public.marketplace_items
      (id, listing_ref, status, data, private_data, updated_at)
     values ($1, $2, $3, $4::jsonb, $5::jsonb, now())
     on conflict (listing_ref) do update set
       id = excluded.id,
       status = excluded.status,
       data = excluded.data,
       private_data = excluded.private_data,
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

async function updateMarketplaceItemInDatabase(
  listingRefOrId: string | number,
  patch: Partial<CloudMarketplaceItem>
): Promise<CloudMarketplaceItem | null> {
  const pool = getMarketplacePool();
  if (!pool) return null;

  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await client.query(
      `select id, listing_ref, status, data, private_data
         from public.marketplace_items
        where id::text = $1 or listing_ref = $1
        for update`,
      [String(listingRefOrId)]
    );
    if (!result.rows[0]) {
      await client.query('rollback');
      return null;
    }

    const row = result.rows[0];
    const current = {
      ...row.data,
      ...row.private_data,
      id: Number(row.id),
      listingRef: row.listing_ref,
      status: row.status,
    } as CloudMarketplaceItem;
    const updated = { ...current, ...patch };
    const { publicData, privateData } = splitMarketplaceItem(updated);

    await client.query(
      `update public.marketplace_items
          set id = $1,
              listing_ref = $2,
              status = $3,
              data = $4::jsonb,
              private_data = $5::jsonb,
              updated_at = now()
        where id = $6`,
      [
        updated.id,
        updated.listingRef,
        updated.status,
        JSON.stringify(publicData),
        JSON.stringify(privateData),
        row.id,
      ]
    );
    await client.query('commit');
    return updated;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function removeMarketplaceItemFromDatabase(
  listingRefOrId: string | number
): Promise<boolean> {
  const pool = getMarketplacePool();
  if (!pool) return false;
  const result = await pool.query(
    `delete from public.marketplace_items
      where id::text = $1 or listing_ref = $1`,
    [String(listingRefOrId)]
  );
  return (result.rowCount || 0) > 0;
}

function getLocalBackupPath(): string {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return path.join(dataDir, 'cloud-database.json');
  } catch {
    return path.join(os.tmpdir(), 'uninest-cloud-database.json');
  }
}

function readLocalBackup(): CloudDatabase | null {
  try {
    const p = getLocalBackupPath();
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.properties)) {
        return parsed;
      }
    }
  } catch {}
  return null;
}

function writeLocalBackup(db: CloudDatabase) {
  try {
    const p = getLocalBackupPath();
    fs.writeFileSync(p, JSON.stringify(db, null, 2), 'utf8');
  } catch {}
}

async function fetchFromCloud(): Promise<CloudDatabase | null> {
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
        const parsed = JSON.parse(doc.text);
        if (parsed && Array.isArray(parsed.properties)) {
          return {
            properties: Array.isArray(parsed.properties) ? parsed.properties : [],
            marketplace: Array.isArray(parsed.marketplace) ? parsed.marketplace : [],
            inquiries: Array.isArray(parsed.inquiries) ? parsed.inquiries : [],
            updatedAt: parsed.updatedAt || new Date().toISOString(),
          };
        }
      }
    }
  } catch (err) {
    console.warn('fetchFromCloud error:', err);
  }

  // If broadcast not found by ID, try finding or creating by name
  try {
    const listRes = await fetch('https://api.resend.com/broadcasts', {
      headers: { Authorization: `Bearer ${key}` },
      cache: 'no-store',
    });
    if (listRes.ok) {
      const listData = await listRes.json();
      const match = (listData.data || []).find((b: any) => b.name === STORE_BROADCAST_NAME);
      if (match?.id) {
        globalThis.__uninestStoreBroadcastId = match.id;
        const getRes = await fetch(`https://api.resend.com/broadcasts/${match.id}`, {
          headers: { Authorization: `Bearer ${key}` },
          cache: 'no-store',
        });
        if (getRes.ok) {
          const doc = await getRes.json();
          if (doc?.text) {
            const parsed = JSON.parse(doc.text);
            return {
              properties: Array.isArray(parsed.properties) ? parsed.properties : [],
              marketplace: Array.isArray(parsed.marketplace) ? parsed.marketplace : [],
              inquiries: Array.isArray(parsed.inquiries) ? parsed.inquiries : [],
              updatedAt: parsed.updatedAt || new Date().toISOString(),
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn('fetchFromCloud by name error:', err);
  }

  return null;
}

async function persistToCloud(db: CloudDatabase): Promise<boolean> {
  const key = getResendKey();
  if (!key) return false;

  const targetId = globalThis.__uninestStoreBroadcastId || STORE_BROADCAST_ID;
  const payload = JSON.stringify(db);

  try {
    const patchRes = await fetch(`https://api.resend.com/broadcasts/${targetId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: payload,
      }),
    });
    if (patchRes.ok) {
      return true;
    }
  } catch (err) {
    console.warn('persistToCloud PATCH error:', err);
  }

  // If PATCH failed (e.g. broadcast ID expired), create a new broadcast
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
  } catch (err) {
    console.warn('persistToCloud create error:', err);
  }

  return false;
}

/**
 * Get entire live database with in-memory caching (5s TTL).
 */
export async function getCloudDatabase(forceRefresh = false): Promise<CloudDatabase> {
  const now = Date.now();
  const cached = globalThis.__uninestLiveCloudDb;
  const ts = globalThis.__uninestLiveCloudDbTimestamp || 0;

  if (!forceRefresh && cached && now - ts < 4000) {
    return cached;
  }

  const cloudDb = await fetchFromCloud();
  if (cloudDb) {
    let marketplaceItems = await readMarketplaceItemsFromDatabase();
    if (marketplaceItems) {
      const knownRefs = new Set(marketplaceItems.map((item) => item.listingRef));
      const legacyItems = cloudDb.marketplace.filter(
        (item) => item.listingRef && !knownRefs.has(item.listingRef)
      );
      for (const item of legacyItems) {
        await writeMarketplaceItemToDatabase(item);
      }
      if (legacyItems.length > 0) {
        marketplaceItems = await readMarketplaceItemsFromDatabase();
      }
    }
    globalThis.__uninestLiveCloudDb = cloudDb;
    if (marketplaceItems) cloudDb.marketplace = marketplaceItems;
    globalThis.__uninestLiveCloudDbTimestamp = now;
    writeLocalBackup(cloudDb);
    return cloudDb;
  }

  const localDb = readLocalBackup();
  if (localDb) {
    let marketplaceItems = await readMarketplaceItemsFromDatabase();
    if (marketplaceItems) {
      const knownRefs = new Set(marketplaceItems.map((item) => item.listingRef));
      const legacyItems = localDb.marketplace.filter(
        (item) => item.listingRef && !knownRefs.has(item.listingRef)
      );
      for (const item of legacyItems) {
        await writeMarketplaceItemToDatabase(item);
      }
      if (legacyItems.length > 0) {
        marketplaceItems = await readMarketplaceItemsFromDatabase();
      }
    }
    globalThis.__uninestLiveCloudDb = localDb;
    if (marketplaceItems) localDb.marketplace = marketplaceItems;
    globalThis.__uninestLiveCloudDbTimestamp = now;
    return localDb;
  }

  const defaultDb: CloudDatabase = {
    properties: [],
    marketplace: [],
    inquiries: [],
    updatedAt: new Date().toISOString(),
  };

  globalThis.__uninestLiveCloudDb = defaultDb;
  globalThis.__uninestLiveCloudDbTimestamp = now;
  return defaultDb;
}

/**
 * Save updated database both to in-memory cache and cloud store.
 */
export async function saveCloudDatabase(db: CloudDatabase): Promise<void> {
  db.updatedAt = new Date().toISOString();
  globalThis.__uninestLiveCloudDb = db;
  globalThis.__uninestLiveCloudDbTimestamp = Date.now();
  writeLocalBackup(db);

  // Persist to cloud asynchronously or await
  await persistToCloud(db);
}

// ============================================================================
// Helper Operations for Properties (Houses)
// ============================================================================

export async function addCloudProperty(prop: CloudProperty): Promise<CloudProperty> {
  const db = await getCloudDatabase(true);
  // Ensure unique ID
  const existingIndex = db.properties.findIndex((p) => p.id === prop.id);
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
  const initialLen = db.properties.length;
  db.properties = db.properties.filter((p) => p.id !== id);
  if (db.properties.length !== initialLen) {
    await saveCloudDatabase(db);
    return true;
  }
  return false;
}

export async function markCloudPropertySold(id: number): Promise<boolean> {
  const db = await getCloudDatabase(true);
  const prop = db.properties.find((p) => p.id === id);
  if (prop) {
    prop.is_sold = true;
    await saveCloudDatabase(db);
    return true;
  }
  return false;
}

// ============================================================================
// Helper Operations for Marketplace Items
// ============================================================================

export async function addCloudMarketplaceItem(item: CloudMarketplaceItem): Promise<CloudMarketplaceItem> {
  if (getMarketplacePool()) {
    try {
      await writeMarketplaceItemToDatabase(item);
      const db = await getCloudDatabase(true);
      db.marketplace = (await readMarketplaceItemsFromDatabase()) || [item];
      return item;
    } catch (error) {
      globalThis.__uninestMarketplaceDatabaseUnavailable = true;
      console.error('Marketplace database write failed; using cloud-store fallback:', error);
    }
  }

  const db = await getCloudDatabase(true);
  const existingIdx = db.marketplace.findIndex(
    (m) => m.id === item.id || (m.listingRef && m.listingRef === item.listingRef)
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
  if (getMarketplacePool()) {
    try {
      const updated = await updateMarketplaceItemInDatabase(listingRefOrId, patch);
      if (updated) {
        const db = await getCloudDatabase(true);
        db.marketplace = (await readMarketplaceItemsFromDatabase()) || db.marketplace;
      }
      return updated;
    } catch (error) {
      globalThis.__uninestMarketplaceDatabaseUnavailable = true;
      console.error('Marketplace database update failed; using cloud-store fallback:', error);
    }
  }

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
  if (getMarketplacePool()) {
    try {
      const removed = await removeMarketplaceItemFromDatabase(listingRefOrId);
      if (removed) {
        const db = await getCloudDatabase(true);
        db.marketplace = (await readMarketplaceItemsFromDatabase()) || db.marketplace;
      }
      return removed;
    } catch (error) {
      globalThis.__uninestMarketplaceDatabaseUnavailable = true;
      console.error('Marketplace database delete failed; using cloud-store fallback:', error);
    }
  }

  const db = await getCloudDatabase(true);
  const initialLen = db.marketplace.length;
  db.marketplace = db.marketplace.filter(
    (m) => String(m.id) !== String(listingRefOrId) && m.listingRef !== String(listingRefOrId)
  );
  if (db.marketplace.length !== initialLen) {
    await saveCloudDatabase(db);
    return true;
  }
  return false;
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
