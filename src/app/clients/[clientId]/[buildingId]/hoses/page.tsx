
'use client';

import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { PlusCircle, Pencil, Trash2, QrCode, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { getHosesByBuilding, getBuildingById } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteHoseAction, updateEquipmentOrderAction } from "@/lib/actions";
import { QrCodeDialog } from "@/components/qr-code-dialog";
import type { Hydrant } from '@/lib/types';
import { DeleteButton } from "@/components/delete-button";
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { notFound, useParams } from 'next/navigation';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

function TableSkeleton() {
  return (
    Array(3).fill(0).map((_, index) => (
      <TableRow key={index}>
        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
        <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end space-x-1 md:space-x-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </TableCell>
      </TableRow>
    ))
  );
}

export default function HosesPage() {
  const params = useParams() as { clientId: string, buildingId: string };
  const { clientId, buildingId } = params;
  const [hoses, setHoses] = useState<Hydrant[]>([]);
  const [buildingName, setBuildingName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
        if (!clientId || !buildingId) return;

        try {
            setIsLoading(true);
            const [building, data] = await Promise.all([
                getBuildingById(buildingId),
                getHosesByBuilding(buildingId)
            ]);

            if (!building) {
                notFound();
                return;
            }
            setBuildingName(building.name);
            setHoses(data);
        } catch (error) {
            console.error("Failed to fetch hoses:", error);
            toast({ variant: 'destructive', title: 'Erro de Conexão', description: 'Não foi possível buscar os hidrantes.' });
        } finally {
            setIsLoading(false);
        }
    }
    fetchData();
  }, [clientId, buildingId, toast]);

  const handleDeleteSuccess = (deletedUid: string) => {
    setHoses(prev => prev.filter(h => h.uid !== deletedUid));
    toast({
        title: "Sucesso!",
        description: "Hidrante deletado com sucesso."
    });
  };

  const onDragEnd = async (result: any) => {
    const { destination, source } = result;
    if (!destination) return;
    if (destination.index === source.index) return;

    const reorderedHoses = Array.from(hoses);
    const [removed] = reorderedHoses.splice(source.index, 1);
    reorderedHoses.splice(destination.index, 0, removed);
    
    // Optimistic UI update
    setHoses(reorderedHoses);

    try {
        await updateEquipmentOrderAction(clientId, buildingId, 'hoses', reorderedHoses);
    } catch (error) {
        console.error("Failed to update order:", error);
        // Revert on error
        setHoses(hoses);
        toast({
            variant: "destructive",
            title: "Erro",
            description: "Não foi possível salvar a nova ordem.",
        });
    }
  };

  const pageTitle = isLoading ? "Carregando..." : `Hidrantes - ${buildingName}`;

  return (
    <>
      <PageHeader title={pageTitle}>
        <Button asChild>
          <Link href={`/clients/${clientId}/${buildingId}/hoses/new`}>
            <PlusCircle className="mr-2" />
            Adicionar Hidrante
          </Link>
        </Button>
      </PageHeader>
      <Card>
        <CardHeader>
            <CardTitle>Hidrantes Registrados</CardTitle>
            <CardDescription>Uma lista de todos os hidrantes neste local. Arraste e solte para reordenar.</CardDescription>
        </CardHeader>
        <CardContent>
          <DragDropContext onDragEnd={onDragEnd}>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>Local</TableHead>
                        <TableHead className="hidden md:table-cell">Tipo</TableHead>
                        <TableHead className="hidden md:table-cell">Diâmetro</TableHead>
                        <TableHead className="hidden lg:table-cell">Medida</TableHead>
                        <TableHead className="hidden lg:table-cell">Próx. Teste Hidr.</TableHead>
                        <TableHead><span className="sr-only">Ações</span></TableHead>
                    </TableRow>
                </TableHeader>
                <Droppable droppableId="hoses-list" direction="vertical">
                    {(provided) => (
                      <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                          {isLoading ? (
                              <TableSkeleton />
                          ) : hoses.length > 0 ? hoses.map((hose, index) => (
                            <Draggable key={hose.uid} draggableId={hose.uid} index={index}>
                                {(provided, snapshot) => {
                                    const dateValue = hose.hydrostaticTestDate ? parseISO(hose.hydrostaticTestDate) : null;
                                    const isValidDate = dateValue && !isNaN(dateValue.getTime());
                                    
                                    return (
                                    <TableRow 
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={snapshot.isDragging ? "bg-muted" : ""}
                                    >
                                        <TableCell className="text-muted-foreground cursor-grab">
                                          <GripVertical />
                                        </TableCell>
                                        <TableCell className="font-medium">
                                          <Link href={`/clients/${clientId}/${buildingId}/hoses/${hose.uid}`} className="hover:underline">{hose.id}</Link>
                                        </TableCell>
                                        <TableCell>{hose.location}</TableCell>
                                        <TableCell className="hidden md:table-cell">Tipo {hose.hoseType}</TableCell>
                                        <TableCell className="hidden md:table-cell">{hose.diameter}"</TableCell>
                                        <TableCell className="hidden lg:table-cell">{hose.hoseLength}m</TableCell>
                                        <TableCell className="hidden lg:table-cell">{isValidDate ? format(dateValue, 'dd/MM/yyyy', { locale: ptBR }) : 'Data inválida'}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end space-x-1 md:space-x-2">
                                                <Button asChild variant="ghost" size="icon" className="h-10 w-10 md:h-8 md:w-8">
                                                    <Link href={`/clients/${clientId}/${buildingId}/hoses/${hose.uid}/edit`}>
                                                        <Pencil className="h-5 w-5 md:h-4 md:w-4" />
                                                        <span className="sr-only">Editar</span>
                                                    </Link>
                                                </Button>
                                                
                                                <AlertDialog>
                                                  <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-10 w-10 md:h-8 md:w-8">
                                                        <Trash2 className="h-5 w-5 md:h-4 md:w-4" />
                                                        <span className="sr-only">Deletar</span>
                                                    </Button>
                                                  </AlertDialogTrigger>
                                                  <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Esta ação não pode ser desfeita. Isso irá deletar permanentemente o hidrante{' '}
                                                        <span className="font-bold">{hose.id}</span>.
                                                    </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <DeleteButton action={() => deleteHoseAction(clientId, buildingId, hose.uid)} onSuccess={() => handleDeleteSuccess(hose.uid)} />
                                                    </AlertDialogFooter>
                                                  </AlertDialogContent>
                                                </AlertDialog>

                                                <QrCodeDialog value={hose.qrCodeValue} label={hose.id}>
                                                    <Button variant="ghost" size="icon" className="h-10 w-10 md:h-8 md:w-8">
                                                        <QrCode className="h-5 w-5 md:h-4 md:w-4" />
                                                        <span className="sr-only">Ver QR Code</span>
                                                    </Button>
                                                </QrCodeDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    );
                                }}
                            </Draggable>
                          )) : (
                              <TableRow>
                                  <TableCell colSpan={8} className="text-center h-24">
                                      Nenhum hidrante encontrado.
                                  </TableCell>
                              </TableRow>
                          )}
                          {provided.placeholder}
                      </TableBody>
                    )}
                </Droppable>
            </Table>
          </DragDropContext>
        </CardContent>
      </Card>
    </>
  );
}
