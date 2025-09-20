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
    try {
      const parsed = JSON.parse(dbString);
      // Basic validation to ensure it has the clients array
      if(Array.isArray(parsed.clients)) {
        return parsed;
      }
    } catch(e) {
      // If parsing fails, fall back to initial DB
      console.error("Failed to parse DB from localStorage", e);
    }
  }
  // If no valid DB in localStorage, initialize it
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
    const clientIndex = db.clients.findIndex((c: Client) => c.id === clientId);
    if (clientIndex === -1) {
        throw new Error('Client not found');
    }
    const newBuilding: Building = {
        id: `bldg-${Date.now()}`,
        name: name,
        extinguishers: [],
        hoses: [],
    };
    if (!db.clients[clientIndex].buildings) {
        db.clients[clientIndex].buildings = [];
    }
    db.clients[clientIndex].buildings.push(newBuilding);
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
    const clientIndex = db.clients.findIndex((c: Client) => c.id === clientId);
    if (clientIndex === -1) throw new Error("Client not found");
    const buildingIndex = db.clients[clientIndex].buildings.findIndex(b => b.id === buildingId);
    if (buildingIndex === -1) throw new Error("Building not found");

    const newExtinguisher: Extinguisher = {
        ...data,
        qrCodeValue: `fireguard-ext-${data.id}`,
        inspections: [],
    };
    if (!db.clients[clientIndex].buildings[buildingIndex].extinguishers) db.clients[clientIndex].buildings[buildingIndex].extinguishers = [];
    db.clients[clientIndex].buildings[buildingIndex].extinguishers.push(newExtinguisher);
    saveDb(db);
}

export async function addHose(clientId: string, buildingId: string, data: Omit<Hose, 'qrCodeValue' | 'inspections'>) {
    const db = getDb();
    const clientIndex = db.clients.findIndex((c: Client) => c.id === clientId);
    if (clientIndex === -1) throw new Error("Client not found");
    const buildingIndex = db.clients[clientIndex].buildings.findIndex(b => b.id === buildingId);
    if (buildingIndex === -1) throw new Error("Building not found");

    const newHose: Hose = {
        ...data,
        qrCodeValue: `fireguard-hose-${data.id}`,
        inspections: [],
    };
    if (!db.clients[clientIndex].buildings[buildingIndex].hoses) db.clients[clientIndex].buildings[buildingIndex].hoses = [];
    db.clients[clientIndex].buildings[buildingIndex].hoses.push(newHose);
    saveDb(db);
}


export async function updateExtinguisher(clientId: string, buildingId: string, id: string, data: Partial<Omit<Extinguisher, 'id'>>) {
    const db = getDb();
    const clientIndex = db.clients.findIndex((c: Client) => c.id === clientId);
    if (clientIndex === -1) throw new Error("Client not found");
    const buildingIndex = db.clients[clientIndex].buildings.findIndex(b => b.id === buildingId);
    if (buildingIndex === -1) throw new Error("Building not found");
    const extIndex = db.clients[clientIndex].buildings[buildingIndex].extinguishers.findIndex(e => e.id === id);
    if (extIndex === -1) throw new Error("Extinguisher not found");
    
    db.clients[clientIndex].buildings[buildingIndex].extinguishers[extIndex] = { ...db.clients[clientIndex].buildings[buildingIndex].extinguishers[extIndex], ...data };
    saveDb(db);
}

export async function updateHose(clientId: string, buildingId: string, id: string, data: Partial<Omit<Hose, 'id'>>) {
    const db = getDb();
    const clientIndex = db.clients.findIndex((c: Client) => c.id === clientId);
    if (clientIndex === -1) throw new Error("Client not found");
    const buildingIndex = db.clients[clientIndex].buildings.findIndex(b => b.id === buildingId);
    if (buildingIndex === -1) throw new Error("Building not found");
    const hoseIndex = db.clients[clientIndex].buildings[buildingIndex].hoses.findIndex(h => h.id === id);
    if (hoseIndex === -1) throw new Error("Hose not found");
    
    db.clients[clientIndex].buildings[buildingIndex].hoses[hoseIndex] = { ...db.clients[clientIndex].buildings[buildingIndex].hoses[hoseIndex], ...data };
    saveDb(db);
}


export async function deleteExtinguisher(clientId: string, buildingId: string, id: string) {
    const db = getDb();
    const clientIndex = db.clients.findIndex((c: Client) => c.id === clientId);
    if (clientIndex === -1) throw new Error("Client not found");
    const buildingIndex = db.clients[clientIndex].buildings.findIndex(b => b.id === buildingId);
    if (buildingIndex === -1) throw new Error("Building not found");
    
    db.clients[clientIndex].buildings[buildingIndex].extinguishers = db.clients[clientIndex].buildings[buildingIndex].extinguishers.filter(e => e.id !== id);
    saveDb(db);
}

export async function deleteHose(clientId: string, buildingId: string, id: string) {
    const db = getDb();
    const clientIndex = db.clients.findIndex((c: Client) => c.id === clientId);
    if (clientIndex === -1) throw new Error("Client not found");
    const buildingIndex = db.clients[clientIndex].buildings.findIndex(b => b.id === buildingId);
    if (buildingIndex === -1) throw new Error("Building not found");
    
    db.clients[clientIndex].buildings[buildingIndex].hoses = db.clients[clientIndex].buildings[buildingIndex].hoses.filter(h => h.id !== id);
    saveDb(db);
}

export async function addInspection(qrCodeValue: string, inspectionData: Omit<Inspection, 'id'>): Promise<{ redirectUrl: string } | null> {
    const db = getDb();
    const newInspection: Inspection = { ...inspectionData, id: `insp-${Date.now()}` };

    for (let i = 0; i < db.clients.length; i++) {
        const client = db.clients[i];
        for (let j = 0; j < client.buildings.length; j++) {
            const building = client.buildings[j];
            
            const extIndex = building.extinguishers.findIndex(e => e.qrCodeValue === qrCodeValue);
            if (extIndex !== -1) {
                db.clients[i].buildings[j].extinguishers[extIndex].inspections.push(newInspection);
                saveDb(db);
                return { redirectUrl: `/clients/${client.id}/${building.id}/extinguishers/${building.extinguishers[extIndex].id}` };
            }

            const hoseIndex = building.hoses.findIndex(h => h.qrCodeValue === qrCodeValue);
            if (hoseIndex !== -1) {
                db.clients[i].buildings[j].hoses[hoseIndex].inspections.push(newInspection);
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