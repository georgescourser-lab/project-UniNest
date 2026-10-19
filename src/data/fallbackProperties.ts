export interface Property {
  id: number;
  title: string;
  type: string;
  rent: string;
  location: string;
  distance: string;
  image: string;
  images: string[];
  videos?: string[];
  amenities: string[];
  agent_id?: number;
  description: string;
  agents?: {
    id: number;
    name: string;
    image: string;
    listings_count: number;
    whatsapp: string;
  };
}

export const FALLBACK_PROPERTIES: Property[] = [
  {
    id: 1,
    title: "Modern Student Studio near Campus",
    type: "Studio",
    rent: "KSH 22,000",
    location: "Campus North, 5 min walk (KU)",
    distance: "0.5 km",
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1de2d93688?w=800&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80"
    ],
    amenities: ["WiFi Included", "Furnished", "Laundry on-site", "24/7 Security"],
    agent_id: 1,
    description: "A compact, highly modern studio perfect for focused students. Only 5 minutes away from the main campus gates, featuring high-speed optical fiber internet and round-the-clock biometric security.",
    agents: {
      id: 1,
      name: "George Ochieng",
      image: "/images/agent-george.jpg",
      listings_count: 8,
      whatsapp: "+254712345678"
    }
  },
  {
    id: 2,
    title: "Spacious 1-Bedroom Apartment near UoN",
    type: "1 Bedroom",
    rent: "KSH 35,000",
    location: "Westlands District, near UoN",
    distance: "1.2 km",
    image: "https://images.unsplash.com/photo-1502672260266-1c1de2d93688?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1de2d93688?w=800&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80"
    ],
    amenities: ["WiFi Included", "Furnished", "Gym", "Parking"],
    agent_id: 2,
    description: "Enjoy a spacious one-bedroom layout with modern fittings and large private balcony. The complex includes an on-site gym, borehole water backup, and quiet study lounges.",
    agents: {
      id: 2,
      name: "Carilus Odero",
      image: "/images/odero.jpg",
      listings_count: 12,
      whatsapp: "+254798765432"
    }
  },
  {
    id: 3,
    title: "Shared 2-Bedroom Suite near Strathmore",
    type: "2 Bedroom",
    rent: "KSH 48,000",
    location: "Madaraka Hub, near Strathmore",
    distance: "0.8 km",
    image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80"
    ],
    amenities: ["WiFi Included", "Furnished", "Balcony", "Parking", "Pet Friendly"],
    agent_id: 1,
    description: "Perfect for sharing with a roommate! This 2-bedroom suite boasts open-plan living, individual student desks, modern induction cookers, and high-speed Wi-Fi.",
    agents: {
      id: 1,
      name: "George Ochieng",
      image: "/images/agent-george.jpg",
      listings_count: 8,
      whatsapp: "+254712345678"
    }
  },
  {
    id: 4,
    title: "Cozy Campus Bedsitter in Juja (JKUAT)",
    type: "Bedsitter",
    rent: "KSH 14,000",
    location: "Gate C, Juja (JKUAT)",
    distance: "0.3 km",
    image: "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1de2d93688?w=800&q=80"
    ],
    amenities: ["WiFi Included", "24/7 Security", "Water Included"],
    agent_id: 2,
    description: "An affordable, clean, and self-contained bedsitter located right outside Gate C in Juja. Constant water supply and perimeter electric fencing for student safety.",
    agents: {
      id: 2,
      name: "Carilus Odero",
      image: "/images/odero.jpg",
      listings_count: 12,
      whatsapp: "+254798765432"
    }
  }
];
