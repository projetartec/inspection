import { notFound } from 'next/navigation';
import { getClientById } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { ClientForm } from '@/components/client-form';
import { Sidebar, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';

export default async function EditClientPage({ params }: { params: { clientId: string } }) {
  const { clientId } = params;
  const client = await getClientById(clientId);

  if (!client) {
    notFound();
  }

  return (
    <SidebarProvider>
        <Sidebar>
            <MainNav />
        </Sidebar>
        <SidebarInset>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <PageHeader title={`Editar Cliente: ${client.name}`} href="/" />
                <main className="w-full max-w-2xl mx-auto mt-8">
                    <ClientForm client={client} />
                </main>
            </div>
        </SidebarInset>
    </SidebarProvider>
  );
}
