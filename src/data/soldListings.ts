export interface SoldListing {
  id: string;
  title: string;
  kind: 'house' | 'item';
  subCategory: string; // e.g. 'Bedsitter', '1 Bedroom', 'Studio', 'Appliances', 'Furniture', etc.
  price: string;
  originalPrice?: string;
  campus: string;
  campusName: string;
  location: string;
  image: string;
  listingRef: string;
  agentName: string;
  soldAt: string;
  description: string;
  amenitiesOrCondition?: string[];
}

export const INITIAL_SOLD_LISTINGS: SoldListing[] = [];
