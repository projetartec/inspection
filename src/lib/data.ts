'use client';

import initialDb from '../../db.json';
import type { Extinguisher, Hose, Inspection, Client, Building } from '@/lib/types';

// --- Helper Functions to manage localStorage ---
function getDb() {
  if (typeof window === 'undefined') {
    return initialDb;
  }
  const dbString = localStorage.getItem('fireguard_db');
  if (dbString) {
    return JSON.parse(dbString);
  }
  localStorage.setItem('fireguard_db', JSON.stringify(initialDb));
  return initialDb;
}

function saveDb(db: any) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('fireguard_db', JSON.stringify(db));
}

// --- Client Functions ---
export async function getClients(): Promise<Client[]> {
  const db = getDb();
  return db.clients.map((c: any) => ({
    ...c,
    buildings: c.buildings || [],
  }));
}

export async function getClientById(clientId: string): Promise<Client | null> {
  const db = getDb();
  const client = db.clients.find((c: Client) => c.id === clientId);
  return client ? { ...client, buildings: client.buildings || [] } : null;
}

export async function addClient(data: { name: string }): Promise<Client> {
  const db = getDb();
  const newClient: Client = {
    id: `client-${Date.now()}`,
    name: data.name,
    buildings: [],
  };
  db.clients.push(newClient);
  saveDb(db);
  return newClient;
}

// --- Building Functions ---
export async function getBuildingById(clientId: string, buildingId: string): Promise<Building | null> {
    const client = await getClientById(clientId);
    if (!client) return null;
    const building = client.buildings.find(b => b.id === buildingId);
    return building || null;
}

export async function addBuilding(clientId: string, name: string): Promise<Building> {
    const db = getDb();
    const client = db.clients.find((c: Client) => c.id === clientId);
    if (!client) {
        throw new Error('Client not found');
    }
    const newBuilding: Building = {
        id: `bldg-${Date.now()}`,
        name: name,
        extinguishers: [],
        hoses: [],
    };
    if (!client.buildings) {
        client.buildings = [];
    }
    client.buildings.push(newBuilding);
    saveDb(db);
    return newBuilding;
}

// --- Equipment Functions ---
export async function getExtinguishersByBuilding(clientId: string, buildingId: string): Promise<Extinguisher[]> {
    const building = await getBuildingById(clientId, buildingId);
    return building?.extinguishers || [];
}

export async function getHosesByBuilding(clientId: string, buildingId: string): Promise<Hose[]> {
    const building = await getBuildingById(clientId, buildingId);
    return building?.hoses || [];
}

export async function getExtinguisherById(clientId: string, buildingId: string, id: string): Promise<Extinguisher | null> {
    const building = await getBuildingById(clientId, buildingId);
    if (!building) return null;
    return building.extinguishers.find(e => e.id === id) || null;
}

export async function getHoseById(clientId: string, buildingId: string, id: string): Promise<Hose | null> {
    const building = await getBuildingById(clientId, buildingId);
    if (!building) return null;
    return building.hoses.find(h => h.id === id) || null;
}

export async function addExtinguisher(clientId: string, buildingId: string, data: Omit<Extinguisher, 'qrCodeValue' | 'inspections'>) {
    const db = getDb();
    const client = db.clients.find((c: Client) => c.id === clientId);
    if (!client) throw new Error("Client not found");
    const building = client.buildings.find(b => b.id === buildingId);
    if (!building) throw new Error("Building not found");

    const newExtinguisher: Extinguisher = {
        ...data,
        qrCodeValue: `fireguard-ext-${data.id}`,
        inspections: [],
    };
    if (!building.extinguishers) building.extinguishers = [];
    building.extinguishers.push(newExtinguisher);
    saveDb(db);
}

export async function addHose(clientId: string, buildingId: string, data: Omit<Hose, 'qrCodeValue' | 'inspections'>) {
    const db = getDb();
    const client = db.clients.find((c: Client) => c.id === clientId);
    if (!client) throw new Error("Client not found");
    const building = client.buildings.find(b => b.id === buildingId);
    if (!building) throw new Error("Building not found");

    const newHose: Hose = {
        ...data,
        qrCodeValue: `fireguard-hose-${data.id}`,
        inspections: [],
    };
    if (!building.hoses) building.hoses = [];
    building.hoses.push(newHose);
    saveDb(db);
}


export async function updateExtinguisher(clientId: string, buildingId: string, id: string, data: Partial<Omit<Extinguisher, 'id'>>) {
    const db = getDb();
    const client = db.clients.find((c: Client) => c.id === clientId);
    if (!client) throw new Error("Client not found");
    const building = client.buildings.find(b => b.id === buildingId);
    if (!building) throw new Error("Building not found");
    const extIndex = building.extinguishers.findIndex(e => e.id === id);
    if (extIndex === -1) throw new Error("Extinguisher not found");
    
    building.extinguishers[extIndex] = { ...building.extinguishers[extIndex], ...data };
    saveDb(db);
}

export async function updateHose(clientId: string, buildingId: string, id: string, data: Partial<Omit<Hose, 'id'>>) {
    const db = getDb();
    const client = db.clients.find((c: Client) => c.id === clientId);
    if (!client) throw new Error("Client not found");
    const building = client.buildings.find(b => b.id === buildingId);
    if (!building) throw new Error("Building not found");
    const hoseIndex = building.hoses.findIndex(h => h.id === id);
    if (hoseIndex === -1) throw new Error("Hose not found");
    
    building.hoses[hoseIndex] = { ...building.hoses[hoseIndex], ...data };
    saveDb(db);
}


export async function deleteExtinguisher(clientId: string, buildingId: string, id: string) {
    const db = getDb();
    const client = db.clients.find((c: Client) => c.id === clientId);
    if (!client) throw new Error("Client not found");
    const building = client.buildings.find(b => b.id === buildingId);
    if (!building) throw new Error("Building not found");
    
    building.extinguishers = building.extinguishers.filter(e => e.id !== id);
    saveDb(db);
}

export async function deleteHose(clientId: string, buildingId: string, id: string) {
    const db = getDb();
    const client = db.clients.find((c: Client) => c.id === clientId);
    if (!client) throw new Error("Client not found");
    const building = client.buildings.find(b => b.id === buildingId);
    if (!building) throw new Error("Building not found");
    
    building.hoses = building.hoses.filter(h => h.id !== id);
    saveDb(db);
}

export async function addInspection(qrCodeValue: string, inspectionData: Omit<Inspection, 'id'>): Promise<{ redirectUrl: string } | null> {
    const db = getDb();
    const newInspection: Inspection = { ...inspectionData, id: `insp-${Date.now()}` };

    for (const client of db.clients) {
        for (const building of client.buildings) {
            const extIndex = building.extinguishers.findIndex(e => e.qrCodeValue === qrCodeValue);
            if (extIndex !== -1) {
                building.extinguishers[extIndex].inspections.push(newInspection);
                saveDb(db);
                return { redirectUrl: `/clients/${client.id}/${building.id}/extinguishers/${building.extinguishers[extIndex].id}` };
            }

            const hoseIndex = building.hoses.findIndex(h => h.qrCodeValue === qrCodeValue);
            if (hoseIndex !== -1) {
                building.hoses[hoseIndex].inspections.push(newInspection);
                saveDb(db);
                return { redirectUrl: `/clients/${client.id}/${building.id}/hoses/${building.hoses[hoseIndex].id}` };
            }
        }
    }
    return null; // Equipment not found
}


export async function getReportDataAction(clientId: string, buildingId: string) {
  const extinguishers = await getExtinguishersByBuilding(clientId, buildingId);
  const hoses = await getHosesByBuilding(clientId, buildingId);
  return { extinguishers, hoses };
}
