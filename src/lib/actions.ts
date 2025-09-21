'use server';

import { db } from '@/lib/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import type { Extinguisher, Hose, Inspection, Client, Building } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { getExtinguishersByBuilding, getHosesByBuilding } from './data';

// --- Client Actions ---
export async function createClientAction(formData: FormData) {
  const name = formData.get('name') as string;
  if (!name || name.trim().length < 2) {
    throw new Error('O nome do cliente deve ter pelo menos 2 caracteres.');
  }

  const clientsRef = collection(db, 'clients');
  const q = query(clientsRef, where("name", "==", name));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
      throw new Error('Um cliente com este nome já existe.');
  }

  const newClient = {
    name,
  };
  await addDoc(clientsRef, newClient);
  revalidatePath('/');
}


// --- Building Actions ---
export async function createBuildingAction(clientId: string, formData: FormData) {
    const name = formData.get('name') as string;
    if (!name || name.trim().length < 2) {
        throw new Error('O nome do local deve ter pelo menos 2 caracteres.');
    }
    
    const buildingsRef = collection(db, `clients/${clientId}/buildings`);
    const q = query(buildingsRef, where("name", "==", name));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        throw new Error('Um local com este nome já existe para este cliente.');
    }

    const newBuilding = {
        name,
    };
    await addDoc(buildingsRef, newBuilding);
    revalidatePath(`/clients/${clientId}`);
}

// --- Extinguisher Actions ---
export async function createExtinguisherAction(clientId: string, buildingId: string, data: Omit<Extinguisher, 'qrCodeValue' | 'inspections'>) {
    const extinguishersRef = collection(db, `clients/${clientId}/buildings/${buildingId}/extinguishers`);
    const docRef = doc(extinguishersRef, data.id);
    
    const newExtinguisher: Omit<Extinguisher, 'id'> = {
        ...data,
        qrCodeValue: `fireguard-ext-${data.id}`,
        inspections: [],
    };
    await updateDoc(docRef, newExtinguisher, { merge: true }); 
    revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
}

export async function updateExtinguisherAction(clientId: string, buildingId: string, id: string, data: Partial<Omit<Extinguisher, 'id'>>) {
    const docRef = doc(db, `clients/${clientId}/buildings/${buildingId}/extinguishers`, id);
    await updateDoc(docRef, data);
    revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers`);
    revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers/${id}`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
}

export async function deleteExtinguisherAction(clientId: string, buildingId: string, id: string) {
    const docRef = doc(db, `clients/${clientId}/buildings/${buildingId}/extinguishers`, id);
    await deleteDoc(docRef);
    revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
}

// --- Hose Actions ---
export async function createHoseAction(clientId: string, buildingId: string, data: Omit<Hose, 'qrCodeValue' | 'inspections'>) {
    const hosesRef = collection(db, `clients/${clientId}/buildings/${buildingId}/hoses`);
    const docRef = doc(hosesRef, data.id);

    const newHose: Omit<Hose, 'id'> = {
        ...data,
        qrCodeValue: `fireguard-hose-${data.id}`,
        inspections: [],
    };
    await updateDoc(docRef, newHose, { merge: true });
    revalidatePath(`/clients/${clientId}/${buildingId}/hoses`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
}

export async function updateHoseAction(clientId: string, buildingId: string, id: string, data: Partial<Omit<Hose, 'id'>>) {
    const docRef = doc(db, `clients/${clientId}/buildings/${buildingId}/hoses`, id);
    await updateDoc(docRef, data);
    revalidatePath(`/clients/${clientId}/${buildingId}/hoses`);
    revalidatePath(`/clients/${clientId}/${buildingId}/hoses/${id}`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
}

export async function deleteHoseAction(clientId: string, buildingId: string, id: string) {
    const docRef = doc(db, `clients/${clientId}/buildings/${buildingId}/hoses`, id);
    await deleteDoc(docRef);
    revalidatePath(`/clients/${clientId}/${buildingId}/hoses`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
}

// --- Inspection Action ---
export async function addInspectionAction(qrCodeValue: string, inspectionData: Omit<Inspection, 'id'>): Promise<{ redirectUrl: string } | null> {
    const clients = await getDocs(collection(db, 'clients'));
    const newInspection: Inspection = { ...inspectionData, id: `insp-${Date.now()}` };

    for (const clientDoc of clients.docs) {
        const clientId = clientDoc.id;
        const buildings = await getDocs(collection(db, `clients/${clientId}/buildings`));
        for (const buildingDoc of buildings.docs) {
            const buildingId = buildingDoc.id;

            // Check extinguishers
            const extQuery = query(collection(db, `clients/${clientId}/buildings/${buildingId}/extinguishers`), where('qrCodeValue', '==', qrCodeValue));
            const extSnapshot = await getDocs(extQuery);
            if (!extSnapshot.empty) {
                const extDoc = extSnapshot.docs[0];
                const extinguisher = { id: extDoc.id, ...extDoc.data() } as Extinguisher;
                const inspections = extinguisher.inspections || [];
                inspections.push(newInspection);
                await updateDoc(extDoc.ref, { inspections });
                const path = `/clients/${clientId}/${buildingId}/extinguishers/${extinguisher.id}`;
                revalidatePath(path);
                return { redirectUrl: path };
            }

            // Check hoses
            const hoseQuery = query(collection(db, `clients/${clientId}/buildings/${buildingId}/hoses`), where('qrCodeValue', '==', qrCodeValue));
            const hoseSnapshot = await getDocs(hoseQuery);
            if (!hoseSnapshot.empty) {
                const hoseDoc = hoseSnapshot.docs[0];
                const hose = { id: hoseDoc.id, ...hoseDoc.data() } as Hose;
                const inspections = hose.inspections || [];
                inspections.push(newInspection);
                await updateDoc(hoseDoc.ref, { inspections });
                const path = `/clients/${clientId}/${buildingId}/hoses/${hose.id}`;
                revalidatePath(path);
                return { redirectUrl: path };
            }
        }
    }
    return null; // Equipment not found
}

// --- Report Action ---
export async function getReportDataAction(clientId: string, buildingId: string) {
  const extinguishers = await getExtinguishersByBuilding(clientId, buildingId);
  const hoses = await getHosesByBuilding(clientId, buildingId);
  return { extinguishers, hoses };
}
