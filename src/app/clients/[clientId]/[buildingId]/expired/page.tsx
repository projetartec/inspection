

'use client';

import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { getExtinguishersByBuilding, getHosesByBuilding, getBuildingById } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Extinguisher, Hydrant } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { notFound, useParams } from 'next/navigation';
import Image from 'next/image';

function TableSkeleton() {
  return (
    Array(3).fill(0).map((_, index) => (
      <TableRow key={index}>
        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end space-x-1 md:space-x-2">
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </TableCell>
      </TableRow>
    ))
  );
}

export default function ExpiredItemsPage() {
  const params = useParams() as { clientId: string, buildingId: string };
  const { clientId, buildingId } = params;
  const [expiredExtinguishers, setExpiredExtinguishers] = useState<Extinguisher[]>([]);
  const [expiredHoses, setExpiredHoses] = useState<Hydrant[]>([]);
  const [buildingName, setBuildingName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
        if (!clientId || !buildingId) return;

        try {
            setIsLoading(true);
            const [building, extinguishers, hoses] = await Promise.all([
                getBuildingById(buildingId),
                getExtinguishersByBuilding(buildingId),
                getHosesByBuilding(buildingId)
            ]);

            if (!building) {
                notFound();
                return;
            }
            setBuildingName(building.name);
            
            const isExpired = (item: { expiryDate?: string, hydrostaticTestDate?: string }) => {
                const dateStr = item.expiryDate || item.hydrostaticTestDate;
                if (!dateStr || typeof dateStr !== 'string') return false;
                try {
                    const date = new Date(dateStr);
                    return date < new Date();
                } catch {
                    return false;
                }
            };
            
            setExpiredExtinguishers(extinguishers.filter(isExpired));
            setExpiredHoses(hoses.filter(isExpired));

        } catch (error) {
            console.error("Failed to fetch expired items:", error);
            toast({ variant: 'destructive', title: 'Erro de Conexão', description: 'Não foi possível buscar os itens vencidos.' });
        } finally {
            setIsLoading(false);
        }
    }
    fetchData();
  }, [clientId, buildingId, toast]);

  const pageTitle = isLoading ? "Carregando..." : `Itens Vencidos - ${buildingName}`;

  return (
    <>
      <PageHeader title={pageTitle} />
      <div className="space-y-8">
        <Card>
          <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                    <Image src="https://i.imgur.com/acESc0O.png" alt="Extintor" width={24} height={24} />
                    Extintores Vencidos
                </div>
              </CardTitle>
              <CardDescription>Uma lista de todos os extintores de incêndio vencidos neste local.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="hidden md:table-cell">Local</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead><span className="sr-only">Ações</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableSkeleton />
                    ) : expiredExtinguishers.length > 0 ? expiredExtinguishers.map((ext) => {
                        const dateValue = ext.expiryDate ? parseISO(ext.expiryDate) : null;
                        const isValidDate = dateValue && !isNaN(dateValue.getTime());
                        return (
                        <TableRow key={ext.uid}>
                            <TableCell className="font-medium">
                              <Link href={`/clients/${clientId}/${buildingId}/extinguishers/${ext.uid}`} className="hover:underline">{ext.id}</Link>
                            </TableCell>
                            <TableCell>{ext.type}</TableCell>
                            <TableCell className="hidden md:table-cell">{ext.observations}</TableCell>
                            <TableCell className="text-destructive font-medium">{isValidDate ? format(dateValue, 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}</TableCell>
                            <TableCell className="text-right">
                                <Button asChild variant="ghost" size="icon" className="h-10 w-10 md:h-8 md:w-8">
                                    <Link href={`/clients/${clientId}/${buildingId}/extinguishers/${ext.uid}/edit`}>
                                        <Pencil className="h-5 w-5 md:h-4 md:w-4" />
                                        <span className="sr-only">Editar</span>
                                    </Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                        );
                    }) : (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-24">
                                Nenhum extintor vencido.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                    <Image src="https://i.imgur.com/Fq1OHRb.png" alt="Hidrante" width={24} height={24} />
                    Hidrantes Vencidos
                </div>
              </CardTitle>
              <CardDescription>Uma lista de todos os hidrantes com teste hidrostático vencido neste local.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Local</TableHead>
                        <TableHead className="hidden md:table-cell">Tipo</TableHead>
                        <TableHead>Venc. Teste</TableHead>
                        <TableHead><span className="sr-only">Ações</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableSkeleton />
                    ) : expiredHoses.length > 0 ? expiredHoses.map((hose) => {
                        const dateValue = hose.hydrostaticTestDate ? parseISO(hose.hydrostaticTestDate) : null;
                        const isValidDate = dateValue && !isNaN(dateValue.getTime());
                        
                        return (
                        <TableRow key={hose.uid}>
                            <TableCell className="font-medium">
                              <Link href={`/clients/${clientId}/${buildingId}/hoses/${hose.uid}`} className="hover:underline">{hose.id}</Link>
                            </TableCell>
                            <TableCell>{hose.location}</TableCell>
                            <TableCell className="hidden md:table-cell">Tipo {hose.hoseType}</TableCell>
                            <TableCell className="text-destructive font-medium">{isValidDate ? format(dateValue, 'dd/MM/yyyy', { locale: ptBR }) : 'Data inválida'}</TableCell>
                            <TableCell className="text-right">
                                <Button asChild variant="ghost" size="icon" className="h-10 w-10 md:h-8 md:w-8">
                                    <Link href={`/clients/${clientId}/${buildingId}/hoses/${hose.uid}/edit`}>
                                        <Pencil className="h-5 w-5 md:h-4 md:w-4" />
                                        <span className="sr-only">Editar</span>
                                    </Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                        );
                    }) : (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-24">
                                Nenhum hidrante vencido.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
