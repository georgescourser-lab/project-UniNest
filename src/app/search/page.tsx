import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function SearchPage() {
  const properties = [
    {
      id: 1,
      title: 'Cozy Bedsitter',
      type: 'Bedsitter',
      rent: '5,000',
      location: 'Near JKUAT',
      distance: '0.5km',
      image: '/images/property-1.svg',
      images: [],
      amenities: ['WiFi', 'Water', 'Electric'],
      agent_id: 1,
      description: 'Comfortable bedsitter with excellent access to campus'
    },
    {
      id: 2,
      title: 'Modern 1-Bedroom',
      type: '1-Bedroom',
      rent: '8,000',
      location: 'Off-Campus',
      distance: '1km',
      image: '/images/property-2.svg',
      images: [],
      amenities: ['WiFi', 'Water', 'Electric', 'Furnished'],
      agent_id: 2,
      description: 'Spacious 1-bedroom apartment with modern amenities'
    },
    {
      id: 3,
      title: 'Shared 2-Bedroom',
      type: '2-Bedroom',
      rent: '6,500',
      location: 'Near UON',
      distance: '0.3km',
      image: '/images/property-3.svg',
      images: [],
      amenities: ['WiFi', 'Water', 'Electric', 'Balcony'],
      agent_id: 3,
      description: 'Great shared apartment for students'
    },
    {
      id: 4,
      title: 'Premium Bedsitter',
      type: 'Bedsitter',
      rent: '7,000',
      location: 'Campus Area',
      distance: '0.2km',
      image: '/images/property-4.svg',
      images: [],
      amenities: ['WiFi', 'Water', 'Electric', 'Furnished', 'TV'],
      agent_id: 4,
      description: 'Luxury bedsitter with premium features'
    },
    {
      id: 5,
      title: 'Student Haven Bedsitter',
      type: 'Bedsitter',
      rent: '4,500',
      location: 'Kenyatta Road',
      distance: '1.2km',
      image: '/images/property-1.svg',
      images: [],
      amenities: ['WiFi', 'Water', 'Electric'],
      agent_id: 1,
      description: 'Budget-friendly bedsitter near main campus'
    },
    {
      id: 6,
      title: 'Spacious 2-Bedroom',
      type: '2-Bedroom',
      rent: '9,000',
      location: 'Opposite JKUAT',
      distance: '0.8km',
      image: '/images/property-2.svg',
      images: [],
      amenities: ['WiFi', 'Water', 'Electric', 'Parking'],
      agent_id: 2,
      description: 'Large 2-bedroom with parking space'
    }
  ];

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
                <img src={property.image || (property.images && property.images[0]) || '/images/property-2.svg'} alt={property.title || 'Property'} />
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
