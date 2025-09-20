'use server';
import { db } from '@/lib/firebase';
import { 
    collection, 
    getDocs, 
    doc, 
    getDoc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where,
    Timestamp,
    setDoc
} from 'firebase/firestore';
import type { Extinguisher, Hose, Inspection, Client, Building } from '@/lib/types';
import { revalidatePath } from 'next/cache';

// --- Helper Functions to convert Firestore Timestamps ---
function convertTimestamps<T>(docData: any): T {
    const data = { ...docData };
    for (const key in data) {
        if (data[key] instanceof Timestamp) {
            data[key] = data[key].toDate();
        }
        if(key === 'inspections' && Array.isArray(data[key])) {
            data[key] = data[key].map((insp: any) => convertTimestamps(insp));
        }
    }
    return data as T;
}


// --- Client Functions ---
export async function getClients(): Promise<Client[]> {
    const clientsCol = collection(db, 'clients');
    const clientSnapshot = await getDocs(clientsCol);
    const clients = clientSnapshot.docs.map(doc => convertTimestamps<Client>({ ...doc.data(), id: doc.id }));
    return clients;
}

export async function getClientById(clientId: string): Promise<Client | null> {
    const clientDocRef = doc(db, 'clients', clientId);
    const clientDoc = await getDoc(clientDocRef);
    if (!clientDoc.exists()) {
        return null;
    }
    const clientData = convertTimestamps<Client>({ ...clientDoc.data(), id: clientDoc.id });
    
    // Fetch buildings subcollection
    const buildingsCol = collection(db, `clients/${clientId}/buildings`);
    const buildingSnapshot = await getDocs(buildingsCol);
    clientData.buildings = buildingSnapshot.docs.map(doc => convertTimestamps<Building>({ ...doc.data(), id: doc.id, extinguishers: [], hoses: [] }));

    return clientData;
}


export async function addClient(data: { name: string }): Promise<Client | { message: string }> {
  try {
    const clientsCol = collection(db, 'clients');
    const newDocRef = await addDoc(clientsCol, data);
    const newClient: Client = {
        id: newDocRef.id,
        name: data.name,
        buildings: []
    };
    return newClient;
  } catch (error: any) {
    console.error("Error adding client: ", error);
    return { message: "Falha ao adicionar cliente no banco de dados." };
  }
}

// --- Building Functions ---
export async function getBuildingById(clientId: string, buildingId: string): Promise<Building | null> {
    const buildingDocRef = doc(db, `clients/${clientId}/buildings`, buildingId);
    const buildingDoc = await getDoc(buildingDocRef);
    if (!buildingDoc.exists()) {
        return null;
    }
    return convertTimestamps<Building>({ ...buildingDoc.data(), id: buildingDoc.id } as Building);
}

export async function addBuilding(clientId: string, name: string): Promise<Building> {
    const buildingsCol = collection(db, `clients/${clientId}/buildings`);
    const newDocRef = await addDoc(buildingsCol, { name });
    return {
        id: newDocRef.id,
        name: name,
        extinguishers: [],
        hoses: [],
    };
}


// --- Equipment Functions ---
export async function getExtinguishersByBuilding(clientId: string, buildingId: string): Promise<Extinguisher[]> {
    const extinguishersCol = collection(db, `clients/${clientId}/buildings/${buildingId}/extinguishers`);
    const extinguisherSnapshot = await getDocs(extinguishersCol);
    return extinguisherSnapshot.docs.map(doc => convertTimestamps<Extinguisher>({ ...doc.data(), id: doc.id }));
}

export async function getHosesByBuilding(clientId: string, buildingId: string): Promise<Hose[]> {
    const hosesCol = collection(db, `clients/${clientId}/buildings/${buildingId}/hoses`);
    const hoseSnapshot = await getDocs(hosesCol);
    return hoseSnapshot.docs.map(doc => convertTimestamps<Hose>({ ...doc.data(), id: doc.id }));
}

export async function getExtinguisherById(clientId: string, buildingId: string, id: string): Promise<Extinguisher | null> {
    const docRef = doc(db, `clients/${clientId}/buildings/${buildingId}/extinguishers`, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return convertTimestamps<Extinguisher>({ ...docSnap.data(), id: docSnap.id });
    }
    return null;
}

export async function getHoseById(clientId: string, buildingId: string, id: string): Promise<Hose | null> {
    const docRef = doc(db, `clients/${clientId}/buildings/${buildingId}/hoses`, id);
    const docSnap = await getDoc(docRef);
     if (docSnap.exists()) {
        return convertTimestamps<Hose>({ ...docSnap.data(), id: docSnap.id });
    }
    return null;
}

export async function addExtinguisher(clientId: string, buildingId: string, data: Omit<Extinguisher, 'qrCodeValue' | 'inspections'>) {
    const { id, ...rest } = data;
    const docRef = doc(db, `clients/${clientId}/buildings/${buildingId}/extinguishers`, id);
    const newExtinguisherData = {
        ...rest,
        id: id,
        qrCodeValue: `fireguard-ext-${id}`,
        inspections: [],
    };
    await setDoc(docRef, newExtinguisherData);
}

export async function addHose(clientId: string, buildingId: string, data: Omit<Hose, 'qrCodeValue' | 'inspections'>) {
    const { id, ...rest } = data;
    const docRef = doc(db, `clients/${clientId}/buildings/${buildingId}/hoses`, id);
    const newHoseData = {
        ...rest,
        id: id,
        qrCodeValue: `fireguard-hose-${id}`,
        inspections: [],
    };
    await setDoc(docRef, newHoseData);
}


export async function updateExtinguisher(clientId: string, buildingId: string, id: string, data: Partial<Omit<Extinguisher, 'id'>>) {
    const docRef = doc(db, `clients/${clientId}/buildings/${buildingId}/extinguishers`, id);
    await updateDoc(docRef, data);
}

export async function updateHose(clientId: string, buildingId: string, id: string, data: Partial<Omit<Hose, 'id'>>) {
    const docRef = doc(db, `clients/${clientId}/buildings/${buildingId}/hoses`, id);
    await updateDoc(docRef, data);
}


export async function deleteExtinguisher(clientId: string, buildingId: string, id: string) {
  const docRef = doc(db, `clients/${clientId}/buildings/${buildingId}/extinguishers`, id);
  await deleteDoc(docRef);
}

export async function deleteHose(clientId: string, buildingId: string, id: string) {
  const docRef = doc(db, `clients/${clientId}/buildings/${buildingId}/hoses`, id);
  await deleteDoc(docRef);
}


export async function addInspection(qrCodeValue: string, inspectionData: Omit<Inspection, 'id'>): Promise<{ redirectUrl: string } | null> {
    const newInspectionId = `insp-${Date.now()}`;
    const newInspection: Inspection = { ...inspectionData, id: newInspectionId };
    
    const clientsSnapshot = await getDocs(collection(db, 'clients'));

    for (const clientDoc of clientsSnapshot.docs) {
        const buildingsSnapshot = await getDocs(collection(db, `clients/${clientDoc.id}/buildings`));
        for (const buildingDoc of buildingsSnapshot.docs) {

            // Check extinguishers
            const extinguishersRef = collection(db, `clients/${clientDoc.id}/buildings/${buildingDoc.id}/extinguishers`);
            const qExt = query(extinguishersRef, where("qrCodeValue", "==", qrCodeValue));
            const extSnapshot = await getDocs(qExt);
            if (!extSnapshot.empty) {
                const extinguisherDoc = extSnapshot.docs[0];
                const extinguisherData = extinguisherDoc.data() as Extinguisher;
                const updatedInspections = [...(extinguisherData.inspections || []), newInspection];
                await updateDoc(extinguisherDoc.ref, { inspections: updatedInspections });
                revalidatePath(`/clients/${clientDoc.id}/${buildingDoc.id}/extinguishers/${extinguisherDoc.id}`);
                return { redirectUrl: `/clients/${clientDoc.id}/${buildingDoc.id}/extinguishers/${extinguisherDoc.id}` };
            }

            // Check hoses
            const hosesRef = collection(db, `clients/${clientDoc.id}/buildings/${buildingDoc.id}/hoses`);
            const qHose = query(hosesRef, where("qrCodeValue", "==", qrCodeValue));
            const hoseSnapshot = await getDocs(qHose);
            if (!hoseSnapshot.empty) {
                const hoseDoc = hoseSnapshot.docs[0];
                const hoseData = hoseDoc.data() as Hose;
                const updatedInspections = [...(hoseData.inspections || []), newInspection];
                await updateDoc(hoseDoc.ref, { inspections: updatedInspections });
                revalidatePath(`/clients/${clientDoc.id}/${buildingDoc.id}/hoses/${hoseDoc.id}`);
                return { redirectUrl: `/clients/${clientDoc.id}/${buildingDoc.id}/hoses/${hoseDoc.id}` };
            }
        }
    }

    return null;
}

export async function getReportDataAction(clientId: string, buildingId: string) {
  const extinguishers = await getExtinguishersByBuilding(clientId, buildingId);
  const hoses = await getHosesByBuilding(clientId, buildingId);
  return { extinguishers, hoses };
}
