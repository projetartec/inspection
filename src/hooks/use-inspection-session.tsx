
"use client";

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import type { Inspection } from '@/lib/types';

export interface InspectedItem extends Omit<Inspection, 'id'> {
    qrCodeValue: string; // Can be a real QR code or a manual/visual identifier
}

interface InspectionSession {
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

export const InspectionProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<InspectionSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const getStorageKey = useCallback(() => {
        if (typeof window !== 'undefined') {
            // This will only run on the client
            return 'inspectionSession';
        }
        return null;
    }, []);

    useEffect(() => {
        const key = getStorageKey();
        if (key) {
            try {
                const storedSession = localStorage.getItem(key);
                if (storedSession) {
                    setSession(JSON.parse(storedSession));
                }
            } catch (error) {
                console.error("Failed to parse inspection session from localStorage", error);
                localStorage.removeItem(key);
            }
        }
        setIsLoading(false);
    }, [getStorageKey]);

    const updateSession = (newSession: InspectionSession | null) => {
        const key = getStorageKey();
        if (!key) return;

        setSession(newSession);
        if (newSession) {
            localStorage.setItem(key, JSON.stringify(newSession));
        } else {
            localStorage.removeItem(key);
        }
    };

    const startInspection = (clientId: string, buildingId: string) => {
        // Only start a new session if one isn't active for the same building
        if (session && session.clientId === clientId && session.buildingId === buildingId) {
            return;
        }

        const newSession: InspectionSession = {
            clientId,
            buildingId,
            startTime: new Date().toISOString(),
            inspectedItems: [],
        };
        updateSession(newSession);
    };
    
    const addItemToInspection = (item: InspectedItem) => {
        if (session) {
            // Remove previous inspection for the same item if it exists
            const otherItems = session.inspectedItems.filter(i => i.qrCodeValue !== item.qrCodeValue);
            const newSession = {
                ...session,
                inspectedItems: [...otherItems, item],
            };
            updateSession(newSession);
        }
    };

    const isItemInspected = (qrCodeValue: string) => {
        return session?.inspectedItems.some(item => item.qrCodeValue === qrCodeValue) || false;
    };
    
    const endInspection = async () => {
        if (!session) return;
        
        console.log("Ending and saving inspection:", session);
        
        const { addInspectionBatchAction } = await import('@/lib/actions');
        try {
            await addInspectionBatchAction(session.clientId, session.buildingId, session.inspectedItems);
        } catch(e) {
            console.error("Failed to save inspection batch", e);
            throw e;
        }


        clearSession();
    };

    const clearSession = () => {
        updateSession(null);
    };
    

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
