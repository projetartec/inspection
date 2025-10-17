
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

// This function needs to be outside the component to be accessible in the initial state.
const getSessionFromStorage = (): InspectionSession | null => {
    if (typeof window === 'undefined') return null;
    try {
        const storedSession = localStorage.getItem('inspectionSession');
        if (storedSession) {
            return JSON.parse(storedSession) as InspectionSession;
        }
    } catch (error) {
        console.error("Failed to parse inspection session from localStorage", error);
        localStorage.removeItem('inspectionSession');
    }
    return null;
}


export const InspectionProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<InspectionSession | null>(getSessionFromStorage);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        // The initial state is now set directly, so we just handle loading.
        setIsLoading(false);
    }, []);
    
    // Listen for storage changes from other tabs/windows
    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'inspectionSession') {
                setSession(getSessionFromStorage());
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);


    const updateSession = useCallback((newSession: InspectionSession | null) => {
        setSession(newSession);
        if (typeof window !== 'undefined') {
            if (newSession) {
                localStorage.setItem('inspectionSession', JSON.stringify(newSession));
            } else {
                localStorage.removeItem('inspectionSession');
            }
        }
    }, []);

    const startInspection = useCallback((clientId: string, buildingId: string) => {
        setSession(currentSession => {
             if (currentSession && currentSession.clientId === clientId && currentSession.buildingId === buildingId) {
                return currentSession;
            }
            const newSession: InspectionSession = {
                clientId,
                buildingId,
                startTime: new Date().toISOString(),
                inspectedItems: [],
            };
            updateSession(newSession);
            return newSession;
        });
    }, [updateSession]);
    
    const addItemToInspection = useCallback((item: InspectedItem) => {
        setSession(currentSession => {
            if (!currentSession) return null;

            const otherItems = currentSession.inspectedItems.filter(i => i.qrCodeValue !== item.qrCodeValue);
            const newSession = {
                ...currentSession,
                inspectedItems: [...otherItems, item],
            };
            updateSession(newSession);
            return newSession;
        });
    }, [updateSession]);

    const isItemInspected = useCallback((qrCodeValue: string) => {
        return session?.inspectedItems.some(item => item.qrCodeValue === qrCodeValue) || false;
    }, [session]);
    
    const endInspection = useCallback(async () => {
        if (!session) return;
        
        console.log("Ending and saving inspection:", session);
        
        // Dynamically import server action
        const { addInspectionBatchAction } = await import('@/lib/actions');
        try {
            await addInspectionBatchAction(session.clientId, session.buildingId, session.inspectedItems);
            // Clear session only after successful save
            updateSession(null);
        } catch(e) {
            console.error("Failed to save inspection batch", e);
            // Re-throw to be caught by the UI component
            throw e;
        }
    }, [session, updateSession]);

    const clearSession = useCallback(() => {
        updateSession(null);
    }, [updateSession]);
    

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
