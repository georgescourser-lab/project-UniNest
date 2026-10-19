const properties = [
  {
    id: 1,
    title: "Modern Student Studio",
    type: "Bedsitter",
    rent: "KSH 45,000",
    location: "Campus North, 5 min walk",
    distance: "0.8 km",
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
    rent: "KSH 65,000",
    location: "Westside District",
    distance: "1.9 km",
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
    rent: "KSH 80,000",
    location: "Downtown Hub",
    distance: "3.2 km",
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
    rent: "KSH 38,000",
    location: "South Gate Area",
    distance: "0.3 km",
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
    rent: "KSH 75,000",
    location: "Arts District",
    distance: "2.4 km",
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
    rent: "KSH 85,000",
    location: "Suburban Bliss",
    distance: "5.6 km",
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

const marketplaceItems = [
  {
    id: 1,
    title: "Ramtons 90L Single-Door Mini Fridge",
    category: "Appliances",
    price: "Ksh 11,500",
    originalPrice: "Ksh 16,800",
    condition: "Like New",
    campus: "KU",
    campusName: "Kenyatta University (KU)",
    location: "KU Gate B Landmark, Ruiru",
    image: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    sellerType: "Verified Student Listing",
    listingRef: "UN-MKT-101",
    agentId: 1,
    agentName: "Sarah Jenkins (KU Partner Agent)",
    description: "Ramtons 90L compact fridge purchased 8 months ago. Extremely energy-efficient, whisper-quiet for study rooms, with ice tray compartment. Inspection coordinated by UniNest agent.",
    verifiedListing: true,
    postedAt: "2 days ago"
  },
  {
    id: 2,
    title: "Wooden Study Desk + Ergonomic Swivel Chair",
    category: "Furniture",
    price: "Ksh 5,200",
    originalPrice: "Ksh 9,500",
    condition: "Gently Used",
    campus: "JKUAT",
    campusName: "JKUAT Main Campus",
    location: "Gate C Area, Juja",
    image: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    sellerType: "Verified Student Listing",
    listingRef: "UN-MKT-102",
    agentId: 2,
    agentName: "David Kimani (JKUAT Partner Agent)",
    description: "Solid hardwood study desk with drawer and breathable ergonomic mesh swivel chair. Clean, sturdy, and ideal for bedsitter study nooks. Inspection arranged via agent.",
    verifiedListing: true,
    postedAt: "Just now"
  },
  {
    id: 3,
    title: "6kg Gas Cylinder + Burner & Heavy Duty Grill",
    category: "Kitchen",
    price: "Ksh 3,400",
    originalPrice: "Ksh 5,500",
    condition: "Like New",
    campus: "UoN",
    campusName: "University of Nairobi (UoN)",
    location: "Chiromo Campus Vicinity",
    image: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    sellerType: "Verified Student Listing",
    listingRef: "UN-MKT-103",
    agentId: 3,
    agentName: "Brian Omondi (UoN Partner Agent)",
    description: "Complete 6kg gas cylinder with burner and stainless steel safety grill. Inspected and verified safe with zero leaks. Handover managed by authorized agent.",
    verifiedListing: true,
    postedAt: "Yesterday"
  },
  {
    id: 4,
    title: "Casio fx-991EX ClassWiz Calculator + A3 Drawing Kit",
    category: "Academic",
    price: "Ksh 2,600",
    originalPrice: "Ksh 4,800",
    condition: "Like New",
    campus: "Strathmore",
    campusName: "Strathmore University",
    location: "Madaraka Campus Gate Area",
    image: "https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    sellerType: "Verified Student Listing",
    listingRef: "UN-MKT-104",
    agentId: 4,
    agentName: "Aisha Mohamed (Strathmore Partner Agent)",
    description: "Genuine high-speed solar ClassWiz fx-991EX calculator in protective case, plus technical drawing set (T-square, compass, scales). Excellent condition.",
    verifiedListing: true,
    postedAt: "3 days ago"
  },
  {
    id: 5,
    title: "High-Density Orthopedic 4x6 Quilted Mattress",
    category: "Bedding",
    price: "Ksh 5,800",
    originalPrice: "Ksh 10,200",
    condition: "Gently Used",
    campus: "USIU",
    campusName: "USIU Africa",
    location: "USIU Road Perimeter",
    image: "https://images.unsplash.com/photo-1582582621959-48d27397dc69?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    sellerType: "Verified Student Listing",
    listingRef: "UN-MKT-105",
    agentId: 1,
    agentName: "Sarah Jenkins (USIU/KU Area Agent)",
    description: "6-inch thick premium high-density quilted mattress. Kept inside a waterproof protector since purchase. Clean, firm back support, no tears. Agent-accompanied inspection.",
    verifiedListing: true,
    postedAt: "4 days ago"
  },
  {
    id: 6,
    title: "20L Digital Microwave Oven (Russell Hobbs)",
    category: "Appliances",
    price: "Ksh 4,900",
    originalPrice: "Ksh 8,500",
    condition: "Good Condition",
    campus: "Daystar",
    campusName: "Daystar University",
    location: "Valley Road / Ngong Rd Hub",
    image: "https://images.unsplash.com/photo-1585659722983-3a675dabf23d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    sellerType: "Verified Student Listing",
    listingRef: "UN-MKT-106",
    agentId: 3,
    agentName: "Brian Omondi (CBD / Valley Rd Agent)",
    description: "20-litre microwave with digital controls, express reheat, defrost mode, and turntable glass plate. Tested and verified working by our agent.",
    verifiedListing: true,
    postedAt: "5 days ago"
  },
  {
    id: 7,
    title: "University Textbook Bundle: Calculus, Economics & Notes",
    category: "Academic",
    price: "Ksh 2,200",
    originalPrice: "Ksh 6,000",
    condition: "Good Condition",
    campus: "UoN",
    campusName: "University of Nairobi (UoN)",
    location: "CBD Campus Meeting Point",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    sellerType: "Verified Student Listing",
    listingRef: "UN-MKT-107",
    agentId: 3,
    agentName: "Brian Omondi (UoN Partner Agent)",
    description: "Bundle of 3 essential coursebooks: Calculus 8th Edition, Principles of Microeconomics, plus bound revision past papers with handwritten solutions.",
    verifiedListing: true,
    postedAt: "6 days ago"
  },
  {
    id: 8,
    title: "4-Tier Metal Shoe Rack + Modular Wardrobe",
    category: "Furniture",
    price: "Ksh 2,800",
    originalPrice: "Ksh 4,500",
    condition: "Like New",
    campus: "MKU",
    campusName: "Mount Kenya University (MKU)",
    location: "Thika Main Campus Hub",
    image: "https://images.unsplash.com/photo-1558997519-83ea9252edf8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    sellerType: "Verified Student Listing",
    listingRef: "UN-MKT-108",
    agentId: 2,
    agentName: "David Kimani (Thika Corridor Agent)",
    description: "Anti-rust coated 4-tier shoe stand and zippered fabric wardrobe. Easy to assemble without tools. Holds up to 16 pairs of shoes plus hanging clothes.",
    verifiedListing: true,
    postedAt: "1 week ago"
  }
];

// Export to window for global access
window.uniData = { properties, agents, marketplaceItems };
