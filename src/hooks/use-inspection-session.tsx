
"use client";

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import type { Inspection } from '@/lib/types';
import { db } from '@/lib/firebase-client';
import { doc, onSnapshot, getDoc, setDoc, deleteDoc, Unsubscribe, updateDoc, arrayUnion } from 'firebase/firestore';

export interface InspectedItem extends Omit<Inspection, 'id'> {
    qrCodeValue: string; // Can be a real QR code or a manual/visual identifier
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

// --- Firestore Session Management ---
const SESSIONS_COLLECTION = 'inspectionSessions';

const getSessionRef = (buildingId: string) => doc(db, SESSIONS_COLLECTION, buildingId);

export const InspectionProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<InspectionSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentBuildingId, setCurrentBuildingId] = useState<string | null>(null);

    // Subscribe to Firestore session changes for the current building
    useEffect(() => {
        if (!currentBuildingId) {
            setSession(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const sessionRef = getSessionRef(currentBuildingId);
        const unsubscribe = onSnapshot(sessionRef, (docSnap) => {
            if (docSnap.exists()) {
                setSession(docSnap.data() as InspectionSession);
            } else {
                setSession(null);
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error listening to session changes:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [currentBuildingId]);


    const startInspection = useCallback(async (clientId: string, buildingId: string) => {
        setCurrentBuildingId(buildingId); // This will trigger the useEffect to listen for this building's session.
        
        const sessionRef = getSessionRef(buildingId);
        const docSnap = await getDoc(sessionRef);

        if (!docSnap.exists()) {
            const newSession: InspectionSession = {
                clientId,
                buildingId,
                startTime: new Date().toISOString(),
                inspectedItems: [],
            };
            await setDoc(sessionRef, newSession);
            // The onSnapshot listener will update the state
        }
        // If it exists, the onSnapshot listener will handle setting the state.
    }, []);
    
    const addItemToInspection = useCallback(async (item: InspectedItem) => {
        if (!currentBuildingId) return;

        const sessionRef = getSessionRef(currentBuildingId);
        
        // This is a read-modify-write operation. For high concurrency, a transaction is better,
        // but for this use case, it's generally fine.
        const currentDoc = await getDoc(sessionRef);
        if (currentDoc.exists()) {
            const currentSession = currentDoc.data() as InspectionSession;
            const otherItems = currentSession.inspectedItems.filter(i => i.qrCodeValue !== item.qrCodeValue);
            const updatedItems = [...otherItems, item];
            
            await updateDoc(sessionRef, { inspectedItems: updatedItems });
            // The onSnapshot listener will update the local state.
        }
    }, [currentBuildingId]);

    const isItemInspected = useCallback((qrCodeValue: string) => {
        return session?.inspectedItems.some(item => item.qrCodeValue === qrCodeValue) || false;
    }, [session]);
    
    const endInspection = useCallback(async () => {
        if (!session || !currentBuildingId) return;
        
        // We read the latest session state directly before ending it.
        const sessionRef = getSessionRef(currentBuildingId);
        const finalSessionDoc = await getDoc(sessionRef);
        
        if (!finalSessionDoc.exists()) return; // Session already ended elsewhere

        const finalSession = finalSessionDoc.data() as InspectionSession;
        
        // Dynamically import server action to save the data
        const { addInspectionBatchAction } = await import('@/lib/actions');
        try {
            await addInspectionBatchAction(finalSession.clientId, finalSession.buildingId, finalSession.inspectedItems);
            // Clear session by deleting the document from Firestore
            await deleteDoc(sessionRef);
            setSession(null); // Clear local state immediately
        } catch(e) {
            console.error("Failed to save inspection batch", e);
            throw e; // Re-throw to be caught by the UI component
        }
    }, [session, currentBuildingId]);

    const clearSession = useCallback(async () => {
        if (currentBuildingId) {
            await deleteDoc(getSessionRef(currentBuildingId));
        }
        setSession(null);
    }, [currentBuildingId]);
    

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
