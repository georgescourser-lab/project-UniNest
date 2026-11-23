import fs from 'fs';
import path from 'path';
import os from 'os';

export const RESET_EPOCH_ID = 1795468000000;

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
  deletedPropertyIds?: number[];
  deletedMarketplaceRefs?: string[];
  resetEpoch?: number;
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
  // eslint-disable-next-line no-var
  var __uninestInFlightCloudFetch: Promise<CloudDatabase | null> | undefined;
}

function createEmptyDb(): CloudDatabase {
  return {
    properties: [],
    marketplace: [],
    inquiries: [],
    deletedPropertyIds: [],
    deletedMarketplaceRefs: [],
    resetEpoch: RESET_EPOCH_ID,
    updatedAt: new Date().toISOString(),
  };
}

function sanitizeDb(raw: any): CloudDatabase | null {
  if (!raw || typeof raw !== 'object') return null;

  // Reject any pre-reset snapshot that still contains legacy placeholder IDs (< RESET_EPOCH_ID)
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
        if (deletedPropIds.has(Number(p.id))) return false;
        return true;
      })
    : [];

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

  // Merge properties by id (earlier sources in `valid` take priority if newer, so order sources newest-first)
  const sortedSources = [...valid].sort((a, b) => {
    const tA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const tB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return tB - tA;
  });

  const propMap = new Map<number, CloudProperty>();
  for (const src of sortedSources) {
    for (const p of src.properties || []) {
      const id = Number(p.id);
      if (id < RESET_EPOCH_ID || deletedPropIds.has(id)) continue;
      const existing = propMap.get(id);
      if (!existing) {
        propMap.set(id, p);
      } else {
        // Preserve images and sold status
        const bestImages =
          Array.isArray(existing.images) && existing.images.length > 0
            ? existing.images
            : Array.isArray(p.images)
            ? p.images
            : [];
        propMap.set(id, {
          ...p,
          ...existing,
          is_sold: Boolean(existing.is_sold || p.is_sold),
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
    marketplace: Array.from(mktMap.values()).sort((a, b) => Number(b.id) - Number(a.id)),
    inquiries: Array.from(inqMap.values()),
    deletedPropertyIds: Array.from(deletedPropIds),
    deletedMarketplaceRefs: Array.from(deletedMktRefs),
    resetEpoch: RESET_EPOCH_ID,
    updatedAt: sortedSources[0]?.updatedAt || new Date().toISOString(),
  };
}

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

  // 1. Always write to OS tmpdir (writable on both Vercel serverless & local dev)
  try {
    const tmpPath = path.join(os.tmpdir(), 'uninest-cloud-database.json');
    fs.writeFileSync(tmpPath, payload, 'utf8');
  } catch {}

  // 2. Also write to workspace data/cloud-database.json when writable
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(path.join(dataDir, 'cloud-database.json'), payload, 'utf8');
  } catch {}
}

async function fetchFromCloud(): Promise<CloudDatabase | null> {
  const key = getResendKey();
  if (!key) return null;

  if (globalThis.__uninestInFlightCloudFetch) {
    return globalThis.__uninestInFlightCloudFetch;
  }

  const doFetch = async (): Promise<CloudDatabase | null> => {
    const targetId = globalThis.__uninestStoreBroadcastId || STORE_BROADCAST_ID;

    try {
      const res = await fetch(`https://api.resend.com/broadcasts/${targetId}`, {
        headers: { Authorization: `Bearer ${key}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const doc = await res.json();
        if (doc?.text) {
          const parsed = sanitizeDb(JSON.parse(doc.text));
          if (parsed) return parsed;
        }
      } else if (res.status === 429) {
        // Rate limited by Resend (2 req/s) — do not overwrite local cache
        return null;
      }
    } catch (err) {
      console.warn('fetchFromCloud error:', err);
    }

    return null;
  };

  globalThis.__uninestInFlightCloudFetch = doFetch().finally(() => {
    globalThis.__uninestInFlightCloudFetch = undefined;
  });

  return globalThis.__uninestInFlightCloudFetch;
}

async function persistToCloud(db: CloudDatabase): Promise<boolean> {
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
        body: JSON.stringify({
          text: payload,
        }),
      });
      if (patchRes.ok) {
        return true;
      }
      if (patchRes.status === 429 && attempt === 0) {
        await new Promise((r) => setTimeout(r, 1100));
        continue;
      }
      if (patchRes.status !== 404) {
        return false;
      }
    } catch (err) {
      console.warn('persistToCloud PATCH error:', err);
      return false;
    }
  }

  // Only create a new broadcast if the targetId returned 404
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
 * Get entire live database, merging in-memory, disk backup, and cloud store
 * so newly posted items/houses NEVER disappear even if a cloud poll is rate-limited.
 */
export async function getCloudDatabase(forceRefresh = false): Promise<CloudDatabase> {
  const now = Date.now();
  const cached = globalThis.__uninestLiveCloudDb;
  const ts = globalThis.__uninestLiveCloudDbTimestamp || 0;

  if (!forceRefresh && cached && now - ts < 12000) {
    return cached;
  }

  const localDb = readLocalBackup();
  const cloudDb = await fetchFromCloud();

  const merged = mergeDatabases(cached, localDb, cloudDb);
  globalThis.__uninestLiveCloudDb = merged;
  globalThis.__uninestLiveCloudDbTimestamp = now;
  writeLocalBackup(merged);
  return merged;
}

/**
 * Save updated database to in-memory cache, local backup, and cloud store.
 */
export async function saveCloudDatabase(db: CloudDatabase): Promise<void> {
  const sanitized = sanitizeDb(db) || createEmptyDb();
  sanitized.updatedAt = new Date().toISOString();
  globalThis.__uninestLiveCloudDb = sanitized;
  globalThis.__uninestLiveCloudDbTimestamp = Date.now();
  writeLocalBackup(sanitized);

  await persistToCloud(sanitized);
}

// ============================================================================
// Helper Operations for Properties (Houses)
// ============================================================================

export async function addCloudProperty(prop: CloudProperty): Promise<CloudProperty> {
  const db = await getCloudDatabase(false);
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
  const db = await getCloudDatabase(false);
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
  const db = await getCloudDatabase(false);
  const prop = db.properties.find((p) => Number(p.id) === Number(id));
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
  const db = await getCloudDatabase(false);
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
  const db = await getCloudDatabase(false);
  const item = db.marketplace.find(
    (m) => String(m.id) === String(listingRefOrId) || m.listingRef === String(listingRefOrId)
  );
  if (!item) return null;

  Object.assign(item, patch);
  await saveCloudDatabase(db);
  return item;
}

export async function removeCloudMarketplaceItem(listingRefOrId: string | number): Promise<boolean> {
  const db = await getCloudDatabase(false);
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
  const db = await getCloudDatabase(false);
  db.inquiries.unshift(inq);
  await saveCloudDatabase(db);
  return inq;
}

export async function updateCloudInquiry(
  refCode: string,
  patch: Partial<CloudInquiry>
): Promise<CloudInquiry | null> {
  const db = await getCloudDatabase(false);
  const inq = db.inquiries.find((i) => i.refCode.toUpperCase() === refCode.toUpperCase());
  if (!inq) return null;

  Object.assign(inq, patch);
  await saveCloudDatabase(db);
  return inq;
}
