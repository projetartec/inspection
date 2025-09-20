"use server";

import type { Extinguisher, Hose, Inspection } from '@/lib/types';
import fs from 'fs';
import path from 'path';

// Use a simple JSON file as a database.
const dbPath = path.join(process.cwd(), 'db.json');

type Db = {
  extinguishers: Extinguisher[];
  hoses: Hose[];
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
  // If the file doesn't exist or is invalid, return a default structure.
  return { extinguishers: [], hoses: [] };
}

function writeDb(data: Db) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error("Error writing to db.json:", error);
  }
}


// --- Data Access Functions ---

export async function getExtinguishers(): Promise<Extinguisher[]> {
  const db = readDb();
  // Dates are stored as strings in JSON, so we need to convert them back to Date objects.
  db.extinguishers.forEach(e => {
    e.expiryDate = new Date(e.expiryDate);
    e.inspections.forEach(i => i.date = new Date(i.date));
  });
  return Promise.resolve(db.extinguishers);
}

export async function getHoses(): Promise<Hose[]> {
  const db = readDb();
  // Dates are stored as strings in JSON, so we need to convert them back to Date objects.
  db.hoses.forEach(h => {
    h.expiryDate = new Date(h.expiryDate);
    h.inspections.forEach(i => i.date = new Date(i.date));
  });
  return Promise.resolve(db.hoses);
}

export async function findEquipmentByQr(qrCodeValue: string): Promise<{ type: 'extinguisher' | 'hose'; data: Extinguisher | Hose } | null> {
  const db = readDb();
  const extinguisher = db.extinguishers.find(e => e.qrCodeValue === qrCodeValue);
  if (extinguisher) {
    extinguisher.expiryDate = new Date(extinguisher.expiryDate);
    return { type: 'extinguisher', data: extinguisher };
  }

  const hose = db.hoses.find(h => h.qrCodeValue === qrCodeValue);
  if (hose) {
    hose.expiryDate = new Date(hose.expiryDate);
    return { type: 'hose', data: hose };
  }
  
  return null;
}

export async function getExtinguisherById(id: string): Promise<Extinguisher | null> {
    const db = readDb();
    const extinguisher = db.extinguishers.find(e => e.id === id);
    if (extinguisher) {
      extinguisher.expiryDate = new Date(extinguisher.expiryDate);
      extinguisher.inspections.forEach(i => i.date = new Date(i.date));
      return Promise.resolve(extinguisher);
    }
    return null;
}

export async function getHoseById(id: string): Promise<Hose | null> {
    const db = readDb();
    const hose = db.hoses.find(h => h.id === id);
    if (hose) {
      hose.expiryDate = new Date(hose.expiryDate);
      hose.inspections.forEach(i => i.date = new Date(i.date));
      return Promise.resolve(hose);
    }
    return null;
}

export async function addExtinguisher(data: Omit<Extinguisher, 'qrCodeValue' | 'inspections'>) {
    const db = readDb();
    if (db.extinguishers.some(e => e.id === data.id)) {
      throw new Error('Já existe um extintor com este ID.');
    }
    const newExtinguisher: Extinguisher = {
        ...data,
        qrCodeValue: `fireguard-${data.id}`,
        inspections: [],
    };
    db.extinguishers.push(newExtinguisher);
    writeDb(db);
    return newExtinguisher;
}

export async function addHose(data: Omit<Hose, 'qrCodeValue' | 'inspections'>) {
    const db = readDb();
    if (db.hoses.some(h => h.id === data.id)) {
      throw new Error('Já existe um sistema de mangueira com este ID.');
    }
    const newHose: Hose = {
        ...data,
        qrCodeValue: `fireguard-${data.id}`,
        inspections: [],
    };
    db.hoses.push(newHose);
    writeDb(db);
    return newHose;
}

export async function updateExtinguisher(id: string, data: Omit<Extinguisher, 'id' | 'qrCodeValue' | 'inspections'>) {
    const db = readDb();
    const index = db.extinguishers.findIndex(e => e.id === id);
    if (index === -1) {
        throw new Error('Extintor não encontrado.');
    }
    db.extinguishers[index] = {
        ...db.extinguishers[index],
        ...data,
    };
    writeDb(db);
    return db.extinguishers[index];
}

export async function updateHose(id: string, data: Omit<Hose, 'id' | 'qrCodeValue' | 'inspections'>) {
    const db = readDb();
    const index = db.hoses.findIndex(h => h.id === id);
    if (index === -1) {
        throw new Error('Sistema de mangueira não encontrado.');
    }
    db.hoses[index] = {
        ...db.hoses[index],
        ...data,
    };
    writeDb(db);
    return db.hoses[index];
}


export async function addInspection(qrCodeValue: string, inspectionData: Omit<Inspection, 'id'>): Promise<string | null> {
    const db = readDb();
    const newInspectionId = `insp-${Date.now()}`;
    const newInspection: Inspection = { ...inspectionData, id: newInspectionId };
    
    const extinguisherIndex = db.extinguishers.findIndex(e => e.qrCodeValue === qrCodeValue);
    if (extinguisherIndex !== -1) {
        db.extinguishers[extinguisherIndex].inspections.push(newInspection);
        writeDb(db);
        return `/extinguishers/${db.extinguishers[extinguisherIndex].id}`;
    }

    const hoseIndex = db.hoses.findIndex(h => h.qrCodeValue === qrCodeValue);
    if (hoseIndex !== -1) {
        db.hoses[hoseIndex].inspections.push(newInspection);
        writeDb(db);
        return `/hoses/${db.hoses[hoseIndex].id}`;
    }

    return null;
}

export async function deleteExtinguisher(id: string): Promise<void> {
  const db = readDb();
  const index = db.extinguishers.findIndex(e => e.id === id);
  if (index === -1) {
    throw new Error('Extintor não encontrado.');
  }
  db.extinguishers.splice(index, 1);
  writeDb(db);
  return Promise.resolve();
}

export async function deleteHose(id: string): Promise<void> {
  const db = readDb();
  const index = db.hoses.findIndex(h => h.id === id);
  if (index === -1) {
    throw new Error('Sistema de mangueira não encontrado.');
  }
  db.hoses.splice(index, 1);
  writeDb(db);
  return Promise.resolve();
}
