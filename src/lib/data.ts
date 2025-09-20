'use client';

import type { Extinguisher, Hose, Inspection, Client, Building } from '@/lib/types';

const DB_KEY = 'fireguard_db';

function readDb(): { clients: Client[] } {
  if (typeof window === 'undefined') {
    return { clients: [] };
  }
  try {
    const dbString = window.localStorage.getItem(DB_KEY);
    if (dbString) {
      const data = JSON.parse(dbString);
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
    console.error("Error reading from localStorage:", error);
  }
  
  // Initialize with default data if empty or error
  const initialDb = {
    clients: [
      {
        "id": "client-1758331858862",
        "name": "CPQD",
        "buildings": [
          {
            "id": "bldg-1758332140558",
            "name": "Prédio 1",
            "extinguishers": [],
            "hoses": []
          },
          {
            "id": "bldg-1758332823582",
            "name": "Prédio 2",
            "extinguishers": [],
            "hoses": []
          }
        ]
      }
    ]
  };
  writeDb(initialDb);
  return initialDb;
}

function writeDb(data: { clients: Client[] }) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(DB_KEY, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error writing to localStorage:", error);
    }
}

// --- Client Functions ---

export function getClients(): Client[] {
  const db = readDb();
  return db.clients;
}

export function getClientById(clientId: string): Client | null {
    const db = readDb();
    const client = db.clients.find(c => c.id === clientId);
    if (client) {
      client.buildings = client.buildings || [];
      return client;
    }
    return null;
}

export function addClient(data: { name: string }): { client?: Client; message: string } {
    try {
        const db = readDb();
        const newClient: Client = {
            id: `client-${Date.now()}`,
            name: data.name,
            buildings: [],
        };
        db.clients.push(newClient);
        writeDb(db);
        return { client: newClient, message: 'Sucesso' };
    } catch (e: any) {
        return { message: `Erro ao adicionar cliente: ${e.message}` };
    }
}

// --- Building Functions ---
export function getBuildingById(clientId: string, buildingId: string): Building | null {
    const client = getClientById(clientId);
    if (!client) return null;
    const building = client.buildings.find(b => b.id === buildingId);
    return building || null;
}

export function addBuilding(clientId: string, name: string): boolean {
    try {
        const db = readDb();
        const clientIndex = db.clients.findIndex(c => c.id === clientId);
        if (clientIndex === -1) {
            throw new Error('Cliente não encontrado.');
        }
        const newBuilding: Building = {
            id: `bldg-${Date.now()}`,
            name: name,
            extinguishers: [],
            hoses: [],
        };
        db.clients[clientIndex].buildings.push(newBuilding);
        writeDb(db);
        return true;
    } catch (e: any) {
        console.error(`Erro ao adicionar prédio: ${e.message}`);
        return false;
    }
}


// --- Equipment Functions ---

export function getExtinguishersByBuilding(clientId: string, buildingId: string): Extinguisher[] {
    const building = getBuildingById(clientId, buildingId);
    if (!building) return [];
    return building.extinguishers.map(e => ({...e, expiryDate: new Date(e.expiryDate)}));
}

export function getHosesByBuilding(clientId: string, buildingId: string): Hose[] {
    const building = getBuildingById(clientId, buildingId);
    if (!building) return [];
    return building.hoses.map(h => ({...h, expiryDate: new Date(h.expiryDate)}));
}

export function getExtinguisherById(clientId: string, buildingId: string, id: string): Extinguisher | null {
    const building = getBuildingById(clientId, buildingId);
    if (!building) return null;

    const extinguisher = building.extinguishers.find(e => e.id === id);
    if (extinguisher) {
      extinguisher.expiryDate = new Date(extinguisher.expiryDate);
      extinguisher.inspections.forEach(i => i.date = new Date(i.date));
      return extinguisher;
    }
    return null;
}

export function getHoseById(clientId: string, buildingId: string, id: string): Hose | null {
    const building = getBuildingById(clientId, buildingId);
    if (!building) return null;

    const hose = building.hoses.find(h => h.id === id);
    if (hose) {
      hose.expiryDate = new Date(hose.expiryDate);
      hose.inspections.forEach(i => i.date = new Date(i.date));
      return hose;
    }
    return null;
}

export function addExtinguisher(clientId: string, buildingId: string, data: Omit<Extinguisher, 'qrCodeValue' | 'inspections'>) {
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

export function addHose(clientId: string, buildingId: string, data: Omit<Hose, 'qrCodeValue' | 'inspections'>) {
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

export function updateExtinguisher(clientId: string, buildingId: string, id: string, data: Omit<Extinguisher, 'id' | 'qrCodeValue' | 'inspections'>) {
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

export function updateHose(clientId: string, buildingId: string, id: string, data: Omit<Hose, 'id' | 'qrCodeValue' | 'inspections'>) {
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

export function deleteExtinguisher(clientId: string, buildingId: string, id: string) {
  const db = readDb();
  const client = db.clients.find(c => c.id === clientId);
  if (!client || !client.buildings) return;
  const building = client.buildings.find(b => b.id === buildingId);
  if (!building || !building.extinguishers) return;

  building.extinguishers = building.extinguishers.filter(e => e.id !== id);
  writeDb(db);
}

export function deleteHose(clientId: string, buildingId: string, id: string) {
  const db = readDb();
  const client = db.clients.find(c => c.id === clientId);
  if (!client || !client.buildings) return;
  const building = client.buildings.find(b => b.id === buildingId);
  if (!building || !building.hoses) return;
  
  building.hoses = building.hoses.filter(h => h.id !== id);
  writeDb(db);
}


export function addInspection(qrCodeValue: string, inspectionData: Omit<Inspection, 'id'>): { redirectUrl: string } | null {
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
