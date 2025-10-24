
"use client";

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import type { Inspection, Extinguisher, Hydrant } from '@/lib/types';
import { addInspectionBatchAction, updateExtinguisherAction, updateHoseAction } from '@/lib/actions';
import { ExtinguisherFormValues, HydrantFormValues } from '@/lib/schemas';

export interface InspectedItem extends Omit<Inspection, 'id'> {
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
    addItemToInspection: (item: InspectedItem) => void;
    endInspection: () => Promise<void>;
    clearSession: () => void;
    isLoading: boolean;
    isItemInspected: (qrCodeValue: string) => boolean;
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

export const InspectionProvider = ({ children }: { children: React.ReactNode }) => {
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

    const startInspection = useCallback((clientId: string, buildingId: string) => {
        // If a session for a different building is active, clear it first
        if (session && session.buildingId !== buildingId) {
            // In a real scenario, you might want to prompt the user
            console.warn("Starting new inspection, clearing previous session for another building.");
            updateSession(null); 
        }

        // Only start a new session if there isn't one for the current building
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
    
    const addItemToInspection = useCallback((item: InspectedItem) => {
        if (!session) return;

        const otherItems = session.inspectedItems.filter(i => i.qrCodeValue !== item.qrCodeValue);
        const updatedItems = [...otherItems, item];
        
        updateSession({ ...session, inspectedItems: updatedItems });
    }, [session]);

    const isItemInspected = useCallback((qrCodeValue: string) => {
        return session?.inspectedItems.some(item => item.qrCodeValue === qrCodeValue) || false;
    }, [session]);
    
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
        isItemInspected,
    };

    return (
        <InspectionContext.Provider value={value}>
            {children}
        </InspectionContext.Provider>
    );
};
