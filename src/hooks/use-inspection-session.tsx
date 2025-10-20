
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
    startInspection: (clientId: string, buildingId: string, forceCreate?: boolean) => void;
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

    useEffect(() => {
        // Cleanup previous subscription when component unmounts or buildingId changes
        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
            }
        };
    }, []);

    const startInspection = useCallback(async (clientId: string, buildingId: string, forceCreate = false) => {
        if (currentBuildingId === buildingId && !forceCreate) {
            return;
        }

        setIsLoading(true);
        setCurrentBuildingId(buildingId);

        if (unsubscribeRef.current) {
            unsubscribeRef.current();
        }

        const sessionRef = getSessionRef(buildingId);

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
        
        if (forceCreate) {
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
    }, [currentBuildingId]);
    
    const addItemToInspection = useCallback(async (item: InspectedItem) => {
        if (!currentBuildingId) return;

        const sessionRef = getSessionRef(currentBuildingId);
        
        const currentDoc = await getDoc(sessionRef);
        if (currentDoc.exists()) {
            const currentSession = currentDoc.data() as InspectionSession;
            const otherItems = currentSession.inspectedItems.filter(i => i.qrCodeValue !== item.qrCodeValue);
            const updatedItems = [...otherItems, item];
            
            await updateDoc(sessionRef, { inspectedItems: updatedItems });
        }
    }, [currentBuildingId]);

    const isItemInspected = useCallback((qrCodeValue: string) => {
        return session?.inspectedItems.some(item => item.qrCodeValue === qrCodeValue) || false;
    }, [session]);
    
    const endInspection = useCallback(async () => {
        if (!session || !currentBuildingId) return;
        
        const sessionRef = getSessionRef(currentBuildingId);
        const finalSessionDoc = await getDoc(sessionRef);
        
        if (!finalSessionDoc.exists()) return;

        const finalSession = finalSessionDoc.data() as InspectionSession;
        
        const { addInspectionBatchAction } = await import('@/lib/actions');
        try {
            await addInspectionBatchAction(finalSession.clientId, finalSession.buildingId, finalSession.inspectedItems);
            await deleteDoc(sessionRef);
            setSession(null);
        } catch(e) {
            console.error("Failed to save inspection batch", e);
            throw e;
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
