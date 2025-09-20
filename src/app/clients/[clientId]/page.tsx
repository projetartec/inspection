import Link from "next/link";
import { notFound } from "next/navigation";
import { getClientById } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BuildingForm } from "@/components/building-form";

export default async function ClientPage({ params }: { params: { clientId: string } }) {
  const client = await getClientById(params.clientId);

  if (!client) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader title={`Cliente: ${client.name}`} href="/" />
      
      <main className="w-full max-w-2xl mx-auto">
        {client.buildings.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Selecione um Local</CardTitle>
              <CardDescription>Escolha um local para gerenciar os equipamentos.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {client.buildings.map((building) => (
                <Button key={building.id} asChild variant="outline" size="lg" className="justify-start">
                  <Link href={`/clients/${client.id}/${building.id}/dashboard`}>{building.name}</Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card className="text-center">
            <CardHeader>
              <CardTitle>Nenhum Local Cadastrado</CardTitle>
              <CardDescription>Comece adicionando seu primeiro local (prédio) para este cliente.</CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="mt-8">
          <BuildingForm clientId={client.id} />
        </div>
      </main>
    </div>
  );
}
