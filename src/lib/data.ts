
'use server';

import type { Extinguisher, Hydrant, Inspection, Client, Building } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import * as fs from 'fs/promises';
import path from 'path';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore'; // Only for type checking
import { HydrantFormValues, ExtinguisherFormValues } from './schemas';
import type { InspectedItem } from '@/hooks/use-inspection-session.tsx';

const dbPath = path.join(process.cwd(), 'src', 'db.json');

// In-memory cache for the database
let dbCache: { clients: Client[] } | null = null;
let dbWriteTimeout: NodeJS.Timeout | null = null;

async function readDb(): Promise<{ clients: Client[] }> {
    // For development, always read from the file to see changes from actions.
    // In a real DB, this would hit the DB.
    try {
        const data = await fs.readFile(dbPath, 'utf-8');
        dbCache = JSON.parse(data);
        return dbCache as { clients: Client[] };
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            console.log('db.json not found, initializing with empty list.');
            dbCache = { clients: [] };
            await fs.writeFile(dbPath, JSON.stringify(dbCache, null, 2), 'utf-8');
            return dbCache;
        }
        console.error('Error reading db.json:', error);
        throw error;
    }
}


function scheduleWriteDb(): void {
    if (dbWriteTimeout) {
        clearTimeout(dbWriteTimeout);
    }
    dbWriteTimeout = setTimeout(async () => {
        if (dbCache) {
            try {
                await fs.writeFile(dbPath, JSON.stringify(dbCache, null, 2), 'utf-8');
            } catch (error) {
                console.error('Error writing to db.json:', error);
            }
        }
        dbWriteTimeout = null;
    }, 500); // Debounce write operations
}

// --- Client Functions ---
export async function getClients(): Promise<Client[]> {
    const dbData = await readDb();
    return JSON.parse(JSON.stringify(dbData.clients || [])); // Deep copy to prevent mutation
}

export async function getClientById(clientId: string): Promise<Client | null> {
    const dbData = await readDb();
    const client = dbData.clients.find(c => c.id === clientId);
    return client ? JSON.parse(JSON.stringify(client)) : null; // Deep copy
}

export async function addClient(newClient: Client) {
    const dbData = await readDb();
    dbData.clients.push(newClient);
    scheduleWriteDb();
}

export async function updateClient(id: string, updatedData: Partial<Client>) {
    const dbData = await readDb();
    const clientIndex = dbData.clients.findIndex(c => c.id === id);
    if (clientIndex !== -1) {
        dbData.clients[clientIndex] = { ...dbData.clients[clientIndex], ...updatedData };
        scheduleWriteDb();
    } else {
        throw new Error('Cliente não encontrado.');
    }
}

export async function deleteClient(id: string) {
    const dbData = await readDb();
    dbData.clients = dbData.clients.filter(c => c.id !== id);
    scheduleWriteDb();
}


// --- Building Functions ---
export async function getBuildingById(clientId: string, buildingId: string): Promise<Building | null> {
    const client = await getClientById(clientId);
    const building = client?.buildings.find(b => b.id === buildingId);
    return building || null;
}

export async function getBuildingsByClient(clientId: string): Promise<Building[]> {
  const client = await getClientById(clientId);
  return client?.buildings || [];
}

export async function addBuilding(clientId: string, newBuilding: Building) {
    const dbData = await readDb();
    const client = dbData.clients.find(c => c.id === clientId);
    if (!client) throw new Error('Cliente não encontrado.');
    if (!client.buildings) client.buildings = [];
    client.buildings.push(newBuilding);
    scheduleWriteDb();
}

export async function updateBuilding(clientId: string, buildingId: string, updatedData: Partial<Building>) {
    const dbData = await readDb();
    const client = dbData.clients.find(c => c.id === clientId);
    if (!client) throw new Error('Cliente não encontrado.');
    const buildingIndex = client.buildings.findIndex(b => b.id === buildingId);
    if (buildingIndex !== -1) {
        client.buildings[buildingIndex] = { ...client.buildings[buildingIndex], ...updatedData };
        scheduleWriteDb();
    } else {
        throw new Error('Local não encontrado.');
    }
}

export async function deleteBuilding(clientId: string, buildingId: string) {
    const dbData = await readDb();
    const client = dbData.clients.find(c => c.id === clientId);
    if (client) {
        client.buildings = client.buildings.filter(b => b.id !== buildingId);
        scheduleWriteDb();
    } else {
        throw new Error('Cliente não encontrado.');
    }
}


function toISODateString(date: any): string {
    if (!date) return '';
    if (typeof date === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return date;
        }
         if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(date)) {
            return date.split('T')[0];
        }
        const parsedDate = new Date(date);
        if (!isNaN(parsedDate.getTime())) {
            return format(parsedDate, 'yyyy-MM-dd');
        }
        return '';
    }
    if (date instanceof Date) {
        return format(date, 'yyyy-MM-dd');
    }
    // This is for Firestore Timestamp, but keeping type for compatibility if needed later
    if (typeof date.toDate === 'function') {
      return format(date.toDate(), 'yyyy-MM-dd');
    }
    return '';
}

// --- Equipment Functions ---
export async function getExtinguishersByBuilding(clientId: string, buildingId: string): Promise<Extinguisher[]> {
    const building = await getBuildingById(clientId, buildingId);
    return building?.extinguishers.map(ext => ({
        ...ext,
        expiryDate: toISODateString(ext.expiryDate)
    })) || [];
}

export async function getHosesByBuilding(clientId: string, buildingId: string): Promise<Hydrant[]> {
    const building = await getBuildingById(clientId, buildingId);
    return building?.hoses.map(hose => ({
        ...hose,
        hydrostaticTestDate: toISODateString(hose.hydrostaticTestDate)
    })) || [];
}

export async function getExtinguisherById(clientId: string, buildingId: string, id: string): Promise<Extinguisher | null> {
    const building = await getBuildingById(clientId, buildingId);
    const extinguisher = building?.extinguishers.find(e => e.id === id);
    if (!extinguisher) return null;
    
    return {
        ...extinguisher,
        expiryDate: toISODateString(extinguisher.expiryDate)
    };
}

export async function getHoseById(clientId: string, buildingId: string, id: string): Promise<Hydrant | null> {
    const building = await getBuildingById(clientId, buildingId);
    const hose = building?.hoses.find(h => h.id === id);
    if (!hose) return null;
    
    return {
        ...hose,
        hydrostaticTestDate: toISODateString(hose.hydrostaticTestDate)
    };
}

export async function addExtinguisher(clientId: string, buildingId: string, newExtinguisher: Extinguisher) {
    const dbData = await readDb();
    const client = dbData.clients.find(c => c.id === clientId);
    if (!client) throw new Error('Cliente não encontrado.');
    const building = client.buildings.find(b => b.id === buildingId);
    if (!building) throw new Error('Local não encontrado.');
    if (!building.extinguishers) building.extinguishers = [];
    building.extinguishers.push(newExtinguisher);
    scheduleWriteDb();
}

export async function updateExtinguisher(clientId: string, buildingId: string, id: string, updatedData: Partial<ExtinguisherFormValues>) {
    const dbData = await readDb();
    const client = dbData.clients.find(c => c.id === clientId);
    if (!client) throw new Error('Cliente não encontrado.');
    const building = client.buildings.find(b => b.id === buildingId);
    if (!building) throw new Error('Local não encontrado.');
    const extIndex = building.extinguishers.findIndex(e => e.id === id);
    if (extIndex === -1) throw new Error('Extintor não encontrado.');

    building.extinguishers[extIndex] = { ...building.extinguishers[extIndex], ...updatedData };
    scheduleWriteDb();
}

export async function deleteExtinguisher(clientId: string, buildingId: string, id: string) {
    const dbData = await readDb();
    const client = dbData.clients.find(c => c.id === clientId);
    if (!client) throw new Error('Cliente não encontrado.');
    const building = client.buildings.find(b => b.id === buildingId);
    if (!building) throw new Error('Local não encontrado.');

    building.extinguishers = building.extinguishers.filter(e => e.id !== id);
    scheduleWriteDb();
}

export async function addHose(clientId: string, buildingId: string, newHose: Hydrant) {
    const dbData = await readDb();
    const client = dbData.clients.find(c => c.id === clientId);
    if (!client) throw new Error('Cliente não encontrado.');
    const building = client.buildings.find(b => b.id === buildingId);
    if (!building) throw new Error('Local não encontrado.');
    if (!building.hoses) building.hoses = [];
    building.hoses.push(newHose);
    scheduleWriteDb();
}

export async function updateHose(clientId: string, buildingId: string, id: string, updatedData: Partial<HydrantFormValues>) {
    const dbData = await readDb();
    const client = dbData.clients.find(c => c.id === clientId);
    if (!client) throw new Error('Cliente não encontrado.');
    const building = client.buildings.find(b => b.id === buildingId);
    if (!building) throw new Error('Local não encontrado.');
    const hoseIndex = building.hoses.findIndex(h => h.id === id);
    if (hoseIndex === -1) throw new Error('Hidrante não encontrado.');

    building.hoses[hoseIndex] = { ...building.hoses[hoseIndex], ...updatedData };
    scheduleWriteDb();
}

export async function deleteHose(clientId: string, buildingId: string, id: string) {
    const dbData = await readDb();
    const client = dbData.clients.find(c => c.id === clientId);
    if (!client) throw new Error('Cliente não encontrado.');
    const building = client.buildings.find(b => b.id === buildingId);
    if (!building) throw new Error('Local não encontrado.');

    building.hoses = building.hoses.filter(h => h.id !== id);
    scheduleWriteDb();
}


// --- Inspection Action ---
export async function addInspectionBatch(clientId: string, buildingId: string, inspectedItems: InspectedItem[]) {
    const dbData = await readDb();
    const client = dbData.clients.find(c => c.id === clientId);
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

    scheduleWriteDb();
}
