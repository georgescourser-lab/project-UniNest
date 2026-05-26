const properties = [
  {
    id: 1,
    title: "Modern Student Studio",
    type: "Bedsitter",
    rent: "$450",
    location: "Campus North, 5 min walk",
    distance: "0.5 miles",
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1de2d93688?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
    ],
    amenities: ["Wi-Fi included", "Security 24/7", "Furnished"],
    agentId: 101,
    description: "A compact, highly modern studio perfect for focused students. Only 5 minutes away from the main campus gates, featuring high-speed internet and round-the-clock security."
  },
  {
    id: 2,
    title: "Spacious 1-Bedroom Apartment",
    type: "1-Bedroom",
    rent: "$650",
    location: "Westside District",
    distance: "1.2 miles",
    image: "https://images.unsplash.com/photo-1502672260266-1c1de2d93688?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1de2d93688?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
    ],
    amenities: ["Water included", "Gym Access", "Laundry"],
    agentId: 102,
    description: "Enjoy a spacious one-bedroom layout with modern fittings. The building includes a gym and on-site laundry facilities for your convenience."
  },
  {
    id: 3,
    title: "Shared 2-Bedroom Suite",
    type: "2-Bedroom",
    rent: "$800",
    location: "Downtown Hub",
    distance: "2.0 miles",
    image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
    ],
    amenities: ["Balcony", "Parking", "Furnished"],
    agentId: 101,
    description: "Perfect for sharing with a roommate! This 2-bedroom suite boasts a beautiful city view from the balcony and includes dedicated parking."
  },
  {
    id: 4,
    title: "Cozy Campus Bedsitter",
    type: "Bedsitter",
    rent: "$380",
    location: "South Gate Area",
    distance: "0.2 miles",
    image: "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1de2d93688?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
    ],
    amenities: ["Wi-Fi included", "CCTV Security"],
    agentId: 103,
    description: "Extremely close to the campus south gate. Ideal for a student looking for a budget-friendly but secure living space."
  },
  {
    id: 5,
    title: "Premium 1-Bedroom Loft",
    type: "1-Bedroom",
    rent: "$750",
    location: "Arts District",
    distance: "1.5 miles",
    image: "https://images.unsplash.com/photo-1502005097973-6a7082348e28?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1502005097973-6a7082348e28?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
    ],
    amenities: ["High Ceilings", "Smart Home", "Gym Access"],
    agentId: 102,
    description: "A gorgeous loft-style apartment featuring high ceilings and smart home integration. Live in luxury while pursuing your studies."
  },
  {
    id: 6,
    title: "Quiet 2-Bedroom House",
    type: "2-Bedroom",
    rent: "$850",
    location: "Suburban Bliss",
    distance: "3.5 miles",
    image: "https://images.unsplash.com/photo-1484154218962-a197022b5858?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1de2d93688?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
    ],
    amenities: ["Garden", "Pet Friendly", "Parking"],
    agentId: 103,
    description: "A bit further from campus but offers unparalleled peace and quiet. Features a small garden and is pet-friendly."
  }
];

const agents = [
  {
    id: 101,
    name: "Sarah Jenkins",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
    rating: 4.8,
    reviews: 124,
    listingsCount: 15,
    whatsapp: "+1234567890",
    email: "sarah@uninest.com"
  },
  {
    id: 102,
    name: "David Chen",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
    rating: 4.9,
    reviews: 89,
    listingsCount: 8,
    whatsapp: "+1987654321",
    email: "david@uninest.com"
  },
  {
    id: 103,
    name: "Aisha Patel",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
    rating: 4.7,
    reviews: 210,
    listingsCount: 22,
    whatsapp: "+1122334455",
    email: "aisha@uninest.com"
  }
];

// Export to window for global access
window.uniData = { properties, agents };
