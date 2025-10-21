
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { getClientById, getBuildingsByClient } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BuildingForm } from '@/components/building-form';
import type { Building, Client } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2, GripVertical, Search } from 'lucide-react';
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
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ClientReportGenerator } from '@/components/client-report-generator';
import { GpsLinkManager } from '@/components/gps-link-manager';
import { Input } from '@/components/ui/input';

export default function ClientPage() {
  const params = useParams() as { clientId: string };
  const clientId = params.clientId;

  const [client, setClient] = useState<Client | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filteredBuildings, setFilteredBuildings] = useState<Building[]>([]);

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
      setFilteredBuildings(buildingsData);
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
  
  useEffect(() => {
    const results = buildings.filter(building =>
        building.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredBuildings(results);
  }, [searchTerm, buildings]);


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

    const reorderedBuildings = Array.from(filteredBuildings);
    const [removed] = reorderedBuildings.splice(source.index, 1);
    reorderedBuildings.splice(destination.index, 0, removed);
    
    setFilteredBuildings(reorderedBuildings);

    // Update the master list
    const buildingMap = new Map(buildings.map(b => [b.id, b]));
    const newMasterOrder = reorderedBuildings.map(b => buildingMap.get(b.id)).concat(
        buildings.filter(b => !reorderedBuildings.find(rb => rb.id === b.id))
    ).filter((b): b is Building => b !== undefined);

    setBuildings(newMasterOrder);
    
    try {
      await updateBuildingOrderAction(clientId, newMasterOrder);
      toast({
        title: 'Ordem atualizada',
        description: 'A nova ordem dos locais foi salva.',
      });
    } catch (error) {
      console.error("Failed to update building order:", error);
      fetchClientAndBuildings(); // Revert on error by refetching
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar a nova ordem dos locais.",
      });
    }
  };


  if (isLoading || !client) {
    return <PageHeader title="Carregando..." />;
  }

  return (
    <>
      <div className="space-y-8">
        <PageHeader title={`Cliente: ${client.name}`} href="/" />

        <div className="flex flex-wrap items-center justify-center gap-2 p-4 border-b">
          <ClientReportGenerator clientId={clientId} />
        </div>

        <div className="w-full max-w-2xl mx-auto">
          <Card>
              <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                          <CardTitle>Selecione um Local</CardTitle>
                          <CardDescription className="mt-1">
                              Escolha um local para gerenciar ou adicione um novo. Arraste para reordenar.
                          </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                          <Input 
                              type="text"
                              placeholder="Buscar local..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="h-9 max-w-xs"
                          />
                      </div>
                  </div>
              </CardHeader>
              <CardContent>
                {filteredBuildings.length > 0 ? (
                  <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="buildings-list">
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="flex flex-col gap-2"
                        >
                          {filteredBuildings.map((building, index) => (
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
                                    className="justify-start flex-grow text-lg p-0 overflow-hidden"
                                  >
                                    <Link href={`/clients/${client.id}/${building.id}/dashboard`} className="truncate">
                                      {building.name}
                                    </Link>
                                  </Button>
                                  <div className="flex items-center space-x-1 flex-shrink-0">
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
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                      {searchTerm ? `Nenhum local encontrado para "${searchTerm}".` : "Nenhum local cadastrado."}
                  </div>
                )}
              </CardContent>
            </Card>
          

          <div className="mt-8">
            <BuildingForm clientId={client.id} onSuccess={handleCreateSuccess} />
          </div>
        </div>
      </div>
    </>
  );
}
