import { getSoldPropertiesArchive } from '@/app/actions/propertyActions';
import SoldCatalogClient from './SoldCatalogClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Sold Houses & Items | UniNest',
  description: 'View all student houses leased and marketplace items sold through verified UniNest campus agents.',
};

export default async function SoldPage() {
  const serverSoldHouses = await getSoldPropertiesArchive();

  return <SoldCatalogClient serverSoldHouses={serverSoldHouses} />;
}

