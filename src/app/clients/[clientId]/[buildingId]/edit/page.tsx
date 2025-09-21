import { notFound } from 'next/navigation';
import { getBuildingById } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { BuildingForm } from '@/components/building-form';

export default async function EditBuildingPage({ params }: { params: { clientId: string, buildingId: string } }) {
  const { clientId, buildingId } = params;
  const building = await getBuildingById(clientId, buildingId);

  if (!building) {
    notFound();
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <PageHeader title={`Editar Local: ${building.name}`} href={`/clients/${clientId}`} />
      <main className="w-full max-w-2xl mx-auto mt-8">
        <BuildingForm clientId={clientId} building={building} />
      </main>
    </div>
  );
}
