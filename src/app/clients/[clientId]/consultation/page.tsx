
'use client';

import React, { useState, useEffect } from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from '@/components/ui/button';
import { ChevronLeft, Flame, Droplets } from 'lucide-react';
import Image from 'next/image';

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
    return notes || 'OK';
}

function ExtinguisherTable({ items }: { items: (Extinguisher & { buildingName: string })[] }) {
    if (items.length === 0) {
        return <p className="text-center py-8 text-muted-foreground">Nenhum extintor encontrado para esta seleção.</p>;
    }
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="min-w-[80px]">ID</TableHead>
                    <TableHead>Prédio</TableHead>
                    <TableHead>Recarga</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Carga</TableHead>
                    {EXTINGUISHER_INSPECTION_ITEMS.map(item => <TableHead key={item} className="min-w-[100px]">{item}</TableHead>)}
                    <TableHead>Observações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.map((ext) => {
                    const lastInsp = ext.inspections?.[ext.inspections.length - 1];
                    const inspectionStatus = EXTINGUISHER_INSPECTION_ITEMS.map(item => lastInsp?.itemStatuses?.[item] || 'OK');
                    return (
                        <TableRow key={`${ext.buildingName}-${ext.id}`}>
                            <TableCell className="font-medium">{ext.id}</TableCell>
                            <TableCell>{ext.buildingName}</TableCell>
                            <TableCell>{formatDate(ext.expiryDate)}</TableCell>
                            <TableCell>{ext.type}</TableCell>
                            <TableCell>{ext.weight}kg</TableCell>
                            {inspectionStatus.map((status, index) => (
                                <TableCell key={index}>
                                    <Badge variant={status === 'N/C' ? 'destructive' : 'secondary'}>{status}</Badge>
                                </TableCell>
                            ))}
                            <TableCell>{getObservationNotes(lastInsp)}</TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}

function HoseTable({ items }: { items: (Hydrant & { buildingName: string })[] }) {
    if (items.length === 0) {
        return <p className="text-center py-8 text-muted-foreground">Nenhum hidrante encontrado para esta seleção.</p>;
    }
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Prédio</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Diâmetro</TableHead>
                    <TableHead>Medida</TableHead>
                    <TableHead>Próx. Teste</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Observações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.map((hose) => {
                    const lastInsp = hose.inspections?.[hose.inspections.length - 1];
                    return (
                        <TableRow key={`${hose.buildingName}-${hose.id}`}>
                            <TableCell className="font-medium">{hose.id}</TableCell>
                            <TableCell>{hose.buildingName}</TableCell>
                            <TableCell>{hose.location}</TableCell>
                            <TableCell>Tipo {hose.hoseType}</TableCell>
                            <TableCell>{hose.diameter}"</TableCell>
                            <TableCell>{hose.hoseLength}m</TableCell>
                            <TableCell>{formatDate(hose.hydrostaticTestDate)}</TableCell>
                            <TableCell>{lastInsp ? <Badge variant={lastInsp.status === 'N/C' ? 'destructive' : 'secondary'}>{lastInsp.status}</Badge> : 'N/A'}</TableCell>
                            <TableCell>{getObservationNotes(lastInsp)}</TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}


export default function ConsultationPage() {
    const params = useParams() as { clientId: string };
    const clientId = params.clientId;
    const router = useRouter();

    const [client, setClient] = useState<Client | null>(null);
    const [buildings, setBuildings] = useState<(Building & { extinguishers: Extinguisher[], hoses: Hydrant[] })[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showOnlyNC, setShowOnlyNC] = useState(false);
    const [activeTab, setActiveTab] = useState('all');

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
    
    const filteredExtinguishers = showOnlyNC
    ? allExtinguishers.filter(e => {
        const lastInsp = e.inspections?.[e.inspections.length - 1];
        if (!lastInsp) return false;
        
        if (lastInsp.status === 'N/C') return true;

        return Object.values(lastInsp.itemStatuses || {}).includes('N/C');
    })
    : allExtinguishers;

    const filteredHoses = showOnlyNC
    ? allHoses.filter(h => {
        const lastInsp = h.inspections?.[h.inspections.length - 1];
        if (!lastInsp) return false;
        return lastInsp.status === 'N/C';
    })
    : allHoses;


    if (isLoading) {
        return <PageHeader title="Carregando Consulta..." />;
    }

    if (!client) {
        return <PageHeader title="Cliente não encontrado." />;
    }

    const showExtinguishers = activeTab === 'all' || activeTab === 'extinguishers';
    const showHoses = activeTab === 'all' || activeTab === 'hoses';

    return (
        <div className="space-y-8">
            <PageHeader title={`Consulta: ${client.name}`} />
            
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle>Visualização de Equipamentos</CardTitle>
                            <CardDescription>Consulte todos os equipamentos do cliente e filtre os resultados.</CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                           <ClientReportGenerator clientId={clientId} />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="border-b pb-4">
                             <Tabs value={activeTab} onValueChange={setActiveTab}>
                                <TabsList>
                                    <TabsTrigger value="all">
                                        <div className="flex items-center gap-2 md:hidden">
                                            <Image src="https://i.imgur.com/s40tH5m.png" alt="Extintor" width={16} height={16} />
                                            <Image src="https://i.imgur.com/k6c8v1J.png" alt="Mangueira" width={16} height={16} />
                                        </div>
                                        <span className="hidden md:inline">Todos os Itens</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="extinguishers">
                                        <Image src="https://i.imgur.com/s40tH5m.png" alt="Extintor" width={20} height={20} className="md:hidden" />
                                        <span className="hidden md:inline">Extintores</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="hoses">
                                        <Image src="https://i.imgur.com/k6c8v1J.png" alt="Mangueira" width={20} height={20} className="md:hidden" />
                                        <span className="hidden md:inline">Mangueiras</span>
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                         <div className="flex items-center space-x-2 pt-2">
                            <Switch id="nc-filter" checked={showOnlyNC} onCheckedChange={setShowOnlyNC} />
                            <Label htmlFor="nc-filter">N/C</Label>
                        </div>
                    </div>

                    <div className="space-y-8 mt-6">
                        {isLoading ? (
                             <div className="space-y-4">
                                <Skeleton className="h-8 w-1/4" />
                                <Skeleton className="h-24 w-full" />
                            </div>
                        ) : (
                            <>
                                {showExtinguishers && (
                                    <div>
                                        <h3 className="text-lg font-semibold mb-2">Extintores</h3>
                                        <ExtinguisherTable items={filteredExtinguishers} />
                                    </div>
                                )}
                                {showHoses && (
                                     <div>
                                        <h3 className="text-lg font-semibold mb-2">Hidrantes</h3>
                                        <HoseTable items={filteredHoses} />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
