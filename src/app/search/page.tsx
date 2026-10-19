import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getCurrentUser } from '@/app/actions/authActions';
import { getFavorites } from '@/app/actions/favoriteActions';
import FilterSidebar from '@/components/FilterSidebar';
import FavoriteButton from '@/components/FavoriteButton';
import { FALLBACK_PROPERTIES } from '@/data/fallbackProperties';

export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedParams = (await searchParams) || {};
  const supabase = await createClient();
  const user = await getCurrentUser();
  const userFavorites = user ? await getFavorites() : [];
  const favoriteIds = new Set(userFavorites.map((f: any) => f.property_id));
  
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

  let query = supabase.from('properties').select('*');
  
  const typesArray = types as string[] | undefined;
  if (typesArray && typesArray.length > 0) {
    query = query.in('type', typesArray);
  }
  
  const orConditions: string[] = [];
  
  const campusesArray = campuses as string[] | undefined;
  if (campusesArray && campusesArray.length > 0) {
    campusesArray.forEach((campus: string) => {
      orConditions.push(`location.ilike.%${campus}%`);
    });
  }
  
  if (location && location.trim() !== '') {
    orConditions.push(`location.ilike.%${location}%`);
  }

  if (orConditions.length > 0) {
    query = query.or(orConditions.join(','));
  }

  query = query.order('id', { ascending: false });

  const { data: propertiesData } = await query;
  let properties = propertiesData || [];
  if (properties.length === 0) {
    properties = FALLBACK_PROPERTIES.filter(p => {
      if (typesArray && typesArray.length > 0 && !typesArray.includes(p.type)) return false;
      if (location && location.trim() !== '' && !p.location.toLowerCase().includes(location.toLowerCase())) return false;
      return true;
    });
  }

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
                <FavoriteButton propertyId={property.id} userId={user?.id} initialIsFavorite={favoriteIds.has(property.id)} />
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
