
'use server';

import { db } from '@/lib/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, setDoc, getDoc, writeBatch } from 'firebase/firestore';
import type { Extinguisher, Hose, Inspection, Client, Building } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import * as fs from 'fs/promises';
import path from 'path';
import { ExtinguisherFormValues, HoseFormValues } from './schemas';

const dbPath = path.join(process.cwd(), 'src', 'db.json');

async function readDb(): Promise<{ clients: Client[] }> {
    try {
        const data = await fs.readFile(dbPath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading db.json:', error);
        return { clients: [] };
    }
}

async function writeDb(data: { clients: Client[] }): Promise<void> {
    try {
        await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error('Error writing to db.json:', error);
    }
}

// --- Client Actions ---
export async function createClientAction(formData: FormData) {
  const name = formData.get('name') as string;
  if (!name || name.trim().length < 2) {
    throw new Error('O nome do cliente deve ter pelo menos 2 caracteres.');
  }

  const dbData = await readDb();
  
  const nameExists = dbData.clients.some(client => client.name.toLowerCase() === name.toLowerCase());
  if (nameExists) {
      throw new Error('Um cliente com este nome já existe.');
  }

  const newClient: Client = {
      id: `client-${Date.now()}`,
      name: name,
      buildings: []
  };

  dbData.clients.push(newClient);
  await writeDb(dbData);
  
  revalidatePath('/');
}

export async function updateClientAction(id: string, formData: FormData) {
  const name = formData.get('name') as string;
  if (!name || name.trim().length < 2) {
    throw new Error('O nome do cliente deve ter pelo menos 2 caracteres.');
  }

  const dbData = await readDb();
  const clientIndex = dbData.clients.findIndex(c => c.id === id);

  if (clientIndex === -1) {
      throw new Error('Cliente não encontrado.');
  }

  dbData.clients[clientIndex].name = name;
  await writeDb(dbData);

  revalidatePath('/');
  revalidatePath(`/clients/${id}/edit`);
  redirect('/');
}

export async function deleteClientAction(id: string) {
    const dbData = await readDb();
    dbData.clients = dbData.clients.filter(c => c.id !== id);
    await writeDb(dbData);
    revalidatePath('/');
}


// --- Building Actions ---
export async function createBuildingAction(clientId: string, formData: FormData) {
    const name = formData.get('name') as string;
    if (!name || name.trim().length < 2) {
        throw new Error('O nome do local deve ter pelo menos 2 caracteres.');
    }
    
    const dbData = await readDb();
    const client = dbData.clients.find(c => c.id === clientId);

    if (!client) {
        throw new Error('Cliente não encontrado.');
    }

    const nameExists = client.buildings.some(b => b.name.toLowerCase() === name.toLowerCase());
    if (nameExists) {
        throw new Error('Um local com este nome já existe para este cliente.');
    }

    const newBuilding: Building = {
        id: `bldg-${Date.now()}`,
        name: name,
        extinguishers: [],
        hoses: []
    };

    client.buildings.push(newBuilding);
    await writeDb(dbData);
    revalidatePath(`/clients/${clientId}`);
}

export async function updateBuildingAction(clientId: string, buildingId: string, formData: FormData) {
    const name = formData.get('name') as string;
    if (!name || name.trim().length < 2) {
        throw new Error('O nome do local deve ter pelo menos 2 caracteres.');
    }

    const dbData = await readDb();
    const client = dbData.clients.find(c => c.id === clientId);
    if (!client) {
        throw new Error('Cliente não encontrado.');
    }

    const building = client.buildings.find(b => b.id === buildingId);
    if (!building) {
        throw new Error('Local não encontrado.');
    }
    
    building.name = name;
    await writeDb(dbData);

    revalidatePath(`/clients/${clientId}`);
    revalidatePath(`/clients/${clientId}/${buildingId}/edit`);
}

export async function deleteBuildingAction(clientId: string, buildingId: string) {
    const dbData = await readDb();
    const client = dbData.clients.find(c => c.id === clientId);

    if (client) {
        client.buildings = client.buildings.filter(b => b.id !== buildingId);
        await writeDb(dbData);
    }
    
    revalidatePath(`/clients/${clientId}`);
}

// --- Extinguisher Actions ---
export async function createExtinguisherAction(clientId: string, buildingId: string, data: ExtinguisherFormValues) {
    const dbData = await readDb();
    const client = dbData.clients.find(c => c.id === clientId);
    if (!client) throw new Error('Cliente não encontrado.');
    const building = client.buildings.find(b => b.id === buildingId);
    if (!building) throw new Error('Local não encontrado.');

    const idExists = building.extinguishers.some(e => e.id === data.id);
    if (idExists) throw new Error('Já existe um extintor com este ID neste local.');

    const newExtinguisher: Extinguisher = {
        ...data,
        qrCodeValue: `fireguard-ext-${data.id}`,
        inspections: [],
    };
    
    building.extinguishers.push(newExtinguisher);
    await writeDb(dbData);
    
    revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
}

export async function updateExtinguisherAction(clientId: string, buildingId: string, id: string, data: Partial<ExtinguisherFormValues>) {
    const dbData = await readDb();
    const client = dbData.clients.find(c => c.id === clientId);
    if (!client) throw new Error('Cliente não encontrado.');
    const building = client.buildings.find(b => b.id === buildingId);
    if (!building) throw new Error('Local não encontrado.');
    const extIndex = building.extinguishers.findIndex(e => e.id === id);
    if (extIndex === -1) throw new Error('Extintor não encontrado.');

    building.extinguishers[extIndex] = { ...building.extinguishers[extIndex], ...data };
    await writeDb(dbData);

    revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers`);
    revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers/${id}`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
}

export async function deleteExtinguisherAction(clientId: string, buildingId: string, id: string) {
    const dbData = await readDb();
    const client = dbData.clients.find(c => c.id === clientId);
    if (!client) throw new Error('Cliente não encontrado.');
    const building = client.buildings.find(b => b.id === buildingId);
    if (!building) throw new Error('Local não encontrado.');

    building.extinguishers = building.extinguishers.filter(e => e.id !== id);
    await writeDb(dbData);

    revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
}

// --- Hose Actions ---
export async function createHoseAction(clientId: string, buildingId: string, data: HoseFormValues) {
    const dbData = await readDb();
    const client = dbData.clients.find(c => c.id === clientId);
    if (!client) throw new Error('Cliente não encontrado.');
    const building = client.buildings.find(b => b.id === buildingId);
    if (!building) throw new Error('Local não encontrado.');

    const idExists = building.hoses.some(h => h.id === data.id);
    if (idExists) throw new Error('Já existe um sistema de mangueira com este ID neste local.');

    const newHose: Hose = {
        ...data,
        qrCodeValue: `fireguard-hose-${data.id}`,
        inspections: [],
    };
    
    building.hoses.push(newHose);
    await writeDb(dbData);
    
    revalidatePath(`/clients/${clientId}/${buildingId}/hoses`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
}

export async function updateHoseAction(clientId: string, buildingId: string, id: string, data: Partial<HoseFormValues>) {
    const dbData = await readDb();
    const client = dbData.clients.find(c => c.id === clientId);
    if (!client) throw new Error('Cliente não encontrado.');
    const building = client.buildings.find(b => b.id === buildingId);
    if (!building) throw new Error('Local não encontrado.');
    const hoseIndex = building.hoses.findIndex(h => h.id === id);
    if (hoseIndex === -1) throw new Error('Sistema de mangueira não encontrado.');

    building.hoses[hoseIndex] = { ...building.hoses[hoseIndex], ...data };
    await writeDb(dbData);

    revalidatePath(`/clients/${clientId}/${buildingId}/hoses`);
    revalidatePath(`/clients/${clientId}/${buildingId}/hoses/${id}`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
}

export async function deleteHoseAction(clientId: string, buildingId: string, id: string) {
    const dbData = await readDb();
    const client = dbData.clients.find(c => c.id === clientId);
    if (!client) throw new Error('Cliente não encontrado.');
    const building = client.buildings.find(b => b.id === buildingId);
    if (!building) throw new Error('Local não encontrado.');

    building.hoses = building.hoses.filter(h => h.id !== id);
    await writeDb(dbData);

    revalidatePath(`/clients/${clientId}/${buildingId}/hoses`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
}

// --- Inspection Action ---
export async function addInspectionAction(clientId: string, buildingId: string, qrCodeValue: string, inspectionData: Omit<Inspection, 'id'>): Promise<{ redirectUrl: string } | null> {
    const { addInspection } = await import('./data');
    return addInspection(clientId, buildingId, qrCodeValue, inspectionData);
}

// --- Report Action ---
export async function getReportDataAction(clientId: string, buildingId: string) {
    const { getClientById, getBuildingById, getExtinguishersByBuilding, getHosesByBuilding } = await import('./data');
    
    const [client, building, extinguishers, hoses] = await Promise.all([
        getClientById(clientId),
        getBuildingById(clientId, buildingId),
        getExtinguishersByBuilding(clientId, buildingId),
        getHosesByBuilding(clientId, buildingId)
    ]);

    return { client, building, extinguishers, hoses };
}
