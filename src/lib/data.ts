

'use server';

import type { Extinguisher, Hydrant, Client, Building, Inspection, ExtinguisherType, ExtinguisherWeight } from '@/lib/types';
import { adminDb } from './firebase-admin'; 
import { ClientFormValues, ExtinguisherFormSchema, HydrantFormValues, HydrantFormSchema } from './schemas';
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
    buildings: data.buildings || [],
    buildingOrder: data.buildingOrder || [],
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
        buildings: [],
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
    await clientRef.delete();
}


// --- Building Functions ---
export async function getBuildingById(clientId: string, buildingId: string): Promise<Building | null> {
    const client = await getClientById(clientId);
    return client?.buildings.find(b => b.id === buildingId) || null;
}

export async function getBuildingsByClient(clientId: string): Promise<Building[]> {
  const client = await getClientById(clientId);
  if (!client) return [];

  const orderedIds = client.buildingOrder || [];
  const buildingsMap = new Map(client.buildings.map(b => [b.id, b]));
  const orderedBuildings = orderedIds.map(id => buildingsMap.get(id)).filter(Boolean) as Building[];
  
  const unorderedBuildings = client.buildings.filter(b => !orderedIds.includes(b.id));

  return [...orderedBuildings, ...unorderedBuildings];
}


export async function addBuilding(clientId: string, newBuildingData: { name: string }): Promise<void> {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    await adminDb.runTransaction(async (transaction) => {
        const clientDoc = await transaction.get(clientRef);
        if (!clientDoc.exists) throw new Error('Cliente não encontrado.');
        
        const client = clientFromDoc(clientDoc);
        const buildingExists = client.buildings.some(b => b.name === newBuildingData.name);
        if (buildingExists) throw new Error('Um local com este nome já existe para este cliente.');
        
        const newBuildingId = `bldg-${Date.now()}`;
        const newBuilding: Building = {
            id: newBuildingId,
            name: newBuildingData.name,
            extinguishers: [],
            hoses: [],
        };
        const newBuildings = [...client.buildings, newBuilding];
        const newBuildingOrder = [...(client.buildingOrder || []), newBuildingId];
        
        transaction.update(clientRef, { buildings: newBuildings, buildingOrder: newBuildingOrder });
    });
}

export async function updateBuilding(clientId: string, buildingId: string, updatedData: Partial<Building>) {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    await adminDb.runTransaction(async (transaction) => {
        const clientDoc = await transaction.get(clientRef);
        if (!clientDoc.exists) throw new Error('Cliente não encontrado.');
        
        const client = clientFromDoc(clientDoc);
        const buildingIndex = client.buildings.findIndex(b => b.id === buildingId);
        if (buildingIndex === -1) throw new Error('Local não encontrado.');
        
        client.buildings[buildingIndex] = { ...client.buildings[buildingIndex], ...updatedData };
        transaction.update(clientRef, { buildings: client.buildings });
    });
}

export async function deleteBuilding(clientId: string, buildingId: string) {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    await adminDb.runTransaction(async (transaction) => {
        const clientDoc = await transaction.get(clientRef);
        if (!clientDoc.exists) throw new Error('Cliente não encontrado.');
        
        const client = clientFromDoc(clientDoc);
        const newBuildings = client.buildings.filter(b => b.id !== buildingId);
        const newBuildingOrder = (client.buildingOrder || []).filter(id => id !== buildingId);
        
        transaction.update(clientRef, { buildings: newBuildings, buildingOrder: newBuildingOrder });
    });
}

export async function updateBuildingOrder(clientId: string, orderedBuildingIds: string[]) {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    await clientRef.update({ buildingOrder: orderedBuildingIds });
}


// --- Equipment Functions ---
export async function getExtinguishersByBuilding(clientId: string, buildingId: string): Promise<Extinguisher[]> {
    const building = await getBuildingById(clientId, buildingId);
    return building?.extinguishers || [];
}

export async function getHosesByBuilding(clientId: string, buildingId: string): Promise<Hydrant[]> {
    const building = await getById(clientId, buildingId);
    return building?.hoses || [];
}

export async function getEquipmentForBuildings(clientId: string, buildingIds: string[]): Promise<{extinguishers: (Extinguisher & {buildingId: string, buildingName: string})[], hoses: (Hydrant & {buildingId: string, buildingName: string})[]}> {
  const client = await getClientById(clientId);
  if (!client) {
      return { extinguishers: [], hoses: [] };
  }
  
  const result: {
      extinguishers: (Extinguisher & {buildingId: string, buildingName: string})[],
      hoses: (Hydrant & {buildingId: string, buildingName: string})[]
  } = { extinguishers: [], hoses: [] };

  for (const buildingId of buildingIds) {
      const building = client.buildings.find(b => b.id === buildingId);
      if (building) {
          (building.extinguishers || []).forEach(ext => result.extinguishers.push({ ...ext, buildingId: building.id, buildingName: building.name }));
          (building.hoses || []).forEach(hose => result.hoses.push({ ...hose, buildingId: building.id, buildingName: building.name }));
      }
  }
  return result;
}


export async function getExtinguisherByUid(clientId: string, buildingId: string, uid: string): Promise<Extinguisher | null> {
    const building = await getBuildingById(clientId, buildingId);
    return building?.extinguishers.find(e => e.uid === uid) || null;
}

export async function getHoseByUid(clientId: string, buildingId: string, uid: string): Promise<Hydrant | null> {
    const building = await getBuildingById(clientId, buildingId);
    return building?.hoses.find(h => h.uid === uid) || null;
}

interface ActionResponse {
    success: boolean;
    message?: string;
}

async function performUpdate<T>(clientId: string, buildingId: string, uid: string, updatedData: Partial<T>, equipmentType: 'extinguishers' | 'hoses'): Promise<ActionResponse> {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    try {
        await adminDb.runTransaction(async (transaction) => {
            const clientDoc = await transaction.get(clientRef);
            if (!clientDoc.exists) throw new Error('Cliente não encontrado.');
            
            const client = clientFromDoc(clientDoc);
            const buildingIndex = client.buildings.findIndex(b => b.id === buildingId);
            if (buildingIndex === -1) throw new Error('Local não encontrado.');
            
            const equipmentList = [...(client.buildings[buildingIndex][equipmentType] || [])];
            const itemIndex = equipmentList.findIndex(e => e.uid === uid);
            if (itemIndex === -1) throw new Error('Equipamento não encontrado.');

            const editableData = updatedData as { id?: string };
            if (editableData.id && editableData.id !== equipmentList[itemIndex].id) {
                const idExists = equipmentList.some(e => e.id === editableData.id && e.uid !== uid);
                if (idExists) throw new Error('O ID já está em uso, altere!');
            }

            equipmentList[itemIndex] = { ...equipmentList[itemIndex], ...updatedData };
            client.buildings[buildingIndex][equipmentType] = equipmentList;
            
            transaction.update(clientRef, { buildings: client.buildings });
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}


export async function addExtinguisher(clientId: string, buildingId: string, newExtinguisherData: any): Promise<ActionResponse> {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    try {
        await adminDb.runTransaction(async (transaction) => {
            const clientDoc = await transaction.get(clientRef);
            if (!clientDoc.exists) throw new Error('Cliente não encontrado.');
            
            const client = clientFromDoc(clientDoc);
            const buildingIndex = client.buildings.findIndex(b => b.id === buildingId);
            if (buildingIndex === -1) throw new Error('Local não encontrado.');

            const building = client.buildings[buildingIndex];
            const idExists = (building.extinguishers || []).some(e => e.id === newExtinguisherData.id);
            if (idExists) throw new Error('O ID já está em uso, altere!');

            const uid = `fireguard-ext-${Date.now()}`;
            const newExtinguisher: Extinguisher = {
                ...newExtinguisherData,
                uid: uid,
                qrCodeValue: uid,
                inspections: [],
            };
            
            if (!building.extinguishers) building.extinguishers = [];
            building.extinguishers.push(newExtinguisher);

            transaction.update(clientRef, { buildings: client.buildings });
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function updateExtinguisherData(clientId: string, buildingId: string, uid: string, updatedData: Partial<any>): Promise<ActionResponse> {
    return performUpdate<any>(clientId, buildingId, uid, updatedData, 'extinguishers');
}


export async function deleteExtinguisher(clientId: string, buildingId: string, uid: string) {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    await adminDb.runTransaction(async (transaction) => {
        const clientDoc = await transaction.get(clientRef);
        if (!clientDoc.exists) throw new Error('Cliente não encontrado.');
        
        const client = clientFromDoc(clientDoc);
        const buildingIndex = client.buildings.findIndex(b => b.id === buildingId);
        if (buildingIndex === -1) throw new Error('Local não encontrado.');
        
        const building = client.buildings[buildingIndex];
        const newExtinguishers = (building.extinguishers || []).filter(e => e.uid !== uid);
        client.buildings[buildingIndex].extinguishers = newExtinguishers;

        transaction.update(clientRef, { buildings: client.buildings });
    });
}

export async function addHose(clientId: string, buildingId: string, newHoseData: HydrantFormValues): Promise<ActionResponse> {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    try {
        await adminDb.runTransaction(async (transaction) => {
            const clientDoc = await transaction.get(clientRef);
            if (!clientDoc.exists) throw new Error('Cliente não encontrado.');
            
            const client = clientFromDoc(clientDoc);
            const buildingIndex = client.buildings.findIndex(b => b.id === buildingId);
            if (buildingIndex === -1) throw new Error('Local não encontrado.');
            
            const building = client.buildings[buildingIndex];
            const idExists = (building.hoses || []).some(h => h.id === newHoseData.id);
            if (idExists) throw new Error('O ID já está em uso, altere!');
            
            const uid = `fireguard-hose-${Date.now()}`;
            const newHose: Hydrant = { ...newHoseData, uid, qrCodeValue: uid, inspections: [] };
            
            if (!building.hoses) building.hoses = [];
            building.hoses.push(newHose);

            transaction.update(clientRef, { buildings: client.buildings });
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function updateHoseData(clientId: string, buildingId: string, uid: string, updatedData: Partial<HydrantFormValues>): Promise<ActionResponse> {
    return performUpdate<HydrantFormValues>(clientId, buildingId, uid, updatedData, 'hoses');
}


export async function deleteHose(clientId: string, buildingId: string, uid: string) {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    await adminDb.runTransaction(async (transaction) => {
        const clientDoc = await transaction.get(clientRef);
        if (!clientDoc.exists) throw new Error('Cliente não encontrado.');
        
        const client = clientFromDoc(clientDoc);
        const buildingIndex = client.buildings.findIndex(b => b.id === buildingId);
        if (buildingIndex === -1) throw new Error('Local não encontrado.');

        const building = client.buildings[buildingIndex];
        const newHoses = (building.hoses || []).filter(h => h.uid !== uid);
        client.buildings[buildingIndex].hoses = newHoses;

        transaction.update(clientRef, { buildings: client.buildings });
    });
}

// --- Inspection Action ---
export async function finalizeInspection(session: InspectionSession) {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(session.clientId);
    
    await adminDb.runTransaction(async (transaction) => {
        const clientDoc = await transaction.get(clientRef);
        if (!clientDoc.exists) throw new Error('Cliente não encontrado');

        const client = clientFromDoc(clientDoc);
        const buildingIndex = client.buildings.findIndex(b => b.id === session.buildingId);
        if (buildingIndex === -1) throw new Error('Local não encontrado');

        const building = client.buildings[buildingIndex];
        building.lastInspected = new Date().toISOString();

        for (const item of session.inspectedItems) {
            const newInspection: Inspection = {
                id: `insp-${Date.now()}-${Math.random()}`,
                date: item.date,
                notes: item.notes,
                status: item.status,
                itemStatuses: item.itemStatuses,
            };

            const isExtinguisher = item.qrCodeValue.startsWith('fireguard-ext-');
            const isHose = item.qrCodeValue.startsWith('fireguard-hose-');
            
            let originalItem: Extinguisher | Hydrant | undefined;
            let equipmentIndex: number = -1;
            let equipmentArray: (Extinguisher[] | Hydrant[]) = [];

            if (isExtinguisher) {
                equipmentArray = building.extinguishers;
                equipmentIndex = (building.extinguishers || []).findIndex(e => e.uid === item.uid);
                if (equipmentIndex !== -1) originalItem = building.extinguishers[equipmentIndex];
            } else if (isHose) {
                equipmentArray = building.hoses;
                equipmentIndex = (building.hoses || []).findIndex(h => h.uid === item.uid);
                if (equipmentIndex !== -1) originalItem = building.hoses[equipmentIndex];
            }

            if (originalItem && equipmentIndex !== -1) {
                let updatedData = {};

                if (isExtinguisher && item.updatedData) {
                    const original = originalItem as Extinguisher;
                    const updates = item.updatedData as Partial<Extinguisher>;
                    updatedData = {
                        type: updates.type && extinguisherTypes.includes(updates.type) ? updates.type : original.type,
                        weight: updates.weight && extinguisherWeights.includes(updates.weight) ? updates.weight : original.weight,
                        expiryDate: updates.expiryDate || original.expiryDate,
                    };
                } else if (isHose && item.updatedData) {
                    const original = originalItem as Hydrant;
                    const updates = item.updatedData as Partial<Hydrant>;
                    updatedData = {
                         location: updates.location || original.location,
                         quantity: updates.quantity && hydrantQuantities.includes(updates.quantity) ? updates.quantity : original.quantity,
                         hoseType: updates.hoseType && hydrantTypes.includes(updates.hoseType) ? updates.hoseType : original.hoseType,
                         diameter: updates.diameter && hydrantDiameters.includes(updates.diameter) ? updates.diameter : original.diameter,
                         hoseLength: updates.hoseLength && hydrantHoseLengths.includes(updates.hoseLength) ? updates.hoseLength : original.hoseLength,
                         keyQuantity: (updates.keyQuantity !== undefined && hydrantKeyQuantities.includes(updates.keyQuantity)) ? updates.keyQuantity : original.keyQuantity,
                         nozzleQuantity: (updates.nozzleQuantity !== undefined && hydrantNozzleQuantities.includes(updates.nozzleQuantity)) ? updates.nozzleQuantity : original.nozzleQuantity,
                         hydrostaticTestDate: updates.hydrostaticTestDate || original.hydrostaticTestDate,
                    }
                }
                
                const combinedItem = { 
                    ...originalItem, 
                    ...updatedData,
                    inspections: [...(originalItem.inspections || []), newInspection],
                    lastInspected: item.date,
                };

                (equipmentArray as any[])[equipmentIndex] = combinedItem;

            } else if (item.qrCodeValue.startsWith('manual:')) {
                 if (!building.manualInspections) building.manualInspections = [];
                 building.manualInspections.push({ ...newInspection, manualId: item.id });
            }
        }

        transaction.update(clientRef, {
            buildings: client.buildings
        });
    });
}

// --- Reorder Action ---
export async function updateEquipmentOrder(clientId: string, buildingId: string, equipmentType: 'extinguishers' | 'hoses', orderedItems: (Extinguisher | Hydrant)[]) {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    await adminDb.runTransaction(async (transaction) => {
        const clientDoc = await transaction.get(clientRef);
        if (!clientDoc.exists) throw new Error('Cliente não encontrado.');
        
        const client = clientFromDoc(clientDoc);
        const buildingIndex = client.buildings.findIndex(b => b.id === buildingId);
        if (buildingIndex === -1) throw new Error('Local não encontrado.');
        
        client.buildings[buildingIndex][equipmentType] = orderedItems as any;
        transaction.update(clientRef, { buildings: client.buildings });
    });
}
