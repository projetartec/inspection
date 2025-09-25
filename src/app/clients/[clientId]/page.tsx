
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { getClientById, getBuildingsByClient } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BuildingForm } from '@/components/building-form';
import { Sidebar, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { MobileNav } from '@/components/mobile-nav';
import type { Building, Client } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { deleteBuildingAction } from '@/lib/actions';
import { DeleteButton } from '@/components/delete-button';
import { InspectionProvider } from '@/hooks/use-inspection-session.tsx';

export default function ClientPage() {
  const params = useParams() as { clientId: string };
  const clientId = params.clientId;

  const [client, setClient] = useState<Client | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchClientAndBuildings = async () => {
    setIsLoading(true);
    try {
      const [clientData, buildingsData] = await Promise.all([
        getClientById(clientId),
        getBuildingsByClient(clientId),
      ]);

      if (!clientData) {
        notFound();
        return;
      }

      setClient(clientData);
      setBuildings(buildingsData);
    } catch (error) {
      console.error('Falha ao buscar dados do cliente e locais:', error);
      toast({
        variant: 'destructive',
        title: 'Erro de Conexão',
        description: 'Não foi possível buscar os dados. Verifique sua conexão.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchClientAndBuildings();
    }
  }, [clientId]);

  const handleDeleteSuccess = (deletedBuildingId: string) => {
    setBuildings(prevBuildings =>
      prevBuildings.filter(building => building.id !== deletedBuildingId)
    );
    toast({
      title: 'Sucesso!',
      description: 'Local deletado com sucesso.',
    });
  };

  const handleCreateSuccess = () => {
    fetchClientAndBuildings();
  }

  if (isLoading || !client) {
    return (
      <SidebarProvider>
        <Sidebar>
          <MainNav />
        </Sidebar>
        <SidebarInset>
          <main className="p-4 sm:p-6 lg:p-8">
            <PageHeader title="Carregando..." />
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <InspectionProvider>
      <SidebarProvider>
        <Sidebar>
          <MainNav />
        </Sidebar>
        <SidebarInset>
          <main className="p-4 sm:p-6 lg:p-8">
            <div className="space-y-8">
              <PageHeader title={`Cliente: ${client.name}`} href="/" />

              <div className="w-full max-w-2xl mx-auto">
                {buildings.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Selecione um Local</CardTitle>
                      <CardDescription>
                        Escolha um local para gerenciar os equipamentos ou adicione um novo.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                      {buildings.map(building => (
                        <div
                          key={building.id}
                          className="flex items-center justify-between p-2 rounded-lg border"
                        >
                          <Button
                            asChild
                            variant="link"
                            className="justify-start flex-grow text-lg p-0"
                          >
                            <Link href={`/clients/${client.id}/${building.id}/dashboard`}>
                              {building.name}
                            </Link>
                          </Button>
                          <div className="flex items-center space-x-1">
                            <Button asChild variant="ghost" size="icon">
                              <Link href={`/clients/${client.id}/${building.id}/edit`}>
                                <Pencil className="h-5 w-5" />
                                <span className="sr-only">Editar Local</span>
                              </Link>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-5 w-5" />
                                  <span className="sr-only">Deletar Local</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação não pode ser desfeita. Isso irá deletar
                                      permanentemente o local{' '}
                                      <span className="font-bold">{building.name}</span> e
                                      todos os seus equipamentos.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <DeleteButton
                                        action={() => deleteBuildingAction(client.id, building.id)}
                                        onSuccess={() => handleDeleteSuccess(building.id)}
                                      />
                                  </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="text-center">
                    <CardHeader>
                      <CardTitle>Nenhum Local Cadastrado</CardTitle>
                      <CardDescription>
                        Comece adicionando seu primeiro local (prédio) para este cliente.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                )}

                <div className="mt-8">
                  <BuildingForm clientId={client.id} onSuccess={handleCreateSuccess} />
                </div>
              </div>
            </div>
          </main>
          <div className="h-16 md:hidden" /> {/* Spacer for mobile nav */}
          <MobileNav />
        </SidebarInset>
      </SidebarProvider>
    </InspectionProvider>
  );
}

