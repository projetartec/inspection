
'use client';

import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { PlusCircle, Pencil, Trash2, QrCode, GripVertical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { getExtinguishersByBuilding, getBuildingById } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { deleteExtinguisherAction, updateEquipmentOrderAction } from "@/lib/actions";
import { QrCodeDialog } from "@/components/qr-code-dialog";
import type { Extinguisher } from '@/lib/types';
import { DeleteButton } from '@/components/delete-button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { notFound, useParams } from 'next/navigation';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

function TableSkeleton() {
  return (
    Array(3).fill(0).map((_, index) => (
      <TableRow key={index}>
        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-10" /></TableCell>
        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
        <TableCell><Skeleton className="h-4 w-24 hidden md:table-cell" /></TableCell>
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

export default function ExtinguishersPage() {
  const params = useParams() as { clientId: string, buildingId: string };
  const { clientId, buildingId } = params;
  const [extinguishers, setExtinguishers] = useState<Extinguisher[]>([]);
  const [buildingName, setBuildingName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
        if (!clientId || !buildingId) return;

        try {
            setIsLoading(true);
            const [building, data] = await Promise.all([
                getBuildingById(clientId, buildingId),
                getExtinguishersByBuilding(clientId, buildingId)
            ]);

            if (!building) {
                notFound();
                return;
            }
            setBuildingName(building.name);
            setExtinguishers(data);
        } catch (error) {
            console.error("Failed to fetch extinguishers:", error);
            toast({ variant: 'destructive', title: 'Erro de Conexão', description: 'Não foi possível buscar os extintores.' });
        } finally {
            setIsLoading(false);
        }
    }
    fetchData();
  }, [clientId, buildingId, toast]);


  const handleDeleteSuccess = (deletedUid: string) => {
    setExtinguishers(prev => prev.filter(ext => ext.uid !== deletedUid));
    toast({
        title: "Sucesso!",
        description: "Extintor deletado com sucesso."
    });
  };

  const onDragEnd = async (result: any) => {
    const { destination, source } = result;
    if (!destination) return;
    if (destination.index === source.index) return;

    const reorderedExtinguishers = Array.from(extinguishers);
    const [removed] = reorderedExtinguishers.splice(source.index, 1);
    reorderedExtinguishers.splice(destination.index, 0, removed);
    
    // Optimistic UI update
    setExtinguishers(reorderedExtinguishers);

    try {
        await updateEquipmentOrderAction(clientId, buildingId, 'extinguishers', reorderedExtinguishers);
    } catch (error) {
        console.error("Failed to update order:", error);
        // Revert on error
        setExtinguishers(extinguishers);
        toast({
            variant: "destructive",
            title: "Erro",
            description: "Não foi possível salvar a nova ordem.",
        });
    }
  };

  const pageTitle = isLoading ? "Carregando..." : `Extintores - ${buildingName}`;

  return (
    <>
      <PageHeader title={pageTitle}>
        <Button asChild>
          <Link href={`/clients/${clientId}/${buildingId}/extinguishers/new`}>
            <PlusCircle className="mr-2" />
            Adicionar Extintor
          </Link>
        </Button>
      </PageHeader>
      <Card>
        <CardHeader>
            <CardTitle>Extintores Registrados</CardTitle>
            <CardDescription>Uma lista de todos os extintores de incêndio neste local. Arraste e solte para reordenar.</CardDescription>
        </CardHeader>
        <CardContent>
            <DragDropContext onDragEnd={onDragEnd}>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>ID</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="hidden md:table-cell">Carga (kg)</TableHead>
                          <TableHead className="hidden md:table-cell">Vencimento</TableHead>
                          <TableHead className="hidden md:table-cell">Test. Hidrostático</TableHead>
                          <TableHead className="hidden md:table-cell">Local</TableHead>
                          <TableHead><span className="sr-only">Ações</span></TableHead>
                      </TableRow>
                  </TableHeader>
                  <Droppable droppableId="extinguishers-list" direction="vertical">
                      {(provided) => (
                          <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                              {isLoading ? (
                                  <TableSkeleton />
                              ) : extinguishers.length > 0 ? extinguishers.map((ext, index) => (
                                <Draggable key={ext.uid} draggableId={ext.uid} index={index}>
                                    {(provided, snapshot) => {
                                        const dateValue = ext.expiryDate ? parseISO(ext.expiryDate) : null;
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
                                              <Link href={`/clients/${clientId}/${buildingId}/extinguishers/${ext.uid}`} className="hover:underline">{ext.id}</Link>
                                            </TableCell>
                                            <TableCell>{ext.type}</TableCell>
                                            <TableCell className="hidden md:table-cell">{ext.weight}</TableCell>
                                            <TableCell className="hidden md:table-cell">{isValidDate ? format(dateValue, 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}</TableCell>
                                            <TableCell className="hidden md:table-cell">{ext.hydrostaticTestYear}</TableCell>
                                            <TableCell className="hidden md:table-cell truncate max-w-xs">{ext.observations}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end space-x-1 md:space-x-2">
                                                    <Button asChild variant="ghost" size="icon" className="h-10 w-10 md:h-8 md:w-8">
                                                        <Link href={`/clients/${clientId}/${buildingId}/extinguishers/${ext.uid}/edit`}>
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
                                                            Esta ação não pode ser desfeita. Isso irá deletar permanentemente o extintor{' '}
                                                            <span className="font-bold">{ext.id}</span>.
                                                        </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <DeleteButton action={() => deleteExtinguisherAction(clientId, buildingId, ext.uid)} onSuccess={() => handleDeleteSuccess(ext.uid)} />
                                                        </AlertDialogFooter>
                                                      </AlertDialogContent>
                                                    </AlertDialog>

                                                    <QrCodeDialog value={ext.qrCodeValue} label={ext.id}>
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
                                          Nenhum extintor encontrado.
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
