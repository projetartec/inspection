
"use client";

import { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import type { Inspection } from '@/lib/types';
import { db } from '@/lib/firebase-client';
import { doc, onSnapshot, getDoc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

export interface InspectedItem extends Omit<Inspection, 'id'> {
    qrCodeValue: string;
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

const SESSIONS_COLLECTION = 'inspectionSessions';

const getSessionRef = (buildingId: string) => doc(db, SESSIONS_COLLECTION, buildingId);

export const InspectionProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<InspectionSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentBuildingId, setCurrentBuildingId] = useState<string | null>(null);
    const unsubscribeRef = useRef<(() => void) | null>(null);

    // Cleanup subscription on unmount
    useEffect(() => {
        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
            }
        };
    }, []);

    const startInspection = useCallback(async (clientId: string, buildingId: string) => {
        // If we are already subscribed to this building, do nothing.
        if (currentBuildingId === buildingId) {
            // But if there's no session, let's ensure it gets created.
            if (!session) {
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
                 }
            }
            return;
        }

        setIsLoading(true);
        setCurrentBuildingId(buildingId);

        // Unsubscribe from previous listener if it exists
        if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
        }

        const sessionRef = getSessionRef(buildingId);

        // Listen for real-time updates
        unsubscribeRef.current = onSnapshot(sessionRef, (docSnap) => {
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

        // Ensure session document exists
        const docSnap = await getDoc(sessionRef);
        if (!docSnap.exists()) {
            const newSession: InspectionSession = {
                clientId,
                buildingId,
                startTime: new Date().toISOString(),
                inspectedItems: [],
            };
            try {
                await setDoc(sessionRef, newSession);
                // The onSnapshot listener will pick this up and set the session state
            } catch (error) {
                console.error("Error creating new session:", error);
            }
        }
    }, [currentBuildingId, session]);
    
    const addItemToInspection = useCallback(async (item: InspectedItem) => {
        if (!currentBuildingId) return;

        const sessionRef = getSessionRef(currentBuildingId);
        
        try {
            const currentDoc = await getDoc(sessionRef);
            if (currentDoc.exists()) {
                const currentSession = currentDoc.data() as InspectionSession;
                const otherItems = currentSession.inspectedItems.filter(i => i.qrCodeValue !== item.qrCodeValue);
                const updatedItems = [...otherItems, item];
                
                await updateDoc(sessionRef, { inspectedItems: updatedItems });
            }
        } catch (error) {
            console.error("Error adding item to inspection:", error);
        }
    }, [currentBuildingId]);

    const isItemInspected = useCallback((qrCodeValue: string) => {
        return session?.inspectedItems.some(item => item.qrCodeValue === qrCodeValue) || false;
    }, [session]);
    
    const endInspection = useCallback(async () => {
        if (!session || !currentBuildingId) {
            throw new Error("Nenhuma sessão de inspeção ativa para finalizar.");
        };
        
        const sessionRef = getSessionRef(currentBuildingId);
        const finalSessionDoc = await getDoc(sessionRef);
        
        if (!finalSessionDoc.exists()) return;

        const finalSession = finalSessionDoc.data() as InspectionSession;
        
        // Dynamically import server action
        const { addInspectionBatchAction } = await import('@/lib/actions');
        try {
            await addInspectionBatchAction(finalSession.clientId, finalSession.buildingId, finalSession.inspectedItems);
            // After successfully saving, delete the session doc
            await deleteDoc(sessionRef);
            setSession(null); // Clear local state immediately
        } catch(e) {
            console.error("Failed to save inspection batch", e);
            throw e; // Rethrow to be caught by the UI
        }
    }, [session, currentBuildingId]);

    const clearSession = useCallback(async () => {
        if (currentBuildingId) {
            const sessionRef = getSessionRef(currentBuildingId);
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }
            try {
                await deleteDoc(sessionRef);
            } catch (error) {
                console.log("No session to clear or error clearing session:", error);
            } finally {
                setSession(null);
                setCurrentBuildingId(null);
            }
        }
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
