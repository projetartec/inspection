import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { getClients } from "@/lib/data";
import { AppLogo } from "@/components/app-logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClientForm } from "@/components/client-form";

export default async function Home() {
  const clients = await getClients();

  return (
    <div className="min-h-screen container mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center">
      <header className="mb-12">
        <AppLogo />
      </header>

      <main className="w-full max-w-2xl">
        {clients.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Selecione um Cliente</CardTitle>
              <CardDescription>Escolha um cliente para gerenciar os locais e equipamentos.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {clients.map((client) => (
                <Button key={client.id} asChild variant="outline" size="lg" className="justify-start">
                  <Link href={`/clients/${client.id}`}>{client.name}</Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card className="text-center">
            <CardHeader>
              <CardTitle>Bem-vindo ao FireGuard Inspector</CardTitle>
              <CardDescription>Nenhum cliente foi cadastrado ainda. Comece adicionando seu primeiro cliente.</CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="mt-8">
            <ClientForm />
        </div>
      </main>
    </div>
  );
}
