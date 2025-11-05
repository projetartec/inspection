
"use client";

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import type { Inspection, Extinguisher, Hydrant } from '@/lib/types';
import { addInspectionBatchAction, updateExtinguisherAction, updateHoseAction } from '@/lib/actions';
import { ExtinguisherFormValues, HydrantFormValues } from '@/lib/schemas';

export interface InspectedItem extends Omit<Inspection, 'id'> {
    id: string; // The ID of the extinguisher or hose
    qrCodeValue: string;
    updatedData?: Partial<ExtinguisherFormValues> | Partial<HydrantFormValues>;
}

export interface InspectionSession {
    clientId: string;
    buildingId: string;
    startTime: string;
    inspectedItems: InspectedItem[];
}

interface InspectionContextType {
    session: InspectionSession | null;
    startInspection: (clientId: string, buildingId: string) => void;
    addItemToInspection: (item: InspectedItem, type: 'extinguisher' | 'hose') => void;
    endInspection: () => Promise<void>;
    clearSession: () => void;
    isLoading: boolean;
    updateLocalEquipmentState: (equipmentId: string, type: 'extinguisher' | 'hose', updates: Partial<Extinguisher | Hydrant>) => void;
}

const InspectionContext = createContext<InspectionContextType | null>(null);

export const useInspectionSession = () => {
    const context = useContext(InspectionContext);
    if (!context) {
        throw new Error('useInspectionSession must be used within an InspectionProvider');
    }
    return context;
};

const SESSION_STORAGE_KEY = 'inspectionSession';

export const InspectionProvider = ({ children, initialExtinguishers, initialHoses, onStateChange }: { 
    children: React.ReactNode, 
    initialExtinguishers: Extinguisher[], 
    initialHoses: Hydrant[],
    onStateChange: (extinguishers: Extinguisher[], hoses: Hydrant[]) => void 
}) => {
    const [session, setSession] = useState<InspectionSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        try {
            const storedSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
            if (storedSession) {
                setSession(JSON.parse(storedSession));
            }
        } catch (error) {
            console.error("Failed to parse session from storage", error);
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updateSession = (newSession: InspectionSession | null) => {
        setSession(newSession);
        if (newSession) {
            sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
        } else {
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
    };
    
    const updateLocalEquipmentState = (equipmentId: string, type: 'extinguisher' | 'hose', updates: Partial<Extinguisher | Hydrant>) => {
        let newExtinguishers = initialExtinguishers;
        let newHoses = initialHoses;

        if (type === 'extinguisher') {
            newExtinguishers = initialExtinguishers.map(e => 
                e.id === equipmentId ? { ...e, ...updates } : e
            );
        } else {
            newHoses = initialHoses.map(h => 
                h.id === equipmentId ? { ...h, ...updates } : h
            );
        }
        onStateChange(newExtinguishers, newHoses);
    };

    const startInspection = useCallback((clientId: string, buildingId: string) => {
        if (session && session.buildingId !== buildingId) {
            console.warn("Starting new inspection, clearing previous session for another building.");
            updateSession(null); 
        }

        if (!session || session.buildingId !== buildingId) {
            const newSession: InspectionSession = {
                clientId,
                buildingId,
                startTime: new Date().toISOString(),
                inspectedItems: [],
            };
            updateSession(newSession);
        }
    }, [session]);
    
    const addItemToInspection = useCallback((item: InspectedItem, type: 'extinguisher' | 'hose') => {
        if (!session) return;

        const otherItems = session.inspectedItems.filter(i => i.qrCodeValue !== item.qrCodeValue);
        const updatedItems = [...otherItems, item];
        
        updateSession({ ...session, inspectedItems: updatedItems });

        // Update local state immediately
        const updates: Partial<Extinguisher | Hydrant> = {
            ...item.updatedData,
            lastInspected: item.date,
            inspections: [...(initialExtinguishers.find(e => e.id === item.id)?.inspections || initialHoses.find(h => h.id === item.id)?.inspections || []), {
                id: `temp-${Date.now()}`,
                date: item.date,
                notes: item.notes,
                status: item.status,
                itemStatuses: item.itemStatuses
            }]
        };

        updateLocalEquipmentState(item.id, type, updates);
    }, [session, initialExtinguishers, initialHoses, onStateChange]);
    
    const endInspection = useCallback(async () => {
        if (!session) {
            throw new Error("Nenhuma sessão de inspeção ativa para finalizar.");
        };
        
        try {
            // Separate pure inspections from those with data updates
            const pureInspections = session.inspectedItems.filter(item => !item.updatedData);
            const itemsToUpdate = session.inspectedItems.filter(item => !!item.updatedData);

            // Create promises for all updates
            const updatePromises = itemsToUpdate.map(item => {
                if (!item.updatedData) return Promise.resolve();

                if (item.qrCodeValue.startsWith('fireguard-ext-')) {
                    const extinguisherId = item.qrCodeValue.replace('fireguard-ext-', '');
                    return updateExtinguisherAction(session.clientId, session.buildingId, extinguisherId, item.updatedData as Partial<ExtinguisherFormValues>);
                } else if (item.qrCodeValue.startsWith('fireguard-hose-')) {
                    const hoseId = item.qrCodeValue.replace('fireguard-hose-', '');
                    return updateHoseAction(session.clientId, session.buildingId, hoseId, item.updatedData as Partial<HydrantFormValues>);
                }
                return Promise.resolve();
            });

            // Run all updates in parallel
            await Promise.all(updatePromises);
            
            // Batch add all inspection records (including for updated items)
            await addInspectionBatchAction(session.clientId, session.buildingId, session.inspectedItems);
            
            // After successfully saving, clear the local session
            updateSession(null);
        } catch(e) {
            console.error("Failed to save inspection batch", e);
            throw e; // Rethrow to be caught by the UI
        }
    }, [session]);

    const clearSession = useCallback(() => {
        updateSession(null);
    }, []);

    const value = {
        session,
        startInspection,
        addItemToInspection,
        endInspection,
        clearSession,
        isLoading,
        updateLocalEquipmentState,
    };

    return (
        <InspectionContext.Provider value={value}>
            {children}
        </InspectionContext.Provider>
    );
};

export function InspectionWrapper({ children, clientId, buildingId }: { children: React.ReactNode, clientId: string, buildingId: string }) {
    const [extinguishers, setExtinguishers] = useState<Extinguisher[]>([]);
    const [hoses, setHoses] = useState<Hydrant[]>([]);
    
    // This wrapper would fetch the initial data and pass it down
    // For now, we'll use placeholder empty arrays.
    
    const handleStateChange = (newExtinguishers: Extinguisher[], newHoses: Hydrant[]) => {
        setExtinguishers(newExtinguishers);
        setHoses(newHoses);
    };

    return (
        <InspectionProvider 
            initialExtinguishers={extinguishers} 
            initialHoses={hoses}
            onStateChange={handleStateChange}
        >
            {children}
        </InspectionProvider>
    );
}