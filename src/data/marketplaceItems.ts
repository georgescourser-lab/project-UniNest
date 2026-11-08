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

export const MARKETPLACE_ITEMS: MarketplaceItem[] = [];
