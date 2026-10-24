export interface MarketplaceItem {
  id: number;
  title: string;
  category: string;
  price: string;
  originalPrice?: string;
  condition: 'Like New' | 'Gently Used' | 'Good Condition' | string;
  campus: string;
  campusName: string;
  location: string;
  image: string;
  sellerType: string;
  listingRef: string;
  agentName?: string;
  description: string;
  verifiedListing: boolean;
  postedAt: string;
}

export const MARKETPLACE_ITEMS: MarketplaceItem[] = [
  {
    id: 1,
    title: "Ramtons 90L Single-Door Mini Fridge",
    category: "Appliances",
    price: "Ksh 11,500",
    originalPrice: "Ksh 16,000",
    condition: "Like New",
    campus: "KU",
    campusName: "Kenyatta University (KU)",
    location: "KM Area, KU Main Campus",
    image: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    sellerType: "Verified Student Listing",
    listingRef: "UN-MKT-101",
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
    agentName: "Brian Omondi (CBD / Valley Rd Agent)",
    description: "20-litre microwave with digital controls, express reheat, defrost mode, and turntable glass plate. Tested and verified working by our agent.",
    verifiedListing: true,
    postedAt: "5 days ago"
  }
];
