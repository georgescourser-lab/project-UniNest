import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function SearchPage() {
  const properties = await prisma.properties.findMany();

  return (
    <div className="container" style={{ paddingTop: '120px' }}>
      <h1 className="section-title">All Properties</h1>
      <div className="search-page-layout">
        <aside className="filter-sidebar">
          <div className="filter-group">
            <h4>Property Type</h4>
            <label><input type="checkbox" /> Bedsitter</label>
            <label><input type="checkbox" /> 1 Bedroom</label>
            <label><input type="checkbox" /> 2 Bedroom</label>
          </div>
          <div className="filter-group">
            <h4>Campus/Location</h4>
            <label><input type="checkbox" /> KU Main</label>
            <label><input type="checkbox" /> UoN</label>
            <label><input type="checkbox" /> JKUAT</label>
          </div>
          <button className="btn btn-primary">Apply Filters</button>
        </aside>

        <div className="properties-grid">
          {properties.map((property) => (
            <div key={property.id} className="property-card">
              <Link href={`/property/${property.id}`} className="property-image">
                <img src={property.image || (property.images && property.images[0]) || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500&q=80'} alt={property.title || 'Property'} />
                <div className="property-badges">
                  <span className="badge badge-primary">{property.type}</span>
                </div>
              </Link>
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
