'use server';

import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, writeBatch, query, where, setDoc } from 'firebase/firestore';
import type { Extinguisher, Hose, Inspection, Client, Building } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import initialDb from '../../db.json';


async function initializeDb() {
    const clientsRef = collection(db, 'clients');
    const snapshot = await getDocs(clientsRef);
    if (snapshot.empty) {
        console.log('Database is empty, initializing with data from db.json...');
        const batch = writeBatch(db);
        initialDb.clients.forEach(client => {
            const clientDocRef = doc(db, 'clients', client.id);
            const { buildings, ...clientData } = client;
            batch.set(clientDocRef, clientData);

            client.buildings.forEach(building => {
                const buildingDocRef = doc(db, `clients/${client.id}/buildings`, building.id);
                const { extinguishers, hoses, ...buildingData } = building;
                batch.set(buildingDocRef, buildingData);

                building.extinguishers.forEach(extinguisher => {
                    const extDocRef = doc(db, `clients/${client.id}/buildings/${building.id}/extinguishers`, extinguisher.id);
                    batch.set(extDocRef, extinguisher);
                });

                building.hoses.forEach(hose => {
                    const hoseDocRef = doc(db, `clients/${client.id}/buildings/${building.id}/hoses`, hose.id);
                    batch.set(hoseDocRef, hose);
                });
            });
        });
        await batch.commit();
        console.log('Database initialized successfully.');
    } else {
        console.log('Database already contains data.');
    }
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

// --- Equipment Functions ---
export async function getExtinguishersByBuilding(clientId: string, buildingId: string): Promise<Extinguisher[]> {
    const extinguishersColRef = collection(db, `clients/${clientId}/buildings/${buildingId}/extinguishers`);
    const snapshot = await getDocs(extinguishersColRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Extinguisher));
}

export async function getHosesByBuilding(clientId: string, buildingId: string): Promise<Hose[]> {
    const hosesColRef = collection(db, `clients/${clientId}/buildings/${buildingId}/hoses`);
    const snapshot = await getDocs(hosesColRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hose));
}

export async function getExtinguisherById(clientId: string, buildingId: string, id: string): Promise<Extinguisher | null> {
    const docRef = doc(db, `clients/${clientId}/buildings/${buildingId}/extinguishers`, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Extinguisher : null;
}

export async function getHoseById(clientId: string, buildingId: string, id: string): Promise<Hose | null> {
    const docRef = doc(db, `clients/${clientId}/buildings/${buildingId}/hoses`, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Hose : null;
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
