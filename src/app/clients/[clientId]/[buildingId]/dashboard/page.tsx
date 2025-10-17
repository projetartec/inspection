
'use client';

import React, { useState, useEffect } from 'react';
import { getBuildingById, getExtinguishersByBuilding, getHosesByBuilding } from "@/lib/data";
import { notFound, useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Droplets, AlertTriangle, Play, Eye } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Extinguisher, Hydrant as Hose } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useInspectionSession } from '@/hooks/use-inspection-session.tsx';

interface Stat {
    title: string;
    value: number;
    icon: React.ElementType;
    color: string;
    description?: string;
    href: string | null;
}

function StatCardSkeleton() {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-3 w-20 mt-1" />
            </CardContent>
        </Card>
    )
}

export default function DashboardPage() {
    const params = useParams() as { clientId: string, buildingId: string };
    const { clientId, buildingId } = params;
    const router = useRouter();

    const [buildingName, setBuildingName] = useState<string>('');
    const [stats, setStats] = useState<Stat[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const { session: inspectionSession, startInspection } = useInspectionSession();

    useEffect(() => {
        async function fetchData() {
            if (!clientId || !buildingId) return;

            try {
                setIsLoading(true);

                const buildingPromise = getBuildingById(clientId, buildingId);
                const extinguishersPromise = getExtinguishersByBuilding(clientId, buildingId);
                const hosesPromise = getHosesByBuilding(clientId, buildingId);

                const [building, extinguishers, hoses] = await Promise.all([
                    buildingPromise,
                    extinguishersPromise,
                    hosesPromise,
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

                const expiredExtinguishers = extinguishers.filter(isExpired).length;
                const expiredHoses = hoses.filter(isExpired).length;

                setStats([
                    { title: "Total de Extintores", value: extinguishers.length, icon: Flame, color: "text-muted-foreground", href: `/clients/${clientId}/${buildingId}/extinguishers` },
                    { title: "Total de Mangueiras", value: hoses.length, icon: Droplets, color: "text-muted-foreground", href: `/clients/${clientId}/${buildingId}/hoses` },
                    { title: "Itens Vencidos", value: expiredExtinguishers + expiredHoses, icon: AlertTriangle, color: "text-destructive", description: `${expiredExtinguishers} extintores, ${expiredHoses} mangueiras`, href: null },
                ]);

            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchData();
    }, [clientId, buildingId]);

    const handleStartQrInspection = () => {
        startInspection(clientId, buildingId);
        router.push(qrScanUrl);
    };
    
    const handleStartVisualInspection = () => {
        startInspection(clientId, buildingId);
        router.push(visualInspectionUrl);
    }

    const qrScanUrl = `/clients/${clientId}/${buildingId}/scan`;
    const visualInspectionUrl = `/clients/${clientId}/${buildingId}/visual-inspection`;

    const isInspectionActive = inspectionSession && inspectionSession.buildingId === buildingId;

    return (
        <div className="flex flex-col gap-8">
            <PageHeader title={isLoading ? 'Carregando...' : `Painel: ${buildingName}`} />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                    <>
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                    </>
                ) : (
                    stats.map((stat) => {
                        const CardComponent = (
                            <Card className={stat.href ? "hover:bg-muted/50 transition-colors" : ""}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                                </CardHeader>
                                <CardContent>
                                    <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                                    {stat.description && <p className="text-xs text-muted-foreground">{stat.description}</p>}
                                </CardContent>
                            </Card>
                        );

                        return stat.href ? (
                            <Link href={stat.href} key={stat.title} className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg">
                                {CardComponent}
                            </Link>
                        ) : (
                            <div key={stat.title}>
                                {CardComponent}
                            </div>
                        );
                    })
                )}
            </div>
            <Card className="text-center">
                <CardHeader>
                    <CardTitle className="font-headline">{isInspectionActive ? 'Inspeção em Andamento' : 'Pronto para a Inspeção?'}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground mb-4">
                       {isInspectionActive 
                            ? 'Continue inspecionando os equipamentos ou finalize a inspeção.'
                            : 'Inicie uma nova inspeção para registrar as condições dos equipamentos.'
                       }
                    </p>
                    {isInspectionActive ? (
                         <div className="flex justify-center gap-4">
                            <Button asChild size="lg" variant="outline">
                                <Link href={qrScanUrl}>Continuar Leitura</Link>
                            </Button>
                             <Button asChild size="lg" variant="outline">
                                <Link href={visualInspectionUrl}>Continuar Inspeção Visual</Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="flex justify-center gap-4">
                            <Button size="lg" onClick={handleStartQrInspection}>
                                <Play className="mr-2" />
                                Iniciar Leitura
                            </Button>
                             <Button size="lg" variant="secondary" onClick={handleStartVisualInspection}>
                                <Eye className="mr-2" />
                                Inspeção Visual
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
