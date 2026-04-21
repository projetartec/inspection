
'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import type { Extinguisher, Hydrant } from '@/lib/types';
import { ExtinguisherFormValues, HydrantFormValues } from '@/lib/schemas';

// This type represents an item being saved, not the whole session list.
export interface InspectedItem {
    uid: string;
    id: string;
    qrCodeValue: string;
    date: string;
    notes: string;
    status: 'OK' | 'N/C';
    itemStatuses?: { [key: string]: 'OK' | 'N/C' };
    updatedData?: Partial<ExtinguisherFormValues | HydrantFormValues>;
}

// Session now only tracks the current context, not the list of items.
export interface InspectionSession {
    clientId: string;
    buildingId: string;
    startTime: string;
}

interface InspectionContextType {
    session: InspectionSession | null;
    startInspection: (clientId: string, buildingId: string) => void;
    endInspection: () => void; // Renamed for clarity in UI, but it just clears.
    isLoading: boolean; // Kept for potential future use, but will be false now.
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

export const GlobalInspectionProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<InspectionSession | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        try {
            const storedSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
            if (storedSession) {
                const parsedSession = JSON.parse(storedSession);
                // Make sure we don't load old sessions with inspectedItems
                const newSession: InspectionSession = {
                    clientId: parsedSession.clientId,
                    buildingId: parsedSession.buildingId,
                    startTime: parsedSession.startTime,
                };
                setSession(newSession);
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
        if (session && session.buildingId !== buildingId) {
            console.warn("Starting new inspection, clearing previous session for another building.");
            updateSession(null); 
        }

        if (!session || session.buildingId !== buildingId) {
            const newSession: InspectionSession = {
                clientId,
                buildingId,
                startTime: new Date().toISOString(),
            };
            updateSession(newSession);
        }
    }, [session]);

    // This function no longer calls the server. It just clears the local session.
    const endInspection = useCallback(() => {
        if (!session) {
            console.log("No active inspection session to end.");
            return;
        };
        updateSession(null);
    }, [session]);

    const value = {
        session,
        startInspection,
        endInspection,
        isLoading,
    };

    return (
        <InspectionContext.Provider value={value}>
            {children}
        </InspectionContext.Provider>
    );
};

export const InspectionProvider = GlobalInspectionProvider;
