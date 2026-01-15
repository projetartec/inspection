import { notFound } from 'next/navigation';
import { getBuildingById } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { BuildingForm } from '@/components/building-form';
import { Sidebar, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { MobileNav } from '@/components/mobile-nav';

export default async function EditBuildingPage({ params }: { params: { clientId: string, buildingId: string } }) {
  const { clientId, buildingId } = params;
  const building = await getBuildingById(buildingId);

  if (!building) {
    notFound();
  }

  return (
    <SidebarProvider>
        <Sidebar>
            <MainNav />
        </Sidebar>
        <SidebarInset>
             <main className="p-4 sm:p-6 lg:p-8">
                <PageHeader title={`Editar Local: ${building.name}`} href={`/clients/${clientId}`} />
                <div className="w-full max-w-2xl mx-auto mt-8">
                    <BuildingForm clientId={clientId} building={building} />
                </div>
            </main>
             <div className="h-16 md:hidden" /> {/* Spacer for mobile nav */}
            <MobileNav />
        </SidebarInset>
    </SidebarProvider>
  );
}
