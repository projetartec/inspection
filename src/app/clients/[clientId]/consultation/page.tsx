
'use client';

import React, { useState, useEffect, useMemo, useContext, useCallback } from 'react';
import { notFound, useParams } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getClientById, getBuildingsByClient, getEquipmentForBuildings } from '@/lib/data';
import type { Building, Client, Extinguisher, Hydrant, Inspection } from '@/lib/types';
import { format, parseISO, isSameMonth, isSameYear, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Image from 'next/image';
import { ConsultationFilters, type ExpiryFilter } from '@/components/consultation-filters';
import { KeyRound, SprayCan, Hash, Loader2, Info, Pencil } from 'lucide-react';
import { ConsultationSummaryContext } from '@/app/clients/[clientId]/layout';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';


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

function ExtinguisherTable({ items, isLoading, clientId }: { items: (Extinguisher & { buildingId: string, buildingName: string })[], isLoading: boolean, clientId: string }) {
    if (isLoading) {
        return <TableSkeleton cols={8 + EXTINGUISHER_INSPECTION_ITEMS.length} />;
    }
    if (items.length === 0) {
        return <p className="text-center py-8 text-muted-foreground">Nenhum extintor encontrado para esta seleção.</p>;
    }
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="min-w-[80px]">ID</TableHead>
                    <TableHead>Prédio</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Recarga</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Carga</TableHead>
                    {EXTINGUISHER_INSPECTION_ITEMS.map(item => <TableHead key={item} className="min-w-[100px]">{item}</TableHead>)}
                    <TableHead>Observações</TableHead>
                    <TableHead><span className="sr-only">Ações</span></TableHead>
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
                            <TableCell>{ext.observations}</TableCell>
                            <TableCell>{formatDate(ext.expiryDate)}</TableCell>
                            <TableCell>{ext.type}</TableCell>
                            <TableCell>{ext.weight}kg</TableCell>
                            {inspectionStatus.map((status, index) => (
                                <TableCell key={index}>
                                    <Badge variant={status === 'N/C' ? 'destructive' : 'secondary'}>{status}</Badge>
                                </TableCell>
                            ))}
                            <TableCell>{getObservationNotes(lastInsp)}</TableCell>
                            <TableCell className="text-right">
                                <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                                    <Link href={`/clients/${clientId}/${ext.buildingId}/extinguishers/${ext.uid}/edit`}>
                                        <Pencil className="h-4 w-4" />
                                        <span className="sr-only">Editar</span>
                                    </Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}

function HoseTable({ items, isLoading, clientId }: { items: (Hydrant & { buildingId: string, buildingName: string })[], isLoading: boolean, clientId: string }) {
     if (isLoading) {
        return <TableSkeleton cols={9} />;
    }
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
                    <TableHead><span className="sr-only">Ações</span></TableHead>
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
                             <TableCell className="text-right">
                                <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                                    <Link href={`/clients/${clientId}/${hose.buildingId}/hoses/${hose.uid}/edit`}>
                                        <Pencil className="h-4 w-4" />
                                        <span className="sr-only">Editar</span>
                                    </Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}

function TableSkeleton({ cols }: { cols: number }) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    {Array(cols).fill(0).map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-20" /></TableHead>)}
                </TableRow>
            </TableHeader>
            <TableBody>
                {Array(3).fill(0).map((_, i) => (
                    <TableRow key={i}>
                        {Array(cols).fill(0).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}


function ConsultationSummary({ totals }: { totals: any }) {
    const { setSummary } = useContext(ConsultationSummaryContext);

    useEffect(() => {
        setSummary(
            <div className="flex flex-col gap-2 text-sm">
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="extinguishers-summary" className="border-none">
                        <AccordionTrigger className="flex justify-between items-center p-0 hover:no-underline">
                             <span className="flex items-center gap-2 text-sidebar-foreground/80">
                                <Image src="https://i.imgur.com/acESc0O.png" alt="Extintor" width={16} height={16} />
                                Extintores
                            </span>
                            <span className="font-bold text-sidebar-foreground/80">{totals.totalExtinguishers}</span>
                        </AccordionTrigger>
                        <AccordionContent className="pl-6 text-xs text-sidebar-foreground/60 space-y-1 pt-2">
                             {Object.keys(totals.extinguishersByTypeAndWeight).length > 0 ?
                                Object.entries(totals.extinguishersByTypeAndWeight).map(([type, count]) => (
                                <div key={type} className="flex justify-between">
                                    <span>{type}:</span>
                                    <span>{count as React.ReactNode}</span>
                                </div>
                            )) : <p>Nenhum</p>}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>

                <div className="flex justify-between items-center">
                     <span className="flex items-center gap-2 text-sidebar-foreground/80">
                        <Image src="https://i.imgur.com/Fq1OHRb.png" alt="Hidrante" width={16} height={16} />
                        Hidrantes
                    </span>
                    <span className="font-bold">{totals.totalHoses}</span>
                </div>
                 <div className="flex justify-between items-center">
                     <span className="flex items-center gap-2 text-sidebar-foreground/80">
                        <KeyRound className="h-4 w-4" />
                        Chaves Storz
                    </span>
                    <span className="font-bold">{totals.totalKeys}</span>
                </div>
                 <div className="flex justify-between items-center">
                     <span className="flex items-center gap-2 text-sidebar-foreground/80">
                        <SprayCan className="h-4 w-4" />
                        Esguichos
                    </span>
                    <span className="font-bold">{totals.totalNozzles}</span>
                </div>
            </div>
        );

        return () => setSummary(null);
    }, [totals, setSummary]);

    return null;
}


export default function ConsultationPage() {
    const params = useParams() as { clientId: string };
    const clientId = params.clientId;

    const [client, setClient] = useState<Client | null>(null);
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [equipment, setEquipment] = useState<{extinguishers: (Extinguisher & {buildingId: string, buildingName: string})[], hoses: (Hydrant & {buildingId: string, buildingName: string})[]}>({extinguishers: [], hoses: []});
    
    const [isLoadingClient, setIsLoadingClient] = useState(true);
    const [isLoadingEquipment, setIsLoadingEquipment] = useState(false);

    const [showOnlyNC, setShowOnlyNC] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [selectedBuildingIds, setSelectedBuildingIds] = useState<string[]>([]);
    const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>({ type: 'none' });

    // Initial fetch for client and buildings list
    useEffect(() => {
        async function fetchInitialData() {
            if (!clientId) return;
            setIsLoadingClient(true);
            try {
                const clientData = await getClientById(clientId);
                if (!clientData) {
                    notFound();
                    return;
                }
                setClient(clientData);

                const buildingsData = await getBuildingsByClient(clientId);
                setBuildings(buildingsData);
            } catch (err) {
                console.error("Falha ao buscar dados iniciais para consulta:", err);
            } finally {
                setIsLoadingClient(false);
            }
        }
        fetchInitialData();
    }, [clientId]);

    // Fetch equipment when selected buildings change
    useEffect(() => {
        const fetchEquipmentData = async () => {
            if (!clientId || selectedBuildingIds.length === 0) {
                setEquipment({ extinguishers: [], hoses: [] });
                return;
            }
            
            setIsLoadingEquipment(true);
            try {
                const equipmentData = await getEquipmentForBuildings(clientId, selectedBuildingIds);
                setEquipment(equipmentData);
            } catch (err) {
                 console.error("Falha ao buscar equipamentos para consulta:", err);
            } finally {
                setIsLoadingEquipment(false);
            }
        };

        fetchEquipmentData();
    }, [clientId, selectedBuildingIds]);

    const filteredItems = useMemo(() => {
        let finalExtinguishers = equipment.extinguishers;
        let finalHoses = equipment.hoses;

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

        // Expiry Filter (only applied if buildings are selected)
        if (selectedBuildingIds.length > 0 && expiryFilter.type !== 'none') {
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
    }, [equipment, showOnlyNC, selectedBuildingIds, expiryFilter]);

    const totals = useMemo(() => {
        const totalExtinguishers = filteredItems.extinguishers.length;
        const totalHoses = filteredItems.hoses.length;
        const totalKeys = filteredItems.hoses.reduce((acc, hose) => acc + hose.keyQuantity, 0);
        const totalNozzles = filteredItems.hoses.reduce((acc, hose) => acc + hose.nozzleQuantity, 0);
        
        const extinguishersByTypeAndWeight = filteredItems.extinguishers.reduce((acc, ext) => {
            const key = `${ext.type} ${ext.weight}kg`;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Sort the keys alphabetically
        const sortedExtinguishers = Object.entries(extinguishersByTypeAndWeight)
            .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
            .reduce((acc, [key, value]) => {
                acc[key] = value;
                return acc;
            }, {} as Record<string, number>);

        return {
            totalExtinguishers,
            totalHoses,
            totalKeys,
            totalNozzles,
            extinguishersByTypeAndWeight: sortedExtinguishers,
        };
    }, [filteredItems]);


    if (isLoadingClient) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!client) {
        return <PageHeader title="Cliente não encontrado." />;
    }

    const showExtinguishers = activeTab === 'all' || activeTab === 'extinguishers';
    const showHoses = activeTab === 'all' || activeTab === 'hoses';
    const noBuildingsSelected = selectedBuildingIds.length === 0;

    return (
        <>
            <ConsultationSummary totals={totals} />
            <div className="space-y-8">
                <PageHeader title={`Consulta: ${client.name}`} />
                
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <CardTitle>Visualização de Equipamentos</CardTitle>
                                <CardDescription>Consulte todos os equipamentos do cliente e filtre os resultados.</CardDescription>
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
                            {noBuildingsSelected ? (
                                <div className="text-center py-16 text-muted-foreground flex flex-col items-center gap-4">
                                    <Info className="h-8 w-8" />
                                    <p className="max-w-md">Selecione um ou mais prédios no filtro para visualizar os equipamentos e gerar o resumo.</p>
                                </div>
                            ) : (
                                <>
                                    {showExtinguishers && (
                                        <div>
                                            <h3 className="text-lg font-semibold mb-2">Extintores</h3>
                                            <ExtinguisherTable items={filteredItems.extinguishers} isLoading={isLoadingEquipment} clientId={clientId} />
                                        </div>
                                    )}
                                    {showHoses && (
                                        <div>
                                            <h3 className="text-lg font-semibold mb-2">Hidrantes</h3>
                                            <HoseTable items={filteredItems.hoses} isLoading={isLoadingEquipment} clientId={clientId} />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
