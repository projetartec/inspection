

"use client";

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import type { Inspection, Extinguisher, Hydrant } from '@/lib/types';
import { addInspectionBatchAction, updateExtinguisherAction, updateHoseAction } from '@/lib/actions';
import { ExtinguisherFormValues, HydrantFormValues } from '@/lib/schemas';

export interface InspectedItem {
    uid: string; // The UID of the extinguisher or hose
    id: string; // The user-facing ID
    qrCodeValue: string;
    date: string;
    notes: string;
    status: 'OK' | 'N/C';
    itemStatuses?: { [key: string]: 'OK' | 'N/C' };
    updatedData?: Partial<ExtinguisherFormValues | HydrantFormValues>;
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

// A provider that will wrap the entire app or relevant parts
export const GlobalInspectionProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<InspectionSession | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Load session from sessionStorage when the app loads
        try {
            const storedSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
            if (storedSession) {
                setSession(JSON.parse(storedSession));
            }
        } catch (error) {
            console.error("Failed to parse session from storage", error);
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
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
        // If a session for a different building is active, clear it.
        if (session && session.buildingId !== buildingId) {
            console.warn("Starting new inspection, clearing previous session for another building.");
            updateSession(null); 
        }

        // Start a new session if none exists for the current building
        if (!session || session.buildingId !== buildingId) {
            const newSession: InspectionSession = {
                clientId,
                buildingId,
                startTime: new Date().toISOString(),
                inspectedItems: [],
            };
            updateSession(newSession);
        }
    }, [session]); // dependency on session

    const addItemToInspection = useCallback((item: InspectedItem) => {
        if (!session) return;
        
        // Ensure uid is included in updatedData if it exists
        if (item.updatedData && Object.keys(item.updatedData).length > 0) {
            item.updatedData = { uid: item.uid, ...item.updatedData };
        }

        // Replace if item with same qrCodeValue already exists
        const otherItems = session.inspectedItems.filter(i => i.qrCodeValue !== item.qrCodeValue);
        const updatedItems = [...otherItems, item];
        
        updateSession({ ...session, inspectedItems: updatedItems });
    }, [session]); // dependency on session

    const endInspection = useCallback(async () => {
        if (!session) {
            throw new Error("Nenhuma sessão de inspeção ativa para finalizar.");
        };
        
        setIsLoading(true);
        try {
            // 1. Update equipment data if changed
            const itemsToUpdate = session.inspectedItems.filter(item => !!item.updatedData && Object.keys(item.updatedData).length > 0);

            const updatePromises = itemsToUpdate.map(item => {
                if (!item.updatedData) return Promise.resolve();
                
                const { uid, ...dataToUpdate } = item.updatedData;

                if (!uid) return Promise.resolve(); // Should not happen with the new logic

                if (item.qrCodeValue.startsWith('fireguard-ext-')) {
                    return updateExtinguisherAction(session.clientId, session.buildingId, uid, dataToUpdate as Partial<ExtinguisherFormValues>);
                } else if (item.qrCodeValue.startsWith('fireguard-hose-')) {
                    return updateHoseAction(session.clientId, session.buildingId, uid, dataToUpdate as Partial<HydrantFormValues>);
                }
                return Promise.resolve();
            });
            
            await Promise.all(updatePromises);
            
            // 2. Add all inspections in a batch
            await addInspectionBatchAction(session.clientId, session.buildingId, session.inspectedItems);
            
            // 3. Clear the session
            updateSession(null);
        } catch(e) {
            console.error("Failed to save inspection batch", e);
            throw e;
        } finally {
            setIsLoading(false);
        }

    }, [session]); // dependency on session

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
    };

    return (
        <InspectionContext.Provider value={value}>
            {children}
        </InspectionContext.Provider>
    );
};

// Re-exporting the original InspectionProvider for compatibility with existing files that use it.
export const InspectionProvider = GlobalInspectionProvider;
