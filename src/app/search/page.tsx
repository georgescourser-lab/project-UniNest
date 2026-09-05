import Link from 'next/link';
import { getPrisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import FilterSidebar from '@/components/FilterSidebar';

export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const prisma = getPrisma();
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  
  const resolvedParams = await searchParams;
  
  let types = resolvedParams.type;
  if (types && typeof types === 'string') {
    if (types === 'Any') types = undefined;
    else types = [types];
  }
  
  let campuses = resolvedParams.campus;
  if (campuses && typeof campuses === 'string') {
    if (campuses === 'Any') campuses = undefined;
    else campuses = [campuses];
  }
  
  const location = resolvedParams.location as string;

  const whereClause: any = {};
  
  if (types && types.length > 0) {
    whereClause.type = { in: types };
  }
  
  // Assuming campus corresponds to location broadly or we could just match it
  if (campuses && campuses.length > 0) {
    // If multiple campuses, we can do OR conditions on location
    whereClause.OR = campuses.map((campus: string) => ({
      location: { contains: campus, mode: 'insensitive' }
    }));
  }
  
  if (location && location.trim() !== '') {
    const locationCondition = { location: { contains: location, mode: 'insensitive' } };
    if (whereClause.OR) {
      whereClause.OR.push(locationCondition);
    } else {
      whereClause.OR = [locationCondition];
    }
  }

  // Fetch properties from the database
  const properties = await prisma.properties.findMany({
    where: whereClause,
    orderBy: {
      id: 'desc'
    }
  });

  return (
    <div className="container" style={{ paddingTop: '120px' }}>
      <h1 className="section-title">All Properties</h1>
      <div className="search-page-layout">
        <FilterSidebar />

        <div className="properties-grid">
          {properties.map((property) => (
            <div key={property.id} className="property-card">
              <div className="property-image" style={{ position: 'relative', display: 'block' }}>
                <Link href={`/property/${property.id}`} style={{ display: 'block', height: '100%' }}>
                  <img src={property.image || (property.images && property.images[0]) || '/images/property-2.svg'} alt={property.title || 'Property'} />
                </Link>
                <div className="property-badges">
                  <span className="badge badge-primary">{property.type}</span>
                </div>
              </div>
              <div className="property-content">
                <div className="property-price">{property.rent}<span>/month</span></div>
                <h3 className="property-title">{property.title}</h3>
                <div className="property-location">
                  {property.location}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
