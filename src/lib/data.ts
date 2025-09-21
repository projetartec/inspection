
'use server';

import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, writeBatch, query, where, setDoc, Timestamp } from 'firebase/firestore';
import type { Extinguisher, Hose, Inspection, Client, Building } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import * as fs from 'fs/promises';
import path from 'path';
import { format } from 'date-fns';

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


// --- Client Functions ---
export async function getClients(): Promise<Client[]> {
    const dbData = await readDb();
    return dbData.clients || [];
}

export async function getClientById(clientId: string): Promise<Client | null> {
    const dbData = await readDb();
    const client = dbData.clients.find(c => c.id === clientId);
    return client || null;
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

function toISODateString(date: any): string {
    if (!date) return '';
    if (typeof date === 'string') {
        // If it's already a string in 'YYYY-MM-DD' format, return it.
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return date;
        }
         if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(date)) {
            return date.split('T')[0];
        }
        // If it's another string format, try parsing
        const parsedDate = new Date(date);
        if (!isNaN(parsedDate.getTime())) {
            return format(parsedDate, 'yyyy-MM-dd');
        }
        return '';
    }
    if (date instanceof Timestamp) {
      return format(date.toDate(), 'yyyy-MM-dd');
    }
    if (date instanceof Date) {
        return format(date, 'yyyy-MM-dd');
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

export async function getHosesByBuilding(clientId: string, buildingId: string): Promise<Hose[]> {
    const building = await getBuildingById(clientId, buildingId);
    return building?.hoses.map(hose => ({
        ...hose,
        expiryDate: toISODateString(hose.expiryDate)
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

export async function getHoseById(clientId: string, buildingId: string, id: string): Promise<Hose | null> {
    const building = await getBuildingById(clientId, buildingId);
    const hose = building?.hoses.find(h => h.id === id);
    if (!hose) return null;
    
    return {
        ...hose,
        expiryDate: toISODateString(hose.expiryDate)
    };
}


export async function addInspection(clientId: string, buildingId: string, qrCodeValue: string, inspectionData: Omit<Inspection, 'id'>): Promise<{ redirectUrl: string } | null> {
    const dbData = await readDb();
    const client = dbData.clients.find(c => c.id === clientId);
    if (!client) return null;

    const building = client.buildings.find(b => b.id === buildingId);
    if (!building) return null;

    const newInspection: Inspection = { ...inspectionData, id: `insp-${Date.now()}` };
    
    let redirectUrl: string | null = null;

    const extinguisher = building.extinguishers.find(e => e.qrCodeValue === qrCodeValue);
    if (extinguisher) {
        extinguisher.inspections = extinguisher.inspections || [];
        extinguisher.inspections.push(newInspection);
        redirectUrl = `/clients/${clientId}/${buildingId}/extinguishers/${extinguisher.id}`;
    }

    const hose = building.hoses.find(h => h.qrCodeValue === qrCodeValue);
    if (hose) {
        hose.inspections = hose.inspections || [];
        hose.inspections.push(newInspection);
        redirectUrl = `/clients/${clientId}/${buildingId}/hoses/${hose.id}`;
    }

    if (redirectUrl) {
        await writeDb(dbData);
        revalidatePath(redirectUrl);
        revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
        return { redirectUrl };
    }
    
    return null; // Equipment not found
}

    
