begin;

insert into public.agents (id, name, image, rating, reviews, listings_count, whatsapp, email) values
  (1, 'Jane Kariuki', '/images/agent-1.svg', 4.9, 24, 12, '254712345678', 'jane@uninest.com'),
  (2, 'David Omondi', '/images/agent-2.svg', 4.8, 18, 9, '254723456789', 'david@uninest.com'),
  (3, 'Mary Mwangi', '/images/agent-3.svg', 4.7, 31, 14, '254734567890', 'mary@uninest.com'),
  (4, 'Samuel Kipchoge', '/images/agent-4.svg', 4.9, 27, 16, '254745678901', 'samuel@uninest.com')
on conflict (id) do update set
  name = excluded.name,
  image = excluded.image,
  rating = excluded.rating,
  reviews = excluded.reviews,
  listings_count = excluded.listings_count,
  whatsapp = excluded.whatsapp,
  email = excluded.email;

insert into public.properties (id, title, type, rent, location, distance, image, images, amenities, agent_id, description) values
  (1, 'Cozy Bedsitter', 'Bedsitter', '5,000', 'Near JKUAT', '0.5km', '/images/property-1.svg', array['/images/property-1.svg', '/images/property-2.svg'], array['WiFi', 'Water', 'Electric', 'Furnished'], 1, 'Comfortable bedsitter with excellent access to campus. Newly renovated with modern fixtures.'),
  (2, 'Modern 1-Bedroom', '1-Bedroom', '8,000', 'Off-Campus', '1km', '/images/property-2.svg', array['/images/property-2.svg'], array['WiFi', 'Water', 'Electric', 'Furnished', 'Kitchen'], 2, 'Spacious 1-bedroom apartment with modern amenities and excellent ventilation.'),
  (3, 'Shared 2-Bedroom', '2-Bedroom', '6,500', 'Near UON', '0.3km', '/images/property-3.svg', array['/images/property-3.svg'], array['WiFi', 'Water', 'Electric', 'Balcony', 'Living Room'], 3, 'Great shared apartment for students. Well-maintained and close to campus.'),
  (4, 'Premium Bedsitter', 'Bedsitter', '7,000', 'Campus Area', '0.2km', '/images/property-4.svg', array['/images/property-4.svg'], array['WiFi', 'Water', 'Electric', 'Furnished', 'TV', 'Air Conditioning'], 4, 'Luxury bedsitter with premium features and contemporary design.')
on conflict (id) do update set
  title = excluded.title,
  type = excluded.type,
  rent = excluded.rent,
  location = excluded.location,
  distance = excluded.distance,
  image = excluded.image,
  images = excluded.images,
  amenities = excluded.amenities,
  agent_id = excluded.agent_id,
  description = excluded.description;

insert into public.reviews (id, client_name, rating, comment, created_at, property_id) values
  (1, 'Alex K.', 5, 'Great location and very affordable!', '2026-06-15T00:00:00Z', 1),
  (2, 'Sam M.', 4, 'Good amenities, responsive landlord', '2026-06-10T00:00:00Z', 1),
  (3, 'Lisa T.', 5, 'Perfect for students, very quiet', '2026-06-12T00:00:00Z', 2),
  (4, 'John D.', 5, 'Exactly what I was looking for!', '2026-06-18T00:00:00Z', 4)
on conflict (id) do update set
  client_name = excluded.client_name,
  rating = excluded.rating,
  comment = excluded.comment,
  created_at = excluded.created_at,
  property_id = excluded.property_id;

select setval(pg_get_serial_sequence('public.reviews', 'id'), greatest((select coalesce(max(id), 1) from public.reviews), 1), true);

commit;
