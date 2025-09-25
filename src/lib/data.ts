'use server';

import type { Extinguisher, Hydrant, Client, Building } from '@/lib/types';
import {
  doc,
  getDoc,
  getDocs,
  collection,
  setDoc,
  deleteDoc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase'; // Use db from firebase config
import { ExtinguisherFormValues, HydrantFormValues } from './schemas';
import type { InspectedItem } from '@/hooks/use-inspection-session.tsx';
import { revalidatePath } from 'next/cache';

const CLIENTS_COLLECTION = 'clients';

function docToClient(doc: any): Client {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    buildings: data.buildings || [],
  };
}

// --- Client Functions ---
export async function getClients(): Promise<Client[]> {
  try {
    const querySnapshot = await getDocs(collection(db, CLIENTS_COLLECTION));
    return querySnapshot.docs.map(docToClient);
  } catch (error) {
    console.error("Error fetching clients: ", error);
    return [];
  }
}

export async function getClientById(clientId: string): Promise<Client | null> {
  try {
    const docRef = doc(db, CLIENTS_COLLECTION, clientId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docToClient(docSnap);
    }
    return null;
  } catch (error) {
    console.error(`Error fetching client ${clientId}: `, error);
    return null;
  }
}

export async function addClient(newClientData: { name: string }): Promise<string> {
    const clients = await getClients();
    const nameExists = clients.some(client => client.name.toLowerCase() === newClientData.name.toLowerCase());
    if (nameExists) {
        throw new Error('Um cliente com este nome já existe.');
    }
    
    const id = `client-${Date.now()}`;
    const newClient: Omit<Client, 'id'> = {
        name: newClientData.name,
        buildings: []
    };
    await setDoc(doc(db, CLIENTS_COLLECTION, id), newClient);
    return id;
}

export async function updateClient(id: string, updatedData: Partial<Client>) {
  const docRef = doc(db, CLIENTS_COLLECTION, id);
  await setDoc(docRef, updatedData, { merge: true });
}

export async function deleteClient(id: string) {
  const docRef = doc(db, CLIENTS_COLLECTION, id);
  await deleteDoc(docRef);
}


// --- Building Functions ---
export async function getBuildingById(clientId: string, buildingId: string): Promise<Building | null> {
    const client = await getClientById(clientId);
    return client?.buildings.find(b => b.id === buildingId) || null;
}

export async function getBuildingsByClient(clientId: string): Promise<Building[]> {
  const client = await getClientById(clientId);
  return client?.buildings || [];
}

export async function addBuilding(clientId: string, newBuildingData: { name: string }): Promise<void> {
    const client = await getClientById(clientId);
    if (!client) throw new Error('Cliente não encontrado.');

    const nameExists = client.buildings.some(b => b.name.toLowerCase() === newBuildingData.name.toLowerCase());
    if (nameExists) {
        throw new Error('Um local com este nome já existe para este cliente.');
    }

    const newBuilding: Building = {
        id: `bldg-${Date.now()}`,
        name: newBuildingData.name,
        extinguishers: [],
        hoses: []
    };

    client.buildings.push(newBuilding);
    await updateClient(clientId, { buildings: client.buildings });
}

export async function updateBuilding(clientId: string, buildingId: string, updatedData: Partial<Building>) {
    const client = await getClientById(clientId);
    if (!client) throw new Error('Cliente não encontrado.');

    const buildingIndex = client.buildings.findIndex(b => b.id === buildingId);
    if (buildingIndex === -1) throw new Error('Local não encontrado.');
    
    client.buildings[buildingIndex] = { ...client.buildings[buildingIndex], ...updatedData };
    await updateClient(clientId, { buildings: client.buildings });
}

export async function deleteBuilding(clientId: string, buildingId: string) {
    const client = await getClientById(clientId);
    if (!client) throw new Error('Cliente não encontrado.');

    client.buildings = client.buildings.filter(b => b.id !== buildingId);
    await updateClient(clientId, { buildings: client.buildings });
}

// --- Equipment Functions ---
export async function getExtinguishersByBuilding(clientId: string, buildingId: string): Promise<Extinguisher[]> {
    const building = await getBuildingById(clientId, buildingId);
    return building?.extinguishers || [];
}

export async function getHosesByBuilding(clientId: string, buildingId: string): Promise<Hydrant[]> {
    const building = await getBuildingById(clientId, buildingId);
    return building?.hoses || [];
}

export async function getExtinguisherById(clientId: string, buildingId: string, id: string): Promise<Extinguisher | null> {
    const building = await getBuildingById(clientId, buildingId);
    return building?.extinguishers.find(e => e.id === id) || null;
}

export async function getHoseById(clientId: string, buildingId: string, id: string): Promise<Hydrant | null> {
    const building = await getBuildingById(clientId, buildingId);
    return building?.hoses.find(h => h.id === id) || null;
}

export async function addExtinguisher(clientId: string, buildingId: string, newExtinguisherData: ExtinguisherFormValues) {
    const client = await getClientById(clientId);
    if (!client) throw new Error('Cliente não encontrado.');
    
    const building = client.buildings.find(b => b.id === buildingId);
    if (!building) throw new Error('Local não encontrado.');

    const idExists = building.extinguishers.some(e => e.id === newExtinguisherData.id);
    if (idExists) throw new Error('Já existe um extintor com este ID neste local.');

    const newExtinguisher: Extinguisher = {
        ...newExtinguisherData,
        qrCodeValue: `fireguard-ext-${newExtinguisherData.id}`,
        inspections: [],
    };
    
    building.extinguishers.push(newExtinguisher);
    await updateClient(clientId, { buildings: client.buildings });
}

export async function updateExtinguisher(clientId: string, buildingId: string, id: string, updatedData: Partial<ExtinguisherFormValues>) {
    const client = await getClientById(clientId);
    if (!client) throw new Error('Cliente não encontrado.');
    const building = client.buildings.find(b => b.id === buildingId);
    if (!building) throw new Error('Local não encontrado.');
    const extIndex = building.extinguishers.findIndex(e => e.id === id);
    if (extIndex === -1) throw new Error('Extintor não encontrado.');

    building.extinguishers[extIndex] = { ...building.extinguishers[extIndex], ...updatedData };
    await updateClient(clientId, { buildings: client.buildings });
}

export async function deleteExtinguisher(clientId: string, buildingId: string, id: string) {
    const client = await getClientById(clientId);
    if (!client) throw new Error('Cliente não encontrado.');
    const building = client.buildings.find(b => b.id === buildingId);
    if (!building) throw new Error('Local não encontrado.');

    building.extinguishers = building.extinguishers.filter(e => e.id !== id);
    await updateClient(clientId, { buildings: client.buildings });
}

export async function addHose(clientId: string, buildingId: string, newHoseData: HydrantFormValues) {
    const client = await getClientById(clientId);
    if (!client) throw new Error('Cliente não encontrado.');
    const building = client.buildings.find(b => b.id === buildingId);
    if (!building) throw new Error('Local não encontrado.');

    const idExists = building.hoses.some(h => h.id === newHoseData.id);
    if (idExists) throw new Error('Já existe um hidrante com este ID neste local.');
    
    const newHose: Hydrant = {
        ...newHoseData,
        qrCodeValue: `fireguard-hose-${newHoseData.id}`,
        inspections: [],
    };
    
    building.hoses.push(newHose);
    await updateClient(clientId, { buildings: client.buildings });
}

export async function updateHose(clientId: string, buildingId: string, id: string, updatedData: Partial<HydrantFormValues>) {
    const client = await getClientById(clientId);
    if (!client) throw new Error('Cliente não encontrado.');
    const building = client.buildings.find(b => b.id === buildingId);
    if (!building) throw new Error('Local não encontrado.');
    const hoseIndex = building.hoses.findIndex(h => h.id === id);
    if (hoseIndex === -1) throw new Error('Hidrante não encontrado.');

    building.hoses[hoseIndex] = { ...building.hoses[hoseIndex], ...updatedData };
    await updateClient(clientId, { buildings: client.buildings });
}

export async function deleteHose(clientId: string, buildingId: string, id: string) {
    const client = await getClientById(clientId);
    if (!client) throw new Error('Cliente não encontrado.');
    const building = client.buildings.find(b => b.id === buildingId);
    if (!building) throw new Error('Local não encontrado.');

    building.hoses = building.hoses.filter(h => h.id !== id);
    await updateClient(clientId, { buildings: client.buildings });
}


// --- Inspection Action ---
export async function addInspectionBatch(clientId: string, buildingId: string, inspectedItems: InspectedItem[]) {
    const client = await getClientById(clientId);
    if (!client) throw new Error('Client not found');

    const building = client.buildings.find(b => b.id === buildingId);
    if (!building) throw new Error('Building not found');

    inspectedItems.forEach(item => {
        const newInspection: Inspection = {
            id: `insp-${Date.now()}-${Math.random()}`,
            date: item.date,
            location: item.location,
            notes: item.notes,
            status: item.status,
        };

        const extinguisher = building.extinguishers.find(e => e.qrCodeValue === item.qrCodeValue);
        if (extinguisher) {
            extinguisher.inspections = extinguisher.inspections || [];
            extinguisher.inspections.push(newInspection);
        }

        const hose = building.hoses.find(h => h.qrCodeValue === item.qrCodeValue);
        if (hose) {
            hose.inspections = hose.inspections || [];
            hose.inspections.push(newInspection);
        }
    });

    await updateClient(clientId, { buildings: client.buildings });
}

// --- Report Action ---
export async function getReportDataAction(clientId: string, buildingId: string) {
    const [client, building, extinguishers, hoses] = await Promise.all([
        getClientById(clientId),
        getBuildingById(clientId, buildingId),
        getExtinguishersByBuilding(clientId, buildingId),
        getHosesByBuilding(clientId, buildingId)
    ]);

    return { client, building, extinguishers, hoses };
}

// --- Initial Data Seeding ---
async function seedInitialData() {
    const querySnapshot = await getDocs(collection(db, CLIENTS_COLLECTION));
    if (querySnapshot.empty) {
        console.log("No clients found, seeding initial data...");
        const initialDb = (await import('@/db.json')).default;
        const batch = writeBatch(db);
        initialDb.clients.forEach((client: Client) => {
            const docRef = doc(db, CLIENTS_COLLECTION, client.id);
            batch.set(docRef, {
                name: client.name,
                buildings: client.buildings || []
            });
        });
        await batch.commit();
        console.log("Initial data seeded successfully.");
    }
}

seedInitialData().catch(console.error);
