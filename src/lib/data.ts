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
      const data = JSON.parse(fileContent);
      // Ensure buildings, extinguishers, and hoses arrays exist
      if (data.clients) {
        data.clients.forEach((client: Client) => {
          client.buildings = client.buildings || [];
          client.buildings.forEach((building: Building) => {
            building.extinguishers = building.extinguishers || [];
            building.hoses = building.hoses || [];
          });
        });
      }
      return data;
    }
  } catch (error) {
    console.error("Error reading db.json:", error);
  }
  // If the file doesn't exist or is empty, return a default structure
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
      client.buildings = client.buildings || [];
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

// --- Building Functions ---
export async function getBuildingById(clientId: string, buildingId: string): Promise<Building | null> {
    const client = await getClientById(clientId);
    if (!client) return null;
    const building = client.buildings.find(b => b.id === buildingId);
    return building || null;
}

export async function addBuilding(clientId: string, name: string): Promise<Building> {
    const db = readDb();
    const clientIndex = db.clients.findIndex(c => c.id === clientId);
    if (clientIndex === -1) {
        throw new Error('Cliente não encontrado.');
    }
    const newBuilding: Building = {
        id: `bldg-${Date.now()}`,
        name,
        extinguishers: [],
        hoses: [],
    };
    db.clients[clientIndex].buildings.push(newBuilding);
    writeDb(db);
    return newBuilding;
}


// --- Equipment Functions ---

export async function getExtinguishersByBuilding(clientId: string, buildingId: string): Promise<Extinguisher[]> {
    const building = await getBuildingById(clientId, buildingId);
    if (!building) return [];
    return building.extinguishers.map(e => ({...e, expiryDate: new Date(e.expiryDate)}));
}

export async function getHosesByBuilding(clientId: string, buildingId: string): Promise<Hose[]> {
    const building = await getBuildingById(clientId, buildingId);
    if (!building) return [];
    return building.hoses.map(h => ({...h, expiryDate: new Date(h.expiryDate)}));
}

export async function getExtinguisherById(clientId: string, buildingId: string, id: string): Promise<Extinguisher | null> {
    const building = await getBuildingById(clientId, buildingId);
    if (!building) return null;

    const extinguisher = building.extinguishers.find(e => e.id === id);
    if (extinguisher) {
      extinguisher.expiryDate = new Date(extinguisher.expiryDate);
      extinguisher.inspections.forEach(i => i.date = new Date(i.date));
      return Promise.resolve(extinguisher);
    }
    return null;
}

export async function getHoseById(clientId: string, buildingId: string, id: string): Promise<Hose | null> {
    const building = await getBuildingById(clientId, buildingId);
    if (!building) return null;

    const hose = building.hoses.find(h => h.id === id);
    if (hose) {
      hose.expiryDate = new Date(hose.expiryDate);
      hose.inspections.forEach(i => i.date = new Date(i.date));
      return Promise.resolve(hose);
    }
    return null;
}

export async function addExtinguisher(clientId: string, buildingId: string, data: Omit<Extinguisher, 'qrCodeValue' | 'inspections'>) {
    const db = readDb();
    const client = db.clients.find(c => c.id === clientId);
    if (!client) throw new Error("Cliente não encontrado.");
    const building = client.buildings.find(b => b.id === buildingId);
    if (!building) throw new Error("Prédio não encontrado.");

    const newExtinguisher: Extinguisher = {
        ...data,
        qrCodeValue: `fireguard-${data.id}`,
        inspections: [],
    };

    building.extinguishers.push(newExtinguisher);
    writeDb(db);
}

export async function addHose(clientId: string, buildingId: string, data: Omit<Hose, 'qrCodeValue' | 'inspections'>) {
    const db = readDb();
    const client = db.clients.find(c => c.id === clientId);
    if (!client) throw new Error("Cliente não encontrado.");
    const building = client.buildings.find(b => b.id === buildingId);
    if (!building) throw new Error("Prédio não encontrado.");

    const newHose: Hose = {
        ...data,
        qrCodeValue: `fireguard-${data.id}`,
        inspections: [],
    };

    building.hoses.push(newHose);
    writeDb(db);
}

export async function updateExtinguisher(clientId: string, buildingId: string, id: string, data: Omit<Extinguisher, 'id' | 'qrCodeValue' | 'inspections'>) {
    const db = readDb();
    const client = db.clients.find(c => c.id === clientId);
    if (!client) throw new Error("Cliente não encontrado.");
    const building = client.buildings.find(b => b.id === buildingId);
    if (!building) throw new Error("Prédio não encontrado.");
    
    const extinguisherIndex = building.extinguishers.findIndex(e => e.id === id);
    if (extinguisherIndex === -1) throw new Error("Extintor não encontrado.");

    building.extinguishers[extinguisherIndex] = { ...building.extinguishers[extinguisherIndex], ...data };
    writeDb(db);
}

export async function updateHose(clientId: string, buildingId: string, id: string, data: Omit<Hose, 'id' | 'qrCodeValue' | 'inspections'>) {
    const db = readDb();
    const client = db.clients.find(c => c.id === clientId);
    if (!client) throw new Error("Cliente não encontrado.");
    const building = client.buildings.find(b => b.id === buildingId);
    if (!building) throw new Error("Prédio não encontrado.");
    
    const hoseIndex = building.hoses.findIndex(h => h.id === id);
    if (hoseIndex === -1) throw new Error("Sistema de mangueira não encontrado.");

    building.hoses[hoseIndex] = { ...building.hoses[hoseIndex], ...data };
    writeDb(db);
}

export async function deleteExtinguisher(clientId: string, buildingId: string, id: string): Promise<void> {
  const db = readDb();
  const client = db.clients.find(c => c.id === clientId);
  if (!client || !client.buildings) return;
  const building = client.buildings.find(b => b.id === buildingId);
  if (!building || !building.extinguishers) return;

  building.extinguishers = building.extinguishers.filter(e => e.id !== id);
  writeDb(db);
}

export async function deleteHose(clientId: string, buildingId: string, id: string): Promise<void> {
  const db = readDb();
  const client = db.clients.find(c => c.id === clientId);
  if (!client || !client.buildings) return;
  const building = client.buildings.find(b => b.id === buildingId);
  if (!building || !building.hoses) return;
  
  building.hoses = building.hoses.filter(h => h.id !== id);
  writeDb(db);
}


export async function addInspection(qrCodeValue: string, inspectionData: Omit<Inspection, 'id'>): Promise<{ redirectUrl: string } | null> {
    const db = readDb();
    const newInspectionId = `insp-${Date.now()}`;
    const newInspection: Inspection = { ...inspectionData, id: newInspectionId };
    
    for (const client of db.clients) {
        for (const building of client.buildings) {
            const extinguisherIndex = building.extinguishers.findIndex(e => e.qrCodeValue === qrCodeValue);
            if (extinguisherIndex !== -1) {
                if (!building.extinguishers[extinguisherIndex].inspections) {
                    building.extinguishers[extinguisherIndex].inspections = [];
                }
                building.extinguishers[extinguisherIndex].inspections.push(newInspection);
                writeDb(db);
                return { redirectUrl: `/clients/${client.id}/${building.id}/extinguishers/${building.extinguishers[extinguisherIndex].id}` };
            }

            const hoseIndex = building.hoses.findIndex(h => h.qrCodeValue === qrCodeValue);
            if (hoseIndex !== -1) {
                 if (!building.hoses[hoseIndex].inspections) {
                    building.hoses[hoseIndex].inspections = [];
                }
                building.hoses[hoseIndex].inspections.push(newInspection);
                writeDb(db);
                return { redirectUrl: `/clients/${client.id}/${building.id}/hoses/${building.hoses[hoseIndex].id}` };
            }
        }
    }

    return null;
}
