import { NextRequest, NextResponse } from 'next/server';
import {
  getCloudDatabase,
  addCloudMarketplaceItem,
  updateCloudMarketplaceItem,
  removeCloudMarketplaceItem,
  CloudMarketplaceItem,
} from '@/lib/cloudStore';
import { MARKETPLACE_ITEMS } from '@/data/marketplaceItems';
import { getCurrentUser } from '@/app/actions/authActions';
import { revalidatePath } from 'next/cache';

const VERIFIED_AGENT_EMAILS = [
  'georgescourser@gmail.com',
  'oderocarilus@gmail.com',
];

export const dynamic = 'force-dynamic';

function toPublicMarketplaceItem(item: CloudMarketplaceItem): CloudMarketplaceItem {
  const publicItem = { ...item };
  delete publicItem.ownerLegalName;
  delete publicItem.ownerPhone;
  delete publicItem.ownerEmail;
  delete publicItem.ownerPrivateAddress;
  return publicItem;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope') || 'public';
    const statusFilter = searchParams.get('status');
    const campusFilter = searchParams.get('campus');
    const categoryFilter = searchParams.get('category');

    const db = await getCloudDatabase();
    const cloudItems = db.marketplace || [];

    // Combine static catalog items with cloud items (avoiding duplicates)
    const seenRefs = new Set<string>();
    const seenIds = new Set<number>();
    const combined: CloudMarketplaceItem[] = [];

    // User-posted cloud items take precedence (newest first)
    for (const item of cloudItems) {
      if (item && item.id) {
        seenIds.add(item.id);
        if (item.listingRef) seenRefs.add(item.listingRef);
        combined.push(item);
      }
    }

    // Add static pre-seeded items if not already in cloud
    for (const raw of MARKETPLACE_ITEMS) {
      if (!seenIds.has(raw.id) && (!raw.listingRef || !seenRefs.has(raw.listingRef))) {
        combined.push({
          id: raw.id,
          listingRef: raw.listingRef,
          title: raw.title,
          category: raw.category,
          price: raw.price,
          originalPrice: raw.originalPrice,
          condition: raw.condition,
          campus: raw.campus,
          campusName: raw.campusName,
          location: raw.location,
          image: raw.image,
          description: raw.description,
          status: 'Live',
          verifiedListing: true,
          postedAt: raw.postedAt || 'Recently',
          submittedAt: new Date(0).toISOString(),
          assignedAgentName: raw.agentName || 'George Scourser',
        });
      }
    }

    // If scope === 'agent', check agent access or return all items for verified portal
    let filtered = combined;
    if (scope !== 'agent') {
      // Public visitors only see Live items (or Sold if explicitly requested)
      if (statusFilter === 'sold') {
        filtered = filtered.filter((i) => i.status === 'Sold');
      } else {
        filtered = filtered.filter((i) => i.status === 'Live' || !i.status);
      }
    } else if (statusFilter) {
      filtered = filtered.filter((i) => i.status?.toLowerCase() === statusFilter.toLowerCase());
    }

    if (campusFilter && campusFilter !== 'All') {
      filtered = filtered.filter((i) => i.campus?.toLowerCase() === campusFilter.toLowerCase());
    }

    if (categoryFilter && categoryFilter !== 'All') {
      filtered = filtered.filter((i) => i.category?.toLowerCase() === categoryFilter.toLowerCase());
    }

    const responseItems =
      scope === 'agent' ? filtered : filtered.map(toPublicMarketplaceItem);

    return NextResponse.json({
      success: true,
      items: responseItems,
      total: responseItems.length,
      updatedAt: db.updatedAt || new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('GET /api/marketplace error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch marketplace items' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.title || !body.price || !body.campus) {
      return NextResponse.json(
        { error: 'Missing required item fields: title, price, campus' },
        { status: 400 }
      );
    }

    const itemId = body.id || Date.now();
    const listingRef =
      body.listingRef || `UN-VET-${Math.floor(1000 + Math.random() * 9000)}`;

    const campusAgents: Record<string, { id: number; name: string }> = {
      KU: { id: 1, name: 'George Scourser' },
      JKUAT: { id: 2, name: 'Odero Carilus' },
      UoN: { id: 1, name: 'George Scourser' },
      Strathmore: { id: 2, name: 'Odero Carilus' },
      USIU: { id: 1, name: 'George Scourser' },
      Daystar: { id: 2, name: 'Odero Carilus' },
      MKU: { id: 2, name: 'Odero Carilus' },
      Moi: { id: 1, name: 'George Scourser' },
      Egerton: { id: 2, name: 'Odero Carilus' },
    };

    const assignedAgent = campusAgents[body.campus] || { id: 1, name: 'George Scourser' };

    const newItem: CloudMarketplaceItem = {
      id: itemId,
      listingRef,
      title: String(body.title).trim(),
      category: String(body.category || 'General').trim(),
      price: String(body.price).trim().startsWith('Ksh')
        ? String(body.price).trim()
        : `Ksh ${String(body.price).trim()}`,
      originalPrice: body.originalPrice ? String(body.originalPrice).trim() : null,
      condition: String(body.condition || 'Gently Used').trim(),
      campus: String(body.campus).trim(),
      campusName: body.campusName || String(body.campus).trim(),
      location: String(body.location || 'Campus Hub').trim(),
      image:
        body.image ||
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
      description: String(body.description || '').trim(),
      verificationMethod: body.verificationMethod || 'Hostel Visit',
      ownerLegalName: body.ownerLegalName || 'Confidential Student',
      ownerPhone: body.ownerPhone || '',
      ownerEmail: body.ownerEmail || '',
      ownerPrivateAddress: body.ownerPrivateAddress || '',
      assignedAgentId: assignedAgent.id,
      assignedAgentName: assignedAgent.name,
      submittedAt: new Date().toISOString(),
      status: body.status || 'Pending Agent Verification',
      verifiedListing: body.status === 'Live',
      postedAt: body.postedAt || 'Just now',
    };

    const saved = await addCloudMarketplaceItem(newItem);

    try {
      revalidatePath('/', 'layout');
    } catch {}

    return NextResponse.json({
      success: true,
      item: saved,
      listingRef: saved.listingRef,
    });
  } catch (err: any) {
    console.error('POST /api/marketplace error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to submit marketplace item' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    let cleanEmail = (user?.email || '').trim().toLowerCase();
    if (!cleanEmail) {
      const clientCookie =
        req.cookies.get('uninest_user_client')?.value ||
        req.cookies.get('uninest_user_session')?.value;
      if (clientCookie) {
        try {
          const parsed = JSON.parse(decodeURIComponent(clientCookie));
          cleanEmail = (parsed?.email || '').trim().toLowerCase();
        } catch {}
      }
      if (!cleanEmail) {
        cleanEmail = (req.headers.get('x-uninest-agent-email') || '').trim().toLowerCase();
      }
    }
    const isAgent = VERIFIED_AGENT_EMAILS.includes(cleanEmail);

    const body = await req.json();
    const { listingRef, id, action, updateData } = body;

    const refOrId = listingRef || id;
    if (!refOrId) {
      return NextResponse.json({ error: 'Missing listingRef or id' }, { status: 400 });
    }

    let patch: Partial<CloudMarketplaceItem> = {};

    if (action === 'approve') {
      if (!isAgent) {
        return NextResponse.json(
          { error: 'Unauthorized: Only verified agents can approve listings' },
          { status: 403 }
        );
      }
      patch = {
        status: 'Live',
        verifiedListing: true,
        postedAt: 'Just now',
      };
    } else if (action === 'reject') {
      if (!isAgent) {
        return NextResponse.json(
          { error: 'Unauthorized: Only verified agents can reject listings' },
          { status: 403 }
        );
      }
      patch = {
        status: 'Rejected',
      };
    } else if (action === 'sold') {
      if (!isAgent) {
        return NextResponse.json(
          { error: 'Unauthorized: Only verified agents can mark items sold' },
          { status: 403 }
        );
      }
      patch = {
        status: 'Sold',
      };
    } else if (action === 'schedule') {
      patch = {
        verificationMethod: updateData?.slot
          ? `Hostel Visit: ${updateData.slot}`
          : 'Hostel Visit Scheduled',
      };
    } else if (updateData) {
      patch = updateData;
    }

    let updated = await updateCloudMarketplaceItem(refOrId, patch);
    if (!updated) {
      // Check if it's a pre-seeded static item or provided in itemData
      const staticMatch =
        MARKETPLACE_ITEMS.find(
          (m) => String(m.id) === String(refOrId) || m.listingRef === String(refOrId)
        ) || body.itemData;

      if (staticMatch) {
        const newItem: CloudMarketplaceItem = {
          id: staticMatch.id || Date.now(),
          listingRef: staticMatch.listingRef || `UN-MKT-${staticMatch.id || Date.now()}`,
          title: staticMatch.title,
          category: staticMatch.category || 'General',
          price: staticMatch.price,
          originalPrice: staticMatch.originalPrice,
          condition: staticMatch.condition || 'Good',
          campus: staticMatch.campus || 'General',
          campusName: staticMatch.campusName || staticMatch.campus || 'Campus',
          location: staticMatch.location || 'Campus Hub',
          image:
            staticMatch.image ||
            'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
          description: staticMatch.description || '',
          status: (patch.status as any) || (action === 'sold' ? 'Sold' : 'Live'),
          verifiedListing: true,
          postedAt: staticMatch.postedAt || 'Recently',
          submittedAt: new Date().toISOString(),
          assignedAgentName: staticMatch.agentName || 'Verified UniNest Agent',
        };
        updated = await addCloudMarketplaceItem(newItem);
      }
    }

    if (!updated) {
      return NextResponse.json({ error: 'Item not found in cloud store' }, { status: 404 });
    }

    try {
      revalidatePath('/', 'layout');
      revalidatePath('/sold');
    } catch {}

    return NextResponse.json({
      success: true,
      item: updated,
    });
  } catch (err: any) {
    console.error('PATCH /api/marketplace error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to update marketplace item' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    let cleanEmail = (user?.email || '').trim().toLowerCase();
    if (!cleanEmail) {
      const clientCookie =
        req.cookies.get('uninest_user_client')?.value ||
        req.cookies.get('uninest_user_session')?.value;
      if (clientCookie) {
        try {
          const parsed = JSON.parse(decodeURIComponent(clientCookie));
          cleanEmail = (parsed?.email || '').trim().toLowerCase();
        } catch {}
      }
      if (!cleanEmail) {
        cleanEmail = (req.headers.get('x-uninest-agent-email') || '').trim().toLowerCase();
      }
    }
    if (!VERIFIED_AGENT_EMAILS.includes(cleanEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const refOrId = searchParams.get('ref') || searchParams.get('id');
    if (!refOrId) {
      return NextResponse.json({ error: 'Missing ref or id' }, { status: 400 });
    }

    const removed = await removeCloudMarketplaceItem(refOrId);
    try {
      revalidatePath('/', 'layout');
      revalidatePath('/sold');
    } catch {}
    return NextResponse.json({ success: removed });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
