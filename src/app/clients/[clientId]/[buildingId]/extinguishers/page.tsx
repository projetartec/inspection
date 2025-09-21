'use client';

import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { PlusCircle, Pencil, Trash2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { getExtinguishersByBuilding } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteExtinguisherAction } from "@/lib/actions";
import { QrCodeDialog } from "@/components/qr-code-dialog";
import type { Extinguisher } from '@/lib/types';
import { DeleteButton } from '@/components/delete-button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

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


export default function ExtinguishersPage({ params }: { params: { clientId: string, buildingId: string }}) {
  const { clientId, buildingId } = params;
  const [extinguishers, setExtinguishers] = useState<Extinguisher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
        try {
            setIsLoading(true);
            const data = await getExtinguishersByBuilding(clientId, buildingId);
            setExtinguishers(data);
        } catch (error) {
            console.error("Failed to fetch extinguishers:", error);
        } finally {
            setIsLoading(false);
        }
    }
    fetchData();
  }, [clientId, buildingId]);

  const handleDeleteSuccess = (deletedId: string) => {
    setExtinguishers(prev => prev.filter(ext => ext.id !== deletedId));
    toast({
        title: "Sucesso!",
        description: "Extintor deletado com sucesso."
    });
  };

  return (
    <>
      <PageHeader title="Extintores">
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
            <CardDescription>Uma lista de todos os extintores de incêndio neste local.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="hidden md:table-cell">Capacidade (kg)</TableHead>
                        <TableHead>Recarga</TableHead>
                        <TableHead className="hidden md:table-cell">Test. Hidrostático</TableHead>
                        <TableHead className="hidden md:table-cell">Localização</TableHead>
                        <TableHead><span className="sr-only">Ações</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableSkeleton />
                    ) : extinguishers.length > 0 ? extinguishers.map((ext) => {
                        const dateValue = ext.expiryDate ? parseISO(ext.expiryDate) : null;
                        const isValidDate = dateValue && !isNaN(dateValue.getTime());
                        
                        return (
                        <TableRow key={ext.id}>
                            <TableCell className="font-medium">
                              <Link href={`/clients/${clientId}/${buildingId}/extinguishers/${ext.id}`} className="hover:underline">{ext.id}</Link>
                            </TableCell>
                            <TableCell>{ext.type}</TableCell>
                            <TableCell className="hidden md:table-cell">{ext.weight}</TableCell>
                            <TableCell>{isValidDate ? format(dateValue, 'dd/MM/yyyy', { locale: ptBR }) : 'Data inválida'}</TableCell>
                            <TableCell className="hidden md:table-cell">{ext.hydrostaticTestYear}</TableCell>
                            <TableCell className="hidden md:table-cell truncate max-w-xs">{ext.observations}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex items-center justify-end space-x-1 md:space-x-2">
                                    <Button asChild variant="ghost" size="icon" className="h-10 w-10 md:h-8 md:w-8">
                                        <Link href={`/clients/${clientId}/${buildingId}/extinguishers/${ext.id}/edit`}>
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
                                        <AlertDialogAction asChild>
                                            <DeleteButton action={() => deleteExtinguisherAction(clientId, buildingId, ext.id)} onSuccess={() => handleDeleteSuccess(ext.id)} />
                                        </AlertDialogAction>
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
                    }) : (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center h-24">
                                Nenhum extintor encontrado.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </>
  );
}
