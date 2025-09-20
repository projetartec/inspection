'use client';

import Link from "next/link";
import React, { useState, useEffect } from 'react';
import { notFound } from "next/navigation";
import { getClientById } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BuildingForm } from "@/components/building-form";
import { Sidebar, SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { MainNav } from "@/components/main-nav";
import { MobileNav } from "@/components/mobile-nav";
import type { Client } from "@/lib/types";

export default function ClientPage({ params }: { params: { clientId: string } }) {
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchClient() {
      const clientData = await getClientById(params.clientId);
      setClient(clientData);
      setIsLoading(false);
    }
    fetchClient();
  }, [params.clientId]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-full min-h-screen">Carregando...</div>;
  }
  
  if (!client) {
    notFound();
  }

  return (
     <SidebarProvider>
      <Sidebar>
        <MainNav />
      </Sidebar>
      <SidebarInset>
        <main className="p-4 sm:p-6 lg:p-8">
            <div className="space-y-8">
            <PageHeader title={`Cliente: ${client.name}`} href="/" />
            
            <div className="w-full max-w-2xl mx-auto">
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
            </div>
            </div>
        </main>
        <div className="h-16 md:hidden" /> {/* Spacer for mobile nav */}
        <MobileNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
