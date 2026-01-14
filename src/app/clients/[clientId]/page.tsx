

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BuildingForm } from '@/components/building-form';
import type { Building, Client } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2, GripVertical, X, Loader2 } from 'lucide-react';
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
import { GpsLinkManager } from '@/components/gps-link-manager';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { isSameMonth, isSameYear, parseISO } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ClientPage() {
  const params = useParams() as { clientId: string };
  const clientId = params.clientId;
  const router = useRouter();

  const [client, setClient] = useState<Client | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filteredBuildings, setFilteredBuildings] = useState<Building[]>([]);
  const [showNotInspectedOnly, setShowNotInspectedOnly] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    
    const docRef = doc(db, "clients", clientId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const clientData = docSnap.data();
            const buildingsData = clientData.buildings || [];
            
            setClient({
                id: docSnap.id,
                name: clientData.name,
                ...clientData
            } as Client);
            setBuildings(buildingsData);
        } else {
            toast({ variant: 'destructive', title: 'Erro', description: 'Cliente não encontrado.' });
            notFound();
        }
        setIsLoading(false);
    }, (error) => {
        console.error("Falha ao buscar dados do cliente em tempo real:", error);
        toast({
          variant: 'destructive',
          title: 'Erro de Conexão',
          description: 'Não foi possível buscar os dados do cliente.'
        });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [clientId, toast]);
  
  useEffect(() => {
    let results = buildings;

    if (searchTerm) {
        results = results.filter(building =>
            building.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    if (showNotInspectedOnly) {
        const today = new Date();
        results = results.filter(building => {
            const lastInspectedDate = building.lastInspected ? parseISO(building.lastInspected) : null;
            return !(lastInspectedDate && isSameMonth(lastInspectedDate, today) && isSameYear(lastInspectedDate, today));
        });
    }
    
    setFilteredBuildings(results);
  }, [searchTerm, buildings, showNotInspectedOnly]);


  const handleDeleteSuccess = (deletedBuildingId: string) => {
    // A UI vai atualizar sozinha com o onSnapshot
    toast({
      title: 'Sucesso!',
      description: 'Local deletado com sucesso.',
    });
  };

  const handleCreateSuccess = async () => {
    // A UI vai atualizar sozinha com o onSnapshot
    toast({
        title: "Sucesso!",
        description: "Local criado com sucesso."
    });
  };

  const handleGpsLinkUpdate = (buildingId: string, newLink: string | undefined) => {
    // A UI vai atualizar sozinha com o onSnapshot
  }

  const onDragEnd = async (result: any) => {
    const { destination, source } = result;
    if (!destination || destination.index === source.index) {
      return;
    }

    const reorderedBuildings = Array.from(filteredBuildings);
    const [removed] = reorderedBuildings.splice(source.index, 1);
    reorderedBuildings.splice(destination.index, 0, removed);
    
    // Optimistic UI update
    setFilteredBuildings(reorderedBuildings);

    const buildingIdOrder = reorderedBuildings.map(b => b.id);
    
    // Create the new master order based on the filtered drag and drop
    const newMasterOrder = [...buildings].sort((a,b) => {
        let indexA = buildingIdOrder.indexOf(a.id);
        let indexB = buildingIdOrder.indexOf(b.id);
        // Put non-filtered items at the end
        if (indexA === -1) indexA = Infinity;
        if (indexB === -1) indexB = Infinity;
        return indexA - indexB;
    })
    
    try {
      await updateBuildingOrderAction(clientId, newMasterOrder);
    } catch (error) {
      console.error("Failed to update building order:", error);
      // Revert optimistic update on error
      setFilteredBuildings(filteredBuildings); 
      toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível salvar a nova ordem."
      })
    }
  };


  if (isLoading || !client) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        <PageHeader title={`Cliente: ${client.name}`} href="/" />

        <div className="w-full max-w-2xl mx-auto">
          <Card>
              <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div>
                          <CardTitle>Selecione um Local</CardTitle>
                          <CardDescription className="mt-1">
                              Escolha um local para gerenciar ou adicione um novo. Arraste para reordenar.
                          </CardDescription>
                      </div>
                      <div className="flex flex-col gap-2 w-full max-w-xs">
                          <div className="relative">
                              <Input 
                                  type="text"
                                  placeholder="Buscar local..."
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  className="h-9 pr-8"
                              />
                              {searchTerm && (
                                  <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                                      onClick={() => setSearchTerm('')}
                                  >
                                      <X className="h-4 w-4" />
                                      <span className="sr-only">Limpar busca</span>
                                  </Button>
                              )}
                          </div>
                           <div className="flex items-center space-x-2 self-end">
                              <Label htmlFor="ni-filter" className="font-semibold text-xs text-muted-foreground">Pendente</Label>
                              <Switch id="ni-filter" checked={showNotInspectedOnly} onCheckedChange={setShowNotInspectedOnly} />
                          </div>
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
                          {filteredBuildings.map((building, index) => {
                            const today = new Date();
                            const lastInspectedDate = building.lastInspected ? parseISO(building.lastInspected) : null;
                            const wasInspectedThisMonth = lastInspectedDate 
                                ? isSameMonth(lastInspectedDate, today) && isSameYear(lastInspectedDate, today)
                                : false;
                            
                            const statusColor = wasInspectedThisMonth ? "bg-green-500" : "bg-red-500";
                            const statusTitle = wasInspectedThisMonth ? "Inspecionado este mês" : "Inspeção pendente este mês";

                            return (
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

                                   <div 
                                      className={cn(
                                          "h-3 w-3 rounded-full mr-3 flex-shrink-0",
                                          statusColor
                                      )}
                                      title={statusTitle}
                                  />
                                  
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
                          )})}
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
