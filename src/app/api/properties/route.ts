import { NextRequest, NextResponse } from 'next/server';
import { getAllProperties } from '@/app/actions/propertyActions';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const campus = searchParams.get('campus');
    const location = searchParams.get('location') || undefined;

    const typesArray = type && type !== 'Any' ? [type] : undefined;
    const campusesArray = campus && campus !== 'Any' ? [campus] : undefined;

    const properties = await getAllProperties({
      types: typesArray,
      campuses: campusesArray,
      location,
    });

    return NextResponse.json({
      success: true,
      properties,
      total: properties.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch properties' },
      { status: 500 }
    );
  }
}
