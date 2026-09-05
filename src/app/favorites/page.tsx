import Link from 'next/link';
import { getFavorites } from '@/app/actions/favoriteActions';
import FavoriteButton from '@/components/FavoriteButton';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function FavoritesPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    redirect('/login');
  }
  
  const userId = session.user.id;
  const favorites = await getFavorites();
  const properties = favorites.map(f => f.properties);

  return (
    <div className="container" style={{ paddingTop: '120px', minHeight: '60vh' }}>
      <h1 className="section-title">Saved Properties</h1>
      <p className="section-subtitle">Your favourite listings in one place.</p>
      
      {properties.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <p style={{ color: 'var(--color-gray)', fontSize: '1.1rem', marginBottom: '1.5rem' }}>You haven't saved any properties yet.</p>
          <Link href="/search" className="btn btn-primary">Browse Properties</Link>
        </div>
      ) : (
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
                <FavoriteButton propertyId={property.id} userId={userId} initialIsFavorite={true} />
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
      )}
    </div>
  );
}
