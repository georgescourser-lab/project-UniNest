import { getSoldPropertiesArchive } from '@/app/actions/propertyActions';
import { getCloudDatabase } from '@/lib/cloudStore';
import { SoldListing } from '@/data/soldListings';
import SoldCatalogClient from './SoldCatalogClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Sold Houses & Items | UniNest',
  description: 'View all student houses leased and marketplace items sold through verified UniNest campus agents.',
};

export default async function SoldPage() {
  const [serverSoldHouses, db] = await Promise.all([
    getSoldPropertiesArchive(),
    getCloudDatabase(),
  ]);

  const serverSoldItems: SoldListing[] = (db.marketplace || [])
    .filter((item) => item.status === 'Sold')
    .map((item) => ({
      id: `cloud-sold-${item.listingRef || item.id}`,
      title: item.title,
      kind: 'item' as const,
      subCategory: item.category || 'Marketplace Item',
      price: item.price,
      campus: item.campus,
      campusName: item.campusName || item.campus,
      location: item.location,
      image: item.image,
      listingRef: item.listingRef || `UN-SOLD-${item.id}`,
      agentName: item.assignedAgentName || 'Verified UniNest Agent',
      soldAt: 'Sold',
      description: item.description,
      amenitiesOrCondition: [item.condition || 'Verified Listing', 'Agent Handover ✓'],
    }));

  return (
    <SoldCatalogClient
      serverSoldHouses={serverSoldHouses}
      serverSoldItems={serverSoldItems}
    />
  );
}

