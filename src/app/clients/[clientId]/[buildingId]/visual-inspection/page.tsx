
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { getExtinguishersByBuilding, getHosesByBuilding } from '@/lib/data';
import type { Extinguisher, Hydrant } from '@/lib/types';
import { InspectionList } from '@/components/inspection-list';
import { useInspectionSession } from '@/hooks/use-inspection-session.tsx';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';


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
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredExtinguishers, setFilteredExtinguishers] = useState<Extinguisher[]>([]);
    const [filteredHoses, setFilteredHoses] = useState<Hydrant[]>([]);

    const { startInspection } = useInspectionSession();

    useEffect(() => {
        // Ensure the session is started for this building when the page loads
        if (clientId && buildingId) {
            startInspection(clientId, buildingId);
        }
    }, [startInspection, clientId, buildingId]);

    useEffect(() => {
        async function fetchData() {
            if (!clientId || !buildingId) return;
            setIsLoading(true);
            try {
                const [extinguishersData, hosesData] = await Promise.all([
                    getExtinguishersByBuilding(clientId, buildingId),
                    getHosesByBuilding(clientId, buildingId),
                ]);
                setExtinguishers(extinguishersData);
                setHoses(hosesData);
                setFilteredExtinguishers(extinguishersData);
                setFilteredHoses(hosesData);
            } catch (error) {
                console.error("Failed to fetch equipment:", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, [clientId, buildingId]);
    
    useEffect(() => {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();

        const newFilteredExtinguishers = extinguishers.filter(ext => 
            ext.id.toLowerCase().includes(lowerCaseSearchTerm) ||
            ext.observations.toLowerCase().includes(lowerCaseSearchTerm)
        );
        setFilteredExtinguishers(newFilteredExtinguishers);

        const newFilteredHoses = hoses.filter(hose => 
            hose.id.toLowerCase().includes(lowerCaseSearchTerm) ||
            hose.location.toLowerCase().includes(lowerCaseSearchTerm)
        );
        setFilteredHoses(newFilteredHoses);

    }, [searchTerm, extinguishers, hoses]);

    return (
        <div className="flex flex-col gap-8">
            <PageHeader title="Inspeção Visual">
                <Button onClick={() => router.push(`/clients/${clientId}/${buildingId}/dashboard`)}>
                    Voltar ao Painel
                </Button>
            </PageHeader>
            
            <div className="relative w-full max-w-md">
              <Input 
                type="text"
                placeholder="Buscar por ID ou Local..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-8"
              />
              {searchTerm && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Limpar busca</span>
                </Button>
              )}
            </div>

            <Tabs defaultValue="extinguishers" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="extinguishers">Extintores ({filteredExtinguishers.length})</TabsTrigger>
                    <TabsTrigger value="hoses">Hidrantes ({filteredHoses.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="extinguishers">
                   {isLoading ? (
                       <ListSkeleton />
                   ) : (
                        <InspectionList items={filteredExtinguishers} type="extinguisher" />
                   )}
                </TabsContent>
                <TabsContent value="hoses">
                     {isLoading ? (
                       <ListSkeleton />
                   ) : (
                        <InspectionList items={filteredHoses} type="hose" />
                   )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

