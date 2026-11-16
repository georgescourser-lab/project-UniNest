import { NextRequest, NextResponse } from 'next/server';
import {
  getCloudDatabase,
  addCloudInquiry,
  updateCloudInquiry,
  CloudInquiry,
} from '@/lib/cloudStore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const refCode = searchParams.get('ref');
    const clientEmail = searchParams.get('clientEmail')?.toLowerCase().trim();

    const db = await getCloudDatabase();
    const inquiries = db.inquiries || [];

    if (refCode) {
      const cleanRef = refCode.trim().toUpperCase();
      const match = inquiries.find(
        (i) => (i.refCode || '').trim().toUpperCase() === cleanRef
      );
      if (match) {
        return NextResponse.json({ success: true, inquiry: match });
      }
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 });
    }

    let filtered = inquiries;
    if (clientEmail) {
      filtered = filtered.filter(
        (i) => (i.clientEmail || '').toLowerCase().trim() === clientEmail
      );
    }

    return NextResponse.json({
      success: true,
      inquiries: filtered,
      total: filtered.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch inquiries' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.clientName || !body.clientPhone) {
      return NextResponse.json(
        { error: 'Missing client name or phone number' },
        { status: 400 }
      );
    }

    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    const refCode = body.refCode || `UN-INQ-${randomDigits}`;

    const newInquiry: CloudInquiry = {
      refCode,
      createdAt: new Date().toISOString(),
      itemId: body.itemId,
      itemTitle: body.itemTitle || 'Marketplace Item',
      itemPrice: body.itemPrice || '',
      campus: body.campus || '',
      clientName: body.clientName,
      clientPhone: body.clientPhone,
      clientEmail: body.clientEmail || '',
      preferredDate: body.preferredDate || 'Tomorrow',
      preferredTime: body.preferredTime || 'Afternoon',
      preferredHub: body.preferredHub || 'Campus Gate',
      notes: body.notes || '',
      status: body.status || 'Pending Agent Review',
      agentName: body.agentName || 'George Scourser',
      agentNotes: body.agentNotes || 'New client inquiry received. Coordinate for accompanied handover.',
      dealUpdate:
        body.dealUpdate ||
        `Appointment scheduled with ${body.agentName || 'UniNest Agent'}. Seller notified for verification.`,
    };

    const saved = await addCloudInquiry(newInquiry);

    return NextResponse.json({
      success: true,
      refCode: saved.refCode,
      inquiry: saved,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to save inquiry' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { refCode, status, dealUpdate, agentNotes } = body;

    if (!refCode) {
      return NextResponse.json({ error: 'Missing refCode' }, { status: 400 });
    }

    const patch: Partial<CloudInquiry> = {};
    if (status) patch.status = status;
    if (dealUpdate) patch.dealUpdate = dealUpdate;
    if (agentNotes) patch.agentNotes = agentNotes;

    const updated = await updateCloudInquiry(refCode, patch);
    if (!updated) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      inquiry: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to update inquiry' },
      { status: 500 }
    );
  }
}
