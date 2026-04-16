

'use server';

import type { Extinguisher, Hydrant, Client, Building, Inspection, ExtinguisherType, ExtinguisherWeight, HydrantFormValues } from '@/lib/types';
import { adminDb } from './firebase-admin'; 
import { ClientFormValues, ExtinguisherFormSchema, HydrantFormSchema } from './schemas';
import type { InspectedItem, InspectionSession } from '@/hooks/use-inspection-session.tsx';
import { 
    extinguisherTypes,
    extinguisherWeights,
    hydrantDiameters,
    hydrantHoseLengths, 
    hydrantKeyQuantities, 
    hydrantNozzleQuantities, 
    hydrantQuantities,
    hydrantTypes
} from './types';


const CLIENTS_COLLECTION = 'clients';
const BUILDINGS_COLLECTION = 'buildings';

function clientFromDoc(doc: FirebaseFirestore.DocumentSnapshot): Client {
  const data = doc.data()!;
  return {
    id: doc.id,
    name: data.name || '',
    fantasyName: data.fantasyName,
    address: data.address,
    city: data.city,
    zipCode: data.zipCode,
    phone1: data.phone1,
    phone2: data.phone2,
    cnpj: data.cnpj,
    email: data.email,
    adminContact: data.adminContact,
    caretakerContact: data.caretakerContact,
    buildingOrder: data.buildingOrder || [],
  };
}

function buildingFromDoc(doc: FirebaseFirestore.DocumentSnapshot): Building {
    const data = doc.data()!;
    return {
        id: doc.id,
        clientId: data.clientId,
        name: data.name,
        extinguishers: data.extinguishers || [],
        hoses: data.hoses || [],
        manualInspections: data.manualInspections || [],
        gpsLink: data.gpsLink,
        lastInspected: data.lastInspected
    };
}


// --- Client Functions ---
export async function getClients(): Promise<Client[]> {
  try {
    const querySnapshot = await adminDb.collection(CLIENTS_COLLECTION).orderBy("name").get();
    return querySnapshot.docs.map(clientFromDoc);
  } catch (error) {
    console.error("Error fetching clients: ", error);
    throw new Error('Falha ao buscar clientes no Firestore.');
  }
}

export async function getClientById(clientId: string): Promise<Client | null> {
  try {
    const docRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    const docSnap = await docRef.get();
    return docSnap.exists ? clientFromDoc(docSnap) : null;
  } catch (error) {
    console.error(`Error fetching client ${clientId}: `, error);
    throw new Error('Falha ao buscar cliente no Firestore.');
  }
}

export async function addClient(newClientData: ClientFormValues): Promise<string> {
    const q = adminDb.collection(CLIENTS_COLLECTION).where("name", "==", newClientData.name);
    const querySnapshot = await q.get();
    if (!querySnapshot.empty) {
        throw new Error('Um cliente com este nome de empresa já existe.');
    }
    
    const docRef = await adminDb.collection(CLIENTS_COLLECTION).add({
        ...newClientData,
        buildingOrder: []
    });
    return docRef.id;
}

export async function updateClient(id: string, updatedData: Partial<ClientFormValues>) {
  const docRef = adminDb.collection(CLIENTS_COLLECTION).doc(id);
  await docRef.update(updatedData);
}

export async function deleteClient(id: string) {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(id);
    // Also delete associated buildings
    const buildingsSnapshot = await adminDb.collection(BUILDINGS_COLLECTION).where('clientId', '==', id).get();
    const batch = adminDb.batch();
    buildingsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    await clientRef.delete();
}


// --- Building Functions ---
export async function getBuildingById(buildingId: string): Promise<Building | null> {
    const docRef = adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId);
    const docSnap = await docRef.get();
    return docSnap.exists ? buildingFromDoc(docSnap) : null;
}

export async function getBuildingsByClient(clientId: string): Promise<Building[]> {
  const client = await getClientById(clientId);
  if (!client) return [];

  const buildingsSnapshot = await adminDb.collection(BUILDINGS_COLLECTION).where('clientId', '==', clientId).get();
  const buildingsMap = new Map(buildingsSnapshot.docs.map(doc => [doc.id, buildingFromDoc(doc)]));

  const orderedIds = client.buildingOrder || [];
  const orderedBuildings = orderedIds.map(id => buildingsMap.get(id)).filter(Boolean) as Building[];
  
  const unorderedBuildings = Array.from(buildingsMap.values()).filter(b => !orderedIds.includes(b.id));

  return [...orderedBuildings, ...unorderedBuildings];
}


export async function addBuilding(clientId: string, newBuildingData: { name: string }): Promise<void> {
    const buildingsRef = adminDb.collection(BUILDINGS_COLLECTION);
    const q = buildingsRef.where("clientId", "==", clientId).where("name", "==", newBuildingData.name);
    const querySnapshot = await q.get();
    if (!querySnapshot.empty) {
        throw new Error('Um local com este nome já existe para este cliente.');
    }

    const newBuildingDocRef = buildingsRef.doc();
    await newBuildingDocRef.set({
        clientId: clientId,
        name: newBuildingData.name,
        extinguishers: [],
        hoses: [],
        manualInspections: []
    });

    // Add building id to client's order array
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    const clientDoc = await clientRef.get();
    const clientData = clientDoc.data() as Client;
    const updatedBuildingOrder = [...(clientData.buildingOrder || []), newBuildingDocRef.id];
    await clientRef.update({ buildingOrder: updatedBuildingOrder });
}

export async function updateBuilding(buildingId: string, updatedData: Partial<Building>) {
    const buildingRef = adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId);
    await buildingRef.update(updatedData);
}

export async function deleteBuilding(clientId: string, buildingId: string) {
    // Delete the building document
    const buildingRef = adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId);
    await buildingRef.delete();

    // Remove building from client's order array
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    const clientDoc = await clientRef.get();
    if (clientDoc.exists) {
        const clientData = clientDoc.data() as Client;
        const updatedBuildingOrder = (clientData.buildingOrder || []).filter(id => id !== buildingId);
        await clientRef.update({ buildingOrder: updatedBuildingOrder });
    }
}


export async function updateBuildingOrder(clientId: string, orderedBuildingIds: string[]) {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    await clientRef.update({ buildingOrder: orderedBuildingIds });
}


// --- Equipment Functions ---
export async function getExtinguishersByBuilding(buildingId: string): Promise<Extinguisher[]> {
    const building = await getBuildingById(buildingId);
    return building?.extinguishers || [];
}

export async function getHosesByBuilding(buildingId: string): Promise<Hydrant[]> {
    const building = await getBuildingById(buildingId);
    return building?.hoses || [];
}

export async function getEquipmentForBuildings(clientId: string, buildingIds: string[]): Promise<{extinguishers: (Extinguisher & {buildingId: string, buildingName: string})[], hoses: (Hydrant & {buildingId: string, buildingName: string})[]}> {
  if (buildingIds.length === 0) {
      return { extinguishers: [], hoses: [] };
  }
  
  const buildingsSnapshot = await adminDb.collection(BUILDINGS_COLLECTION).where('clientId', '==', clientId).get();
  const allClientBuildings = buildingsSnapshot.docs.map(doc => buildingFromDoc(doc));
  
  const result: {
      extinguishers: (Extinguisher & {buildingId: string, buildingName: string})[],
      hoses: (Hydrant & {buildingId: string, buildingName: string})[]
  } = { extinguishers: [], hoses: [] };

  for (const buildingId of buildingIds) {
      const building = allClientBuildings.find(b => b.id === buildingId);
      if (building) {
          (building.extinguishers || []).forEach(ext => result.extinguishers.push({ ...ext, buildingId: building.id, buildingName: building.name }));
          (building.hoses || []).forEach(hose => result.hoses.push({ ...hose, buildingId: building.id, buildingName: building.name }));
      }
  }
  return result;
}


export async function getExtinguisherByUid(buildingId: string, uid: string): Promise<Extinguisher | null> {
    const building = await getBuildingById(buildingId);
    return building?.extinguishers.find(e => e.uid === uid) || null;
}

export async function getHoseByUid(buildingId: string, uid: string): Promise<Hydrant | null> {
    const building = await getBuildingById(buildingId);
    return building?.hoses.find(h => h.uid === uid) || null;
}

interface ActionResponse {
    success: boolean;
    message?: string;
}

async function performUpdate<T>(buildingId: string, uid: string, updatedData: Partial<T>, equipmentType: 'extinguishers' | 'hoses'): Promise<ActionResponse> {
    const buildingRef = adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId);
    try {
        await adminDb.runTransaction(async (transaction) => {
            const buildingDoc = await transaction.get(buildingRef);
            if (!buildingDoc.exists) throw new Error('Local não encontrado.');
            
            const building = buildingFromDoc(buildingDoc);
            const equipmentList = [...(building[equipmentType] || [])];
            const itemIndex = equipmentList.findIndex(e => e.uid === uid);

            if (itemIndex === -1) throw new Error('Equipamento não encontrado.');
            
            const editableData = updatedData as { id?: string };
            if (editableData.id && editableData.id !== equipmentList[itemIndex].id) {
                const idExists = equipmentList.some(e => e.id === editableData.id && e.uid !== uid);
                if (idExists) throw new Error('O ID já está em uso, altere!');
            }

            equipmentList[itemIndex] = { ...equipmentList[itemIndex], ...updatedData };
            
            transaction.update(buildingRef, { [equipmentType]: equipmentList });
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}


export async function addExtinguisher(buildingId: string, newExtinguisherData: any): Promise<ActionResponse> {
    const buildingRef = adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId);
    try {
        await adminDb.runTransaction(async (transaction) => {
            const buildingDoc = await transaction.get(buildingRef);
            if (!buildingDoc.exists) throw new Error('Local não encontrado.');
            
            const building = buildingFromDoc(buildingDoc);
            const idExists = (building.extinguishers || []).some(e => e.id === newExtinguisherData.id);
            if (idExists) throw new Error('O ID já está em uso, altere!');

            const uid = `fireguard-ext-${Date.now()}`;
            const newExtinguisher: Extinguisher = {
                ...newExtinguisherData,
                uid: uid,
                qrCodeValue: uid,
                inspections: [],
            };
            
            const newExtinguishers = [...(building.extinguishers || []), newExtinguisher];
            transaction.update(buildingRef, { extinguishers: newExtinguishers });
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function updateExtinguisherData(buildingId: string, uid: string, updatedData: Partial<any>): Promise<ActionResponse> {
    return performUpdate<any>(buildingId, uid, updatedData, 'extinguishers');
}


export async function deleteExtinguisher(buildingId: string, uid: string) {
    const buildingRef = adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId);
    await adminDb.runTransaction(async (transaction) => {
        const buildingDoc = await transaction.get(buildingRef);
        if (!buildingDoc.exists) throw new Error('Local não encontrado.');
        
        const building = buildingFromDoc(buildingDoc);
        const newExtinguishers = (building.extinguishers || []).filter(e => e.uid !== uid);
        transaction.update(buildingRef, { extinguishers: newExtinguishers });
    });
}

export async function addHose(buildingId: string, newHoseData: HydrantFormValues): Promise<ActionResponse> {
    const buildingRef = adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId);
    try {
        await adminDb.runTransaction(async (transaction) => {
            const buildingDoc = await transaction.get(buildingRef);
            if (!buildingDoc.exists) throw new Error('Local não encontrado.');
            
            const building = buildingFromDoc(buildingDoc);
            const idExists = (building.hoses || []).some(h => h.id === newHoseData.id);
            if (idExists) throw new Error('O ID já está em uso, altere!');
            
            const uid = `fireguard-hose-${Date.now()}`;
            const newHose: Hydrant = { ...newHoseData, uid, qrCodeValue: uid, inspections: [] };
            
            const newHoses = [...(building.hoses || []), newHose];
            transaction.update(buildingRef, { hoses: newHoses });
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function updateHoseData(buildingId: string, uid: string, updatedData: Partial<HydrantFormValues>): Promise<ActionResponse> {
    return performUpdate<HydrantFormValues>(buildingId, uid, updatedData, 'hoses');
}


export async function deleteHose(buildingId: string, uid: string) {
    const buildingRef = adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId);
    await adminDb.runTransaction(async (transaction) => {
        const buildingDoc = await transaction.get(buildingRef);
        if (!buildingDoc.exists) throw new Error('Local não encontrado.');
        
        const building = buildingFromDoc(buildingDoc);
        const newHoses = (building.hoses || []).filter(h => h.uid !== uid);
        transaction.update(buildingRef, { hoses: newHoses });
    });
}


// --- Inspection Action ---
export async function finalizeInspection(session: InspectionSession) {
    const buildingRef = adminDb.collection(BUILDINGS_COLLECTION).doc(session.buildingId);
    
    await adminDb.runTransaction(async (transaction) => {
        const buildingDoc = await transaction.get(buildingRef);
        if (!buildingDoc.exists) throw new Error('Local não encontrado');

        const building = buildingFromDoc(buildingDoc);
        building.lastInspected = new Date().toISOString();

        for (const item of session.inspectedItems) {
            const newInspection: Inspection = {
                id: `insp-${Date.now()}-${Math.random()}`,
                date: item.date,
                notes: item.notes,
                status: item.status,
                itemStatuses: item.itemStatuses,
            };

            if (item.qrCodeValue.startsWith('fireguard-ext-')) {
                const extIndex = (building.extinguishers || []).findIndex(e => e.uid === item.uid);
                if (extIndex !== -1) {
                    const originalExtinguisher = { ...building.extinguishers[extIndex] };
                    const validatedUpdates = ExtinguisherFormSchema.partial().safeParse(item.updatedData || {});
                    
                    if(validatedUpdates.success && item.updatedData) {
                        building.extinguishers[extIndex] = { ...originalExtinguisher, ...validatedUpdates.data };
                    }
                    
                    building.extinguishers[extIndex].inspections = [...(originalExtinguisher.inspections || []), newInspection];
                    building.extinguishers[extIndex].lastInspected = item.date;
                }
            } else if (item.qrCodeValue.startsWith('fireguard-hose-')) {
                 const hoseIndex = (building.hoses || []).findIndex(h => h.uid === item.uid);
                 if (hoseIndex !== -1) {
                    const originalHose = { ...building.hoses[hoseIndex] };
                    const validatedUpdates = HydrantFormSchema.partial().safeParse(item.updatedData || {});

                    if(validatedUpdates.success && item.updatedData) {
                        building.hoses[hoseIndex] = { ...originalHose, ...validatedUpdates.data };
                    }
                    
                    building.hoses[hoseIndex].inspections = [...(originalHose.inspections || []), newInspection];
                    building.hoses[hoseIndex].lastInspected = item.date;
                 }
            } else if (item.qrCodeValue.startsWith('manual:')) {
                 if (!building.manualInspections) building.manualInspections = [];
                 building.manualInspections.push({ ...newInspection, manualId: item.id });
            }
        }

        transaction.update(buildingRef, {
            lastInspected: building.lastInspected,
            extinguishers: building.extinguishers,
            hoses: building.hoses,
            manualInspections: building.manualInspections
        });
    });
}


// --- Reorder Action ---
export async function updateEquipmentOrder(buildingId: string, equipmentType: 'extinguishers' | 'hoses', orderedItems: (Extinguisher | Hydrant)[]) {
    const buildingRef = adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId);
    await buildingRef.update({ [equipmentType]: orderedItems });
}
