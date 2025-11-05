
"use client";

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import type { Inspection, Extinguisher, Hydrant } from '@/lib/types';
import { addInspectionBatchAction, updateExtinguisherAction, updateHoseAction, getExtinguishersByBuilding, getHosesByBuilding } from '@/lib/actions';
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
    extinguishers: Extinguisher[];
    hoses: Hydrant[];
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

export const InspectionProvider = ({ children, clientId, buildingId }: { 
    children: React.ReactNode,
    clientId: string,
    buildingId: string,
}) => {
    const [session, setSession] = useState<InspectionSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [extinguishers, setExtinguishers] = useState<Extinguisher[]>([]);
    const [hoses, setHoses] = useState<Hydrant[]>([]);

    useEffect(() => {
        const loadSession = () => {
            try {
                const storedSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
                if (storedSession) {
                    setSession(JSON.parse(storedSession));
                }
            } catch (error) {
                console.error("Failed to parse session from storage", error);
                sessionStorage.removeItem(SESSION_STORAGE_KEY);
            }
        };
        loadSession();
    }, []);

    const fetchEquipment = useCallback(async () => {
        if (!clientId || !buildingId) return;
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
    }, [clientId, buildingId]);

    useEffect(() => {
        fetchEquipment();
    }, [fetchEquipment]);


    const updateSession = (newSession: InspectionSession | null) => {
        setSession(newSession);
        if (newSession) {
            sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
        } else {
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
    };
    
    const updateLocalEquipmentState = useCallback((equipmentId: string, type: 'extinguisher' | 'hose', updates: Partial<Extinguisher | Hydrant>) => {
        if (type === 'extinguisher') {
            setExtinguishers(prev => prev.map(e => 
                e.id === equipmentId ? { ...e, ...updates } : e
            ));
        } else {
            setHoses(prev => prev.map(h => 
                h.id === equipmentId ? { ...h, ...updates } : h
            ));
        }
    }, []);

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

        const originalEquipment = type === 'extinguisher' 
            ? extinguishers.find(e => e.id === item.id) 
            : hoses.find(h => h.id === item.id);

        const updates: Partial<Extinguisher | Hydrant> = {
            ...item.updatedData,
            lastInspected: item.date,
            inspections: [...(originalEquipment?.inspections || []), {
                id: `temp-${Date.now()}`,
                date: item.date,
                notes: item.notes,
                status: item.status,
                itemStatuses: item.itemStatuses
            }]
        };

        updateLocalEquipmentState(item.id, type, updates);
    }, [session, extinguishers, hoses, updateLocalEquipmentState]);
    
    const endInspection = useCallback(async () => {
        if (!session) {
            throw new Error("Nenhuma sessão de inspeção ativa para finalizar.");
        };
        
        try {
            const itemsToUpdate = session.inspectedItems.filter(item => !!item.updatedData);

            const updatePromises = itemsToUpdate.map(item => {
                if (!item.updatedData) return Promise.resolve();

                if (item.qrCodeValue.startsWith('fireguard-ext-')) {
                    const extinguisherId = item.id;
                    return updateExtinguisherAction(session.clientId, session.buildingId, extinguisherId, item.updatedData as Partial<ExtinguisherFormValues>);
                } else if (item.qrCodeValue.startsWith('fireguard-hose-')) {
                    const hoseId = item.id;
                    return updateHoseAction(session.clientId, session.buildingId, hoseId, item.updatedData as Partial<HydrantFormValues>);
                }
                return Promise.resolve();
            });

            await Promise.all(updatePromises);
            
            await addInspectionBatchAction(session.clientId, session.buildingId, session.inspectedItems);
            
            updateSession(null);
        } catch(e) {
            console.error("Failed to save inspection batch", e);
            throw e;
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
        extinguishers,
        hoses
    };

    return (
        <InspectionContext.Provider value={value}>
            {children}
        </InspectionContext.Provider>
    );
};
