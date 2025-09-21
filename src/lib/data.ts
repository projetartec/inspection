'use server';

import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, writeBatch, query, where, setDoc, Timestamp } from 'firebase/firestore';
import type { Extinguisher, Hose, Inspection, Client, Building } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import initialDb from '../../db.json';
import { format } from 'date-fns';


async function initializeDb() {
    const clientsRef = collection(db, 'clients');
    const snapshot = await getDocs(clientsRef);

    console.log('Forcing database re-initialization...');

    // Clear existing data
    const deleteBatch = writeBatch(db);
    for (const clientDoc of snapshot.docs) {
      const buildingsRef = collection(db, `clients/${clientDoc.id}/buildings`);
      const buildingsSnapshot = await getDocs(buildingsRef);
      for (const buildingDoc of buildingsSnapshot.docs) {
        const extinguishersRef = collection(db, `clients/${clientDoc.id}/buildings/${buildingDoc.id}/extinguishers`);
        const extinguishersSnapshot = await getDocs(extinguishersRef);
        extinguishersSnapshot.forEach(doc => deleteBatch.delete(doc.ref));
        
        const hosesRef = collection(db, `clients/${clientDoc.id}/buildings/${buildingDoc.id}/hoses`);
        const hosesSnapshot = await getDocs(hosesRef);
        hosesSnapshot.forEach(doc => deleteBatch.delete(doc.ref));

        deleteBatch.delete(buildingDoc.ref);
      }
      deleteBatch.delete(clientDoc.ref);
    }
    await deleteBatch.commit();
    console.log('Existing data cleared.');

    // Initialize with new data
    const addBatch = writeBatch(db);
    initialDb.clients.forEach(client => {
        const clientDocRef = doc(db, 'clients', client.id);
        const { buildings, ...clientData } = client;
        addBatch.set(clientDocRef, clientData);

        if (client.buildings) {
            client.buildings.forEach(building => {
                const buildingDocRef = doc(db, `clients/${client.id}/buildings`, building.id);
                const { extinguishers, hoses, ...buildingData } = building;
                addBatch.set(buildingDocRef, buildingData);

                if (building.extinguishers) {
                    building.extinguishers.forEach(extinguisher => {
                        const extDocRef = doc(db, `clients/${client.id}/buildings/${building.id}/extinguishers`, extinguisher.id);
                        addBatch.set(extDocRef, extinguisher);
                    });
                }

                if (building.hoses) {
                    building.hoses.forEach(hose => {
                        const hoseDocRef = doc(db, `clients/${client.id}/buildings/${building.id}/hoses`, hose.id);
                        addBatch.set(hoseDocRef, hose);
                    });
                }
            });
        }
    });
    await addBatch.commit();
    console.log('Database initialized successfully with new data.');
}


// --- Client Functions ---
export async function getClients(): Promise<Client[]> {
  try {
    await initializeDb();
    const clientsCol = collection(db, 'clients');
    const clientSnapshot = await getDocs(clientsCol);
    if (clientSnapshot.empty) {
      return [];
    }
    const clientList = clientSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
    return clientList;
  } catch (error) {
    console.error("Error fetching clients:", error);
    // Return an empty array or handle as per app's error policy
    return [];
  }
}

export async function getClientById(clientId: string): Promise<Client | null> {
  const clientDocRef = doc(db, 'clients', clientId);
  const clientDoc = await getDoc(clientDocRef);
  if (!clientDoc.exists()) {
    return null;
  }
  return { id: clientDoc.id, ...clientDoc.data() } as Client;
}


// --- Building Functions ---
export async function getBuildingById(clientId: string, buildingId: string): Promise<Building | null> {
    const buildingDocRef = doc(db, `clients/${clientId}/buildings`, buildingId);
    const buildingDoc = await getDoc(buildingDocRef);
    return buildingDoc.exists() ? { id: buildingDoc.id, ...buildingDoc.data() } as Building : null;
}

export async function getBuildingsByClient(clientId: string): Promise<Building[]> {
  const buildingsColRef = collection(db, `clients/${clientId}/buildings`);
  const snapshot = await getDocs(buildingsColRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Building));
}

function toISODateString(date: any): string {
    if (!date) return '';
    if (typeof date === 'string') {
        // If it's already a string in 'YYYY-MM-DD' format, return it.
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return date;
        }
         if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(date)) {
            return date.split('T')[0];
        }
        // If it's another string format, try parsing
        const parsedDate = new Date(date);
        if (!isNaN(parsedDate.getTime())) {
            return format(parsedDate, 'yyyy-MM-dd');
        }
        return '';
    }
    if (date instanceof Timestamp) {
      return format(date.toDate(), 'yyyy-MM-dd');
    }
    if (date instanceof Date) {
        return format(date, 'yyyy-MM-dd');
    }
    return '';
}

// --- Equipment Functions ---
export async function getExtinguishersByBuilding(clientId: string, buildingId: string): Promise<Extinguisher[]> {
    const extinguishersColRef = collection(db, `clients/${clientId}/buildings/${buildingId}/extinguishers`);
    const snapshot = await getDocs(extinguishersColRef);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
            id: doc.id, 
            ...data,
            expiryDate: toISODateString(data.expiryDate)
        } as Extinguisher
    });
}

export async function getHosesByBuilding(clientId: string, buildingId: string): Promise<Hose[]> {
    const hosesColRef = collection(db, `clients/${clientId}/buildings/${buildingId}/hoses`);
    const snapshot = await getDocs(hosesColRef);
     return snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
            id: doc.id, 
            ...data,
            expiryDate: toISODateString(data.expiryDate)
        } as Hose
    });
}

export async function getExtinguisherById(clientId: string, buildingId: string, id: string): Promise<Extinguisher | null> {
    const docRef = doc(db, `clients/${clientId}/buildings/${buildingId}/extinguishers`, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    return { 
        id: docSnap.id, 
        ...data,
        expiryDate: toISODateString(data.expiryDate)
    } as Extinguisher;
}

export async function getHoseById(clientId: string, buildingId: string, id: string): Promise<Hose | null> {
    const docRef = doc(db, `clients/${clientId}/buildings/${buildingId}/hoses`, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    
    const data = docSnap.data();
    return {
         id: docSnap.id, 
         ...data,
         expiryDate: toISODateString(data.expiryDate)
    } as Hose;
}


export async function addInspection(clientId: string, buildingId: string, qrCodeValue: string, inspectionData: Omit<Inspection, 'id'>): Promise<{ redirectUrl: string } | null> {
    const newInspection: Inspection = { ...inspectionData, id: `insp-${Date.now()}` };

    // Check extinguishers in the specific building
    const extQuery = query(collection(db, `clients/${clientId}/buildings/${buildingId}/extinguishers`), where('qrCodeValue', '==', qrCodeValue));
    const extSnapshot = await getDocs(extQuery);
    if (!extSnapshot.empty) {
        const extDoc = extSnapshot.docs[0];
        const extinguisher = { id: extDoc.id, ...extDoc.data() } as Extinguisher;
        const inspections = extinguisher.inspections || [];
        inspections.push(newInspection);
        await updateDoc(extDoc.ref, { inspections });
        const redirectUrl = `/clients/${clientId}/${buildingId}/extinguishers/${extinguisher.id}`;
        revalidatePath(redirectUrl);
        revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
        return { redirectUrl };
    }

    // Check hoses in the specific building
    const hoseQuery = query(collection(db, `clients/${clientId}/buildings/${buildingId}/hoses`), where('qrCodeValue', '==', qrCodeValue));
    const hoseSnapshot = await getDocs(hoseQuery);
    if (!hoseSnapshot.empty) {
        const hoseDoc = hoseSnapshot.docs[0];
        const hose = { id: hoseDoc.id, ...hoseDoc.data() } as Hose;
        const inspections = hose.inspections || [];
        inspections.push(newInspection);
        await updateDoc(hoseDoc.ref, { inspections });
        const redirectUrl = `/clients/${clientId}/${buildingId}/hoses/${hose.id}`;
        revalidatePath(redirectUrl);
        revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
        return { redirectUrl };
    }
    
    return null; // Equipment not found
}

    
