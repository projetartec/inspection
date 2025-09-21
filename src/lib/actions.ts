'use server';

import { db } from '@/lib/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import type { Extinguisher, Hose, Client, Building } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

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
    buildings: [],
  };
  const docRef = await addDoc(clientsRef, newClient);
  revalidatePath('/');
  redirect(`/clients/${docRef.id}`);
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
        extinguishers: [],
        hoses: [],
    };
    await addDoc(buildingsRef, newBuilding);
    revalidatePath(`/clients/${clientId}`);
}

// --- Extinguisher Actions ---
export async function createExtinguisherAction(clientId: string, buildingId: string, data: Omit<Extinguisher, 'qrCodeValue' | 'inspections'>) {
    const extinguishersRef = collection(db, `clients/${clientId}/buildings/${buildingId}/extinguishers`);
    const docRef = doc(extinguishersRef, data.id); // Use provided ID
    
    const newExtinguisher: Extinguisher = {
        ...data,
        qrCodeValue: `fireguard-ext-${data.id}`,
        inspections: [],
    };
    await updateDoc(docRef, newExtinguisher, { merge: true }); // Use updateDoc with merge to act like add
    revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers`);
}

export async function updateExtinguisherAction(clientId: string, buildingId: string, id: string, data: Partial<Omit<Extinguisher, 'id'>>) {
    const docRef = doc(db, `clients/${clientId}/buildings/${buildingId}/extinguishers`, id);
    await updateDoc(docRef, data);
    revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers`);
    revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers/${id}`);
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

    const newHose: Hose = {
        ...data,
        qrCodeValue: `fireguard-hose-${data.id}`,
        inspections: [],
    };
    await updateDoc(docRef, newHose, { merge: true });
    revalidatePath(`/clients/${clientId}/${buildingId}/hoses`);
}

export async function updateHoseAction(clientId: string, buildingId: string, id: string, data: Partial<Omit<Hose, 'id'>>) {
    const docRef = doc(db, `clients/${clientId}/buildings/${buildingId}/hoses`, id);
    await updateDoc(docRef, data);
    revalidatePath(`/clients/${clientId}/${buildingId}/hoses`);
    revalidatePath(`/clients/${clientId}/${buildingId}/hoses/${id}`);
}

export async function deleteHoseAction(clientId: string, buildingId: string, id: string) {
    const docRef = doc(db, `clients/${clientId}/buildings/${buildingId}/hoses`, id);
    await deleteDoc(docRef);
    revalidatePath(`/clients/${clientId}/${buildingId}/hoses`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
}

// --- Report Action ---
export async function getReportDataAction(clientId: string, buildingId: string) {
  const extinguishers = await getExtinguishersByBuilding(clientId, buildingId);
  const hoses = await getHosesByBuilding(clientId, buildingId);
  return { extinguishers, hoses };
}