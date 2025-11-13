
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import type { Client, Extinguisher, Hydrant } from '@/lib/types';
import { InspectionList } from '@/components/inspection-list';
import { useInspectionSession } from '@/hooks/use-inspection-session.tsx';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';


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
        if (!clientId || !buildingId) return;
        setIsLoading(true);

        const clientDocRef = doc(db, 'clients', clientId);

        const unsubscribe = onSnapshot(clientDocRef, (docSnap) => {
            if (!docSnap.exists()) {
                setIsLoading(false);
                notFound();
                return;
            }

            const clientData = docSnap.data() as Client;
            const building = clientData.buildings?.find(b => b.id === buildingId);

            if (!building) {
                setIsLoading(false);
                notFound();
                return;
            }
            
            const extinguishersData = building.extinguishers || [];
            const hosesData = building.hoses || [];
            
            setExtinguishers(extinguishersData);
            setHoses(hosesData);
            setFilteredExtinguishers(extinguishersData);
            setFilteredHoses(hosesData);
            setIsLoading(false);
        }, (error) => {
            console.error("Failed to fetch equipment:", error);
            setIsLoading(false);
        });
        
        return () => unsubscribe();
    }, [clientId, buildingId]);
    
    useEffect(() => {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();

        const newFilteredExtinguishers = extinguishers.filter(ext => 
            ext.id.toLowerCase().includes(lowerCaseSearchTerm) ||
            (ext.observations && ext.observations.toLowerCase().includes(lowerCaseSearchTerm))
        );
        setFilteredExtinguishers(newFilteredExtinguishers);

        const newFilteredHoses = hoses.filter(hose => 
            hose.id.toLowerCase().includes(lowerCaseSearchTerm) ||
            hose.location.toLowerCase().includes(lowerCaseSearchTerm)
        );
        setFilteredHoses(newFilteredHoses);

    }, [searchTerm, extinguishers, hoses]);

    const handleUpdateItem = (itemType: 'extinguisher' | 'hose', updatedItem: Extinguisher | Hydrant) => {
        // With real-time updates, the local state will be updated automatically by onSnapshot.
        // This function is kept for optimistic updates if needed in the future but is now passive.
        if (itemType === 'extinguisher') {
            setExtinguishers(prev => prev.map(e => e.id === updatedItem.id ? updatedItem as Extinguisher : e));
        } else {
            setHoses(prev => prev.map(h => h.id === updatedItem.id ? updatedItem as Hydrant : h));
        }
    };

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
                        <InspectionList items={filteredExtinguishers} type="extinguisher" onUpdateItem={handleUpdateItem} />
                   )}
                </TabsContent>
                <TabsContent value="hoses">
                     {isLoading ? (
                       <ListSkeleton />
                   ) : (
                        <InspectionList items={filteredHoses} type="hose" onUpdateItem={handleUpdateItem} />
                   )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
