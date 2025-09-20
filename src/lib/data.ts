"use server";

import type { Extinguisher, Hose, Inspection, Client, Building } from '@/lib/types';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'db.json');

type Db = {
  clients: Client[];
};

function readDb(): Db {
  try {
    if (fs.existsSync(dbPath)) {
      const fileContent = fs.readFileSync(dbPath, 'utf-8');
      return JSON.parse(fileContent);
    }
  } catch (error) {
    console.error("Error reading db.json:", error);
  }
  return { clients: [] };
}

function writeDb(data: Db) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error("Error writing to db.json:", error);
  }
}

// --- Client Functions ---

export async function getClients(): Promise<Client[]> {
  const db = readDb();
  return Promise.resolve(db.clients);
}

export async function getClientById(clientId: string): Promise<Client | null> {
    const db = readDb();
    const client = db.clients.find(c => c.id === clientId);
    if (client) {
      return Promise.resolve(client);
    }
    return null;
}


export async function addClient(name: string): Promise<Client> {
    const db = readDb();
    const newClient: Client = {
        id: `client-${Date.now()}`,
        name,
        buildings: [],
    };
    db.clients.push(newClient);
    writeDb(db);
    return newClient;
}


// --- Data Access Functions ---

export async function getExtinguishers(): Promise<Extinguisher[]> {
  // This function is now deprecated in favor of getExtinguishersByBuilding
  return Promise.resolve([]);
}

export async function getHoses(): Promise<Hose[]> {
    // This function is now deprecated in favor of getHosesByBuilding
  return Promise.resolve([]);
}

export async function findEquipmentByQr(qrCodeValue: string): Promise<{ type: 'extinguisher' | 'hose'; data: Extinguisher | Hose } | null> {
  const db = readDb();
  for (const client of db.clients) {
    for (const building of client.buildings) {
        const extinguisher = building.extinguishers.find(e => e.qrCodeValue === qrCodeValue);
        if (extinguisher) {
            extinguisher.expiryDate = new Date(extinguisher.expiryDate);
            return { type: 'extinguisher', data: extinguisher };
        }

        const hose = building.hoses.find(h => h.qrCodeValue === qrCodeValue);
        if (hose) {
            hose.expiryDate = new Date(hose.expiryDate);
            return { type: 'hose', data: hose };
        }
    }
  }
  
  return null;
}

export async function getExtinguisherById(id: string): Promise<Extinguisher | null> {
    const db = readDb();
    for (const client of db.clients) {
        for (const building of client.buildings) {
            const extinguisher = building.extinguishers.find(e => e.id === id);
            if (extinguisher) {
              extinguisher.expiryDate = new Date(extinguisher.expiryDate);
              extinguisher.inspections.forEach(i => i.date = new Date(i.date));
              return Promise.resolve(extinguisher);
            }
        }
    }
    return null;
}

export async function getHoseById(id: string): Promise<Hose | null> {
    const db = readDb();
    for (const client of db.clients) {
        for (const building of client.buildings) {
            const hose = building.hoses.find(h => h.id === id);
            if (hose) {
              hose.expiryDate = new Date(hose.expiryDate);
              hose.inspections.forEach(i => i.date = new Date(i.date));
              return Promise.resolve(hose);
            }
        }
    }
    return null;
}

export async function addExtinguisher(data: Omit<Extinguisher, 'qrCodeValue' | 'inspections'>) {
    const db = readDb();
    // This is a placeholder, it needs client/building context
    console.error("addExtinguisher needs to be updated to support buildings");
}

export async function addHose(data: Omit<Hose, 'qrCodeValue' | 'inspections'>) {
    const db = readDb();
    // This is a placeholder, it needs client/building context
    console.error("addHose needs to be updated to support buildings");
}

export async function updateExtinguisher(id: string, data: Omit<Extinguisher, 'id' | 'qrCodeValue' | 'inspections'>) {
    const db = readDb();
    // This is a placeholder, it needs client/building context
    console.error("updateExtinguisher needs to be updated to support buildings");
}

export async function updateHose(id: string, data: Omit<Hose, 'id' | 'qrCodeValue' | 'inspections'>) {
    const db = readDb();
    // This is a placeholder, it needs client/building context
    console.error("updateHose needs to be updated to support buildings");
}


export async function addInspection(qrCodeValue: string, inspectionData: Omit<Inspection, 'id'>): Promise<string | null> {
    const db = readDb();
    const newInspectionId = `insp-${Date.now()}`;
    const newInspection: Inspection = { ...inspectionData, id: newInspectionId };
    
    for (const client of db.clients) {
        for (const building of client.buildings) {
            const extinguisherIndex = building.extinguishers.findIndex(e => e.qrCodeValue === qrCodeValue);
            if (extinguisherIndex !== -1) {
                building.extinguishers[extinguisherIndex].inspections.push(newInspection);
                writeDb(db);
                return `/clients/${client.id}/${building.id}/extinguishers/${building.extinguishers[extinguisherIndex].id}`;
            }

            const hoseIndex = building.hoses.findIndex(h => h.qrCodeValue === qrCodeValue);
            if (hoseIndex !== -1) {
                building.hoses[hoseIndex].inspections.push(newInspection);
                writeDb(db);
                return `/clients/${client.id}/${building.id}/hoses/${building.hoses[hoseIndex].id}`;
            }
        }
    }

    return null;
}

export async function deleteExtinguisher(id: string): Promise<void> {
  const db = readDb();
  // This is a placeholder, it needs client/building context
  console.error("deleteExtinguisher needs to be updated to support buildings");
}

export async function deleteHose(id: string): Promise<void> {
  const db = readDb();
  // This is a placeholder, it needs client/building context
  console.error("deleteHose needs to be updated to support buildings");
}
