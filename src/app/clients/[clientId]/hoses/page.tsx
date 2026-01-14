'use client';

import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { PlusCircle, Pencil, Trash2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { getHosesByBuilding } from "@/lib/data";
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
import { deleteHoseAction } from "@/lib/actions";
import { QrCodeDialog } from "@/components/qr-code-dialog";
import type { Hydrant } from '@/lib/types';
import { DeleteButton } from "@/components/delete-button";
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Sidebar, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';


function TableSkeleton() {
  return (
    Array(3).fill(0).map((_, index) => (
      <TableRow key={index}>
        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-10" /></TableCell>
        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
        <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
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


export default function HosesPage({ params }: { params: { clientId: string, buildingId: string }}) {
  const { clientId, buildingId } = params;
  const [hoses, setHoses] = useState<Hydrant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
        try {
            setIsLoading(true);
            const data = await getHosesByBuilding(clientId, buildingId);
            setHoses(data);
        } catch (error) {
            console.error("Failed to fetch hoses:", error);
        } finally {
            setIsLoading(false);
        }
    }
    fetchData();
  }, [clientId, buildingId]);

  const handleDeleteSuccess = (deletedId: string) => {
    setHoses(prev => prev.filter(hose => hose.id !== deletedId));
    toast({
        title: "Sucesso!",
        description: "Sistema de mangueira deletado com sucesso."
    });
  };

  return (
    <SidebarProvider>
        <Sidebar>
            <MainNav />
        </Sidebar>
        <SidebarInset>
            <main className="p-4 sm:p-6 lg:p-8">
                <PageHeader title="Mangueiras">
                    <Button asChild>
                    <Link href={`/clients/${clientId}/${buildingId}/hoses/new`}>
                        <PlusCircle className="mr-2" />
                        Adicionar Sistema de Mangueira
                    </Link>
                    </Button>
                </PageHeader>
                <Card>
                    <CardHeader>
                        <CardTitle>Sistemas de Mangueira Registrados</CardTitle>
                        <CardDescription>Uma lista de todos os sistemas de mangueira de incêndio neste local.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead className="hidden md:table-cell">Qtd</TableHead>
                                    <TableHead className="hidden md:table-cell">Validade</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead><span className="sr-only">Ações</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableSkeleton />
                                ) : hoses.length > 0 ? hoses.map((hose) => {
                                    const dateValue = hose.hydrostaticTestDate ? parseISO(hose.hydrostaticTestDate) : null;
                                    const isValidDate = dateValue && !isNaN(dateValue.getTime());
                                    const isExpired = isValidDate ? dateValue < new Date() : false;
                                    
                                    return (
                                    <TableRow key={hose.id}>
                                        <TableCell className="font-medium">
                                        <Link href={`/clients/${clientId}/${buildingId}/hoses/${hose.uid}`} className="hover:underline">{hose.id}</Link>
                                        </TableCell>
                                        <TableCell>{hose.hoseType}"</TableCell>
                                        <TableCell className="hidden md:table-cell">{hose.quantity}</TableCell>
                                        <TableCell className="hidden md:table-cell">{isValidDate ? format(dateValue, 'dd/MM/yyyy', { locale: ptBR }) : 'Data inválida'}</TableCell>
                                        <TableCell>
                                            <Badge variant={isExpired ? 'destructive' : 'secondary'}>
                                                {isExpired ? 'Vencido' : 'Ativo'}
                                            </Badge>
                                        </TableCell>
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
                                                        Esta ação não pode ser desfeita. Isso irá deletar permanentemente o sistema de mangueira{' '}
                                                        <span className="font-bold">{hose.id}</span>.
                                                    </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <DeleteButton action={() => deleteHoseAction(clientId, buildingId, hose.id)} onSuccess={() => handleDeleteSuccess(hose.id)} />
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
                                }) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24">
                                            Nenhum sistema de mangueira encontrado.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>
        </SidebarInset>
    </SidebarProvider>
  );
}
