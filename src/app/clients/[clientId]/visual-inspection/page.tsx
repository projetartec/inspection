

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { getExtinguishersByBuilding, getHosesByBuilding } from '@/lib/data';
import type { Extinguisher, Hydrant } from '@/lib/types';
import { InspectionList } from '@/components/inspection-list';
import { useInspectionSession } from '@/hooks/use-inspection-session';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


function ListSkeleton() {
    return (
        <div className="space-y-2">
            {Array(5).fill(0).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-8 w-16" />
                </div>
            ))}
        </div>
    );
}


export default function VisualInspectionPage() {
    const params = useParams() as { clientId: string, buildingId: string };
    const { clientId, buildingId } = params;
    const router = useRouter();

    const [extinguishers, setExtinguishers] = useState<Extinguisher[]>([]);
    const [hoses, setHoses] = useState<Hydrant[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const { startInspection } = useInspectionSession();

    useEffect(() => {
        // Ensure the session is started for this building when the page loads
        startInspection(clientId, buildingId);
    }, [startInspection, clientId, buildingId]);

    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            try {
                const [extinguishersData, hosesData] = await Promise.all([
                    getExtinguishersByBuilding(clientId, buildingId),
                    getHosesByBuilding(clientId, buildingId),
                ]);
                setExtinguishers(extinguishersData);
                setHoses(hosesData);
            } catch (error) {
                console.error("Failed to fetch equipment:", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, [clientId, buildingId]);

    return (
        <div className="flex flex-col gap-8">
            <PageHeader title="Inspeção Visual">
                <Button onClick={() => router.push(`/clients/${clientId}/${buildingId}/dashboard`)}>
                    Voltar ao Painel
                </Button>
            </PageHeader>

            <Tabs defaultValue="extinguishers" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="extinguishers">Extintores ({extinguishers.length})</TabsTrigger>
                    <TabsTrigger value="hoses">Hidrantes ({hoses.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="extinguishers">
                   {isLoading ? (
                       <ListSkeleton />
                   ) : (
                        <InspectionList items={extinguishers} type="extinguisher" />
                   )}
                </TabsContent>
                <TabsContent value="hoses">
                     {isLoading ? (
                       <ListSkeleton />
                   ) : (
                        <InspectionList items={hoses} type="hose" />
                   )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
