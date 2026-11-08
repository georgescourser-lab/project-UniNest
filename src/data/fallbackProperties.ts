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

export const FALLBACK_PROPERTIES: Property[] = [];
