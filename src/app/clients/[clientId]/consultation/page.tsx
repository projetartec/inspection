
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';
import { getClientReportDataAction } from '@/lib/actions';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Building, Client, Extinguisher, Hydrant, Inspection } from '@/lib/types';
import { format, parseISO, isSameMonth, isSameYear, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientReportGenerator } from '@/components/client-report-generator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Image from 'next/image';
import { ConsultationFilters, type ExpiryFilter } from '@/components/consultation-filters';
import { KeyRound, SprayCan, Hash } from 'lucide-react';

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

    const [client, setClient] = useState<Client | null>(null);
    const [buildings, setBuildings] = useState<(Building & { extinguishers: Extinguisher[], hoses: Hydrant[] })[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showOnlyNC, setShowOnlyNC] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [selectedBuildingIds, setSelectedBuildingIds] = useState<string[]>([]);
    const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>({ type: 'none' });

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

    const filteredItems = useMemo(() => {
        const allExtinguishers = buildings.flatMap(b => b.extinguishers.map(e => ({ ...e, buildingName: b.name, buildingId: b.id })));
        const allHoses = buildings.flatMap(b => b.hoses.map(h => ({ ...h, buildingName: b.name, buildingId: b.id })));

        let finalExtinguishers = allExtinguishers;
        let finalHoses = allHoses;

        // N/C Filter
        if (showOnlyNC) {
            finalExtinguishers = finalExtinguishers.filter(e => {
                const lastInsp = e.inspections?.[e.inspections.length - 1];
                if (!lastInsp || !lastInsp.itemStatuses) return false;
                return Object.values(lastInsp.itemStatuses).includes('N/C');
            });
            finalHoses = finalHoses.filter(h => {
                const lastInsp = h.inspections?.[h.inspections.length - 1];
                if (!lastInsp) return false;
                return lastInsp.status === 'N/C';
            });
        }
        
        // Building Filter
        if (selectedBuildingIds.length > 0) {
            finalExtinguishers = finalExtinguishers.filter(e => selectedBuildingIds.includes(e.buildingId));
            finalHoses = finalHoses.filter(h => selectedBuildingIds.includes(h.buildingId));
        }

        // Expiry Filter
        if (expiryFilter.type !== 'none') {
            const now = new Date();
            finalExtinguishers = finalExtinguishers.filter(e => {
                if (!e.expiryDate) return false;
                const expiry = startOfDay(parseISO(e.expiryDate));
                if (expiryFilter.type === 'this_month') {
                    return isSameMonth(expiry, now) && isSameYear(expiry, now);
                }
                if (expiryFilter.type === 'future' && expiryFilter.date) {
                    return expiry >= startOfDay(expiryFilter.date) && expiry <= endOfDay(expiryFilter.date);
                }
                return false;
            });
            finalHoses = finalHoses.filter(h => {
                 if (!h.hydrostaticTestDate) return false;
                 const expiry = startOfDay(parseISO(h.hydrostaticTestDate));
                 if (expiryFilter.type === 'this_month') {
                    return isSameMonth(expiry, now) && isSameYear(expiry, now);
                }
                if (expiryFilter.type === 'future' && expiryFilter.date) {
                    return expiry >= startOfDay(expiryFilter.date) && expiry <= endOfDay(expiryFilter.date);
                }
                return false;
            });
        }


        return { extinguishers: finalExtinguishers, hoses: finalHoses };
    }, [buildings, showOnlyNC, selectedBuildingIds, expiryFilter]);

    const totals = useMemo(() => {
        const totalExtinguishers = filteredItems.extinguishers.length;
        const totalHoses = filteredItems.hoses.length;
        const totalKeys = filteredItems.hoses.reduce((acc, hose) => acc + hose.keyQuantity, 0);
        const totalNozzles = filteredItems.hoses.reduce((acc, hose) => acc + hose.nozzleQuantity, 0);
        const extinguishersByType = filteredItems.extinguishers.reduce((acc, ext) => {
            acc[ext.type] = (acc[ext.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            totalExtinguishers,
            totalHoses,
            totalKeys,
            totalNozzles,
            extinguishersByType
        };
    }, [filteredItems]);


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
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 border-b pb-4">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
                            <TabsList>
                                <TabsTrigger value="all">
                                    <div className="flex items-center gap-2 md:hidden">
                                        <Image src="https://i.imgur.com/acESc0O.png" alt="Extintor" width={16} height={16} />
                                        <Image src="https://i.imgur.com/Fq1OHRb.png" alt="Mangueira" width={16} height={16} />
                                    </div>
                                    <span className="hidden md:inline">Todos os Itens</span>
                                </TabsTrigger>
                                <TabsTrigger value="extinguishers">
                                    <Image src="https://i.imgur.com/acESc0O.png" alt="Extintor" width={20} height={20} className="md:hidden" />
                                    <span className="hidden md:inline">Extintores</span>
                                </TabsTrigger>
                                <TabsTrigger value="hoses">
                                    <Image src="https://i.imgur.com/Fq1OHRb.png" alt="Mangueira" width={20} height={20} className="md:hidden" />
                                    <span className="hidden md:inline">Mangueiras</span>
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center space-x-2">
                                <Switch id="nc-filter" checked={showOnlyNC} onCheckedChange={setShowOnlyNC} />
                                <Label htmlFor="nc-filter">N/C</Label>
                            </div>
                            <ConsultationFilters
                                buildings={buildings}
                                selectedBuildingIds={selectedBuildingIds}
                                onSelectedBuildingIdsChange={setSelectedBuildingIds}
                                expiryFilter={expiryFilter}
                                onExpiryFilterChange={setExpiryFilter}
                            />
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
                                        <ExtinguisherTable items={filteredItems.extinguishers} />
                                    </div>
                                )}
                                {showHoses && (
                                     <div>
                                        <h3 className="text-lg font-semibold mb-2">Hidrantes</h3>
                                        <HoseTable items={filteredItems.hoses} />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Resumo dos Itens Filtrados</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="col-span-1">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Extintores</CardTitle>
                            <Image src="https://i.imgur.com/acESc0O.png" alt="Extintor" width={16} height={16} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totals.totalExtinguishers}</div>
                             <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2">
                                {Object.entries(totals.extinguishersByType).map(([type, count]) => (
                                    <span key={type}>{type}: {count}</span>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                     <Card className="col-span-1">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Hidrantes</CardTitle>
                             <Image src="https://i.imgur.com/Fq1OHRb.png" alt="Mangueira" width={16} height={16} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totals.totalHoses}</div>
                            <p className="text-xs text-muted-foreground">(Sistemas de Mangueira)</p>
                        </CardContent>
                    </Card>
                     <Card className="col-span-1">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Chaves Storz</CardTitle>
                            <KeyRound className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totals.totalKeys}</div>
                            <p className="text-xs text-muted-foreground">Total nos hidrantes filtrados</p>
                        </CardContent>
                    </Card>
                     <Card className="col-span-1">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Esguichos</CardTitle>
                             <SprayCan className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totals.totalNozzles}</div>
                            <p className="text-xs text-muted-foreground">Total nos hidrantes filtrados</p>
                        </CardContent>
                    </Card>
                </CardContent>
            </Card>
        </div>
    );

    