
'use client';

import React, { useState, useEffect } from 'react';
import { notFound, useParams } from 'next/navigation';
import { getClientReportDataAction } from '@/lib/actions';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Building, Client, Extinguisher, Hydrant, Inspection } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientReportGenerator } from '@/components/client-report-generator';

const EXTINGUISHER_INSPECTION_ITEMS = [
    "Pintura solo", "Sinalização", "Fixação", "Obstrução", "Lacre/Mangueira/Anel/manômetro"
];

function formatDate(dateInput: string | null | undefined): string {
    if (!dateInput) return 'N/A';
    try {
        const date = parseISO(dateInput);
        return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
        return 'Data Inválida';
    }
}

function getObservationNotes(inspection: Inspection | undefined): string {
    if (!inspection) return '';
    
    const ncItems = Object.entries(inspection.itemStatuses || {})
        .filter(([, status]) => status === 'N/C')
        .map(([item]) => item);

    let notes = '';
    if (ncItems.length > 0) {
        notes += ncItems.join(', ');
    }
    if (inspection.notes) {
        notes += (notes ? ' - ' : '') + inspection.notes;
    }
    return notes;
}

export default function ConsultationPage() {
    const params = useParams() as { clientId: string };
    const clientId = params.clientId;

    const [client, setClient] = useState<Client | null>(null);
    const [buildings, setBuildings] = useState<(Building & { extinguishers: Extinguisher[], hoses: Hydrant[] })[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (clientId) {
            const fetchData = async () => {
                setIsLoading(true);
                try {
                    const { client: clientData, buildings: buildingsData } = await getClientReportDataAction(clientId);
                    if (!clientData) {
                        notFound();
                        return;
                    }
                    setClient(clientData);
                    setBuildings(buildingsData);
                } catch (error) {
                    console.error("Falha ao buscar dados para consulta:", error);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchData();
        }
    }, [clientId]);

    const allExtinguishers = buildings.flatMap(b => b.extinguishers.map(e => ({ ...e, buildingName: b.name })));
    const allHoses = buildings.flatMap(b => b.hoses.map(h => ({ ...h, buildingName: b.name })));

    if (isLoading) {
        return <PageHeader title="Carregando Consulta..." />;
    }

    if (!client) {
        return <PageHeader title="Cliente não encontrado." />;
    }

    return (
        <div className="space-y-8">
            <PageHeader title={`Consulta: ${client.name}`} href={`/clients/${clientId}`} />

            <div className="flex flex-wrap items-center justify-center gap-2 p-4 border-b">
                <ClientReportGenerator clientId={clientId} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Extintores</CardTitle>
                    <CardDescription>Lista consolidada de todos os extintores do cliente.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Prédio</TableHead>
                                <TableHead>Local</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Carga</TableHead>
                                <TableHead>Recarga</TableHead>
                                <TableHead>Última Insp.</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={8} className="h-24 text-center"><Skeleton className="h-4 w-1/2 mx-auto" /></TableCell></TableRow>
                            ) : allExtinguishers.length > 0 ? allExtinguishers.map((ext) => {
                                const lastInsp = ext.inspections?.[ext.inspections.length - 1];
                                return (
                                    <TableRow key={`${ext.buildingName}-${ext.id}`}>
                                        <TableCell className="font-medium">{ext.id}</TableCell>
                                        <TableCell>{ext.buildingName}</TableCell>
                                        <TableCell>{ext.observations}</TableCell>
                                        <TableCell>{ext.type}</TableCell>
                                        <TableCell>{ext.weight}kg</TableCell>
                                        <TableCell>{formatDate(ext.expiryDate)}</TableCell>
                                        <TableCell>{lastInsp ? formatDate(lastInsp.date) : 'N/A'}</TableCell>
                                        <TableCell>{lastInsp ? <Badge variant={lastInsp.status === 'N/C' ? 'destructive' : 'secondary'}>{lastInsp.status}</Badge> : 'N/A'}</TableCell>
                                    </TableRow>
                                );
                            }) : (
                                <TableRow><TableCell colSpan={8} className="h-24 text-center">Nenhum extintor encontrado.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Hidrantes</CardTitle>
                    <CardDescription>Lista consolidada de todos os hidrantes do cliente.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Prédio</TableHead>
                                <TableHead>Local</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Diâmetro</TableHead>
                                <TableHead>Próx. Teste</TableHead>
                                <TableHead>Última Insp.</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={8} className="h-24 text-center"><Skeleton className="h-4 w-1/2 mx-auto" /></TableCell></TableRow>
                            ) : allHoses.length > 0 ? allHoses.map((hose) => {
                                const lastInsp = hose.inspections?.[hose.inspections.length - 1];
                                return (
                                    <TableRow key={`${hose.buildingName}-${hose.id}`}>
                                        <TableCell className="font-medium">{hose.id}</TableCell>
                                        <TableCell>{hose.buildingName}</TableCell>
                                        <TableCell>{hose.location}</TableCell>
                                        <TableCell>Tipo {hose.hoseType}</TableCell>
                                        <TableCell>{hose.diameter}"</TableCell>
                                        <TableCell>{formatDate(hose.hydrostaticTestDate)}</TableCell>
                                        <TableCell>{lastInsp ? formatDate(lastInsp.date) : 'N/A'}</TableCell>
                                        <TableCell>{lastInsp ? <Badge variant={lastInsp.status === 'N/C' ? 'destructive' : 'secondary'}>{lastInsp.status}</Badge> : 'N/A'}</TableCell>
                                    </TableRow>
                                );
                            }) : (
                                <TableRow><TableCell colSpan={8} className="h-24 text-center">Nenhum hidrante encontrado.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
