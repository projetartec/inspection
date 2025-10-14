
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
import { Pencil, Trash2, GripVertical } from 'lucide-react';
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
import { deleteBuildingAction, updateBuildingOrderAction } from '@/lib/actions';
import { DeleteButton } from '@/components/delete-button';
import { InspectionProvider } from '@/hooks/use-inspection-session.tsx';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ClientReportGenerator } from '@/components/client-report-generator';
import { GpsLinkManager } from '@/components/gps-link-manager';

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

  const handleGpsLinkUpdate = (buildingId: string, newLink: string | undefined) => {
    setBuildings(prevBuildings => 
        prevBuildings.map(b => b.id === buildingId ? {...b, gpsLink: newLink} : b)
    );
  }

  const onDragEnd = async (result: any) => {
    const { destination, source } = result;
    if (!destination || destination.index === source.index) {
      return;
    }

    const reorderedBuildings = Array.from(buildings);
    const [removed] = reorderedBuildings.splice(source.index, 1);
    reorderedBuildings.splice(destination.index, 0, removed);

    const originalBuildings = buildings;
    setBuildings(reorderedBuildings);

    try {
      await updateBuildingOrderAction(clientId, reorderedBuildings);
      toast({
        title: 'Ordem atualizada',
        description: 'A nova ordem dos locais foi salva.',
      });
    } catch (error) {
      console.error("Failed to update building order:", error);
      setBuildings(originalBuildings); // Revert on error
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar a nova ordem dos locais.",
      });
    }
  };


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
              <PageHeader title={`Cliente: ${client.name}`} href="/">
                <ClientReportGenerator clientId={clientId} />
              </PageHeader>

              <div className="w-full max-w-2xl mx-auto">
                {buildings.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Selecione um Local</CardTitle>
                      <CardDescription>
                        Escolha um local para gerenciar os equipamentos ou adicione um novo. Arraste e solte para reordenar.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="buildings-list">
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className="flex flex-col gap-2"
                            >
                              {buildings.map((building, index) => (
                                <Draggable key={building.id} draggableId={building.id} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className={`flex items-center p-2 rounded-lg border ${snapshot.isDragging ? 'bg-muted' : ''}`}
                                    >
                                      <div {...provided.dragHandleProps} className="p-2 cursor-grab text-muted-foreground">
                                        <GripVertical className="h-5 w-5" />
                                      </div>
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
                                        <GpsLinkManager 
                                            clientId={client.id}
                                            building={building}
                                            onUpdate={handleGpsLinkUpdate}
                                        />
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
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </DragDropContext>
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
