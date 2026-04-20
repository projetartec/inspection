
'use server';

import type { Extinguisher, Hydrant, Client, Building, Inspection } from '@/lib/types';
import { adminDb } from './firebase-admin'; 
import { ClientFormValues, ExtinguisherFormValues, HydrantFormValues } from './schemas';
import type { InspectedItem, InspectionSession } from '@/hooks/use-inspection-session.tsx';
import { FieldValue } from 'firebase-admin/firestore';
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

// --- Helper Functions ---

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
        lastInspected: data.lastInspected,
    };
}

// --- Client Data Functions ---

export async function getClients(): Promise<Client[]> {
  try {
    const querySnapshot = await adminDb.collection(CLIENTS_COLLECTION).orderBy("name").get();
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        fantasyName: doc.data().fantasyName,
    }) as Client);
  } catch (error) {
    console.error("Error fetching clients: ", error);
    throw new Error('Falha ao buscar clientes no Firestore.');
  }
}

export async function getClientById(clientId: string): Promise<Client | null> {
  try {
    const docSnap = await adminDb.collection(CLIENTS_COLLECTION).doc(clientId).get();
    return docSnap.exists ? clientFromDoc(docSnap) : null;
  } catch (error) {
    console.error(`Error fetching client ${clientId}: `, error);
    throw new Error('Falha ao buscar cliente no Firestore.');
  }
}

export async function addClient(newClientData: ClientFormValues): Promise<string> {
    const q = await adminDb.collection(CLIENTS_COLLECTION).where("name", "==", newClientData.name).get();
    if (!q.empty) {
        throw new Error('Um cliente com este nome de empresa já existe.');
    }
    const docRef = await adminDb.collection(CLIENTS_COLLECTION).add({
        ...newClientData,
        buildingOrder: []
    });
    return docRef.id;
}

export async function updateClient(id: string, updatedData: Partial<ClientFormValues>) {
  await adminDb.collection(CLIENTS_COLLECTION).doc(id).update(updatedData);
}

export async function deleteClient(id: string) {
    const batch = adminDb.batch();
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(id);
    batch.delete(clientRef);

    const buildingsSnapshot = await adminDb.collection(BUILDINGS_COLLECTION).where('clientId', '==', id).get();
    buildingsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
}

// --- Building Data Functions (NEW MIGRATION-AWARE LOGIC) ---

export async function getBuildingsByClient(clientId: string): Promise<Building[]> {
    const client = await getClientById(clientId);
    if (!client) return [];

    const buildingsSnapshot = await adminDb.collection(BUILDINGS_COLLECTION).where('clientId', '==', clientId).get();
    const newBuildings = buildingsSnapshot.docs.map(buildingFromDoc);
    const newBuildingIds = new Set(newBuildings.map(b => b.id));

    const oldBuildings = (client.buildings || [])
        .filter(b => !newBuildingIds.has(b.id))
        .map(b => ({ ...b, clientId: clientId } as Building));

    const allBuildings = [...oldBuildings, ...newBuildings];
    const buildingOrder = client.buildingOrder || [];
    const buildingMap = new Map(allBuildings.map(b => [b.id, b]));

    const orderedBuildings = buildingOrder.map(id => buildingMap.get(id)).filter(Boolean) as Building[];
    const unorderedBuildings = allBuildings.filter(b => !buildingOrder.includes(b.id));

    return [...orderedBuildings, ...unorderedBuildings];
}

export async function getBuildingById(clientId: string, buildingId: string): Promise<Building | null> {
    const buildingDoc = await adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId).get();
    if (buildingDoc.exists) {
        const building = buildingFromDoc(buildingDoc);
        return building.clientId === clientId ? building : null;
    }

    const client = await getClientById(clientId);
    const oldBuilding = client?.buildings?.find(b => b.id === buildingId);
    return oldBuilding ? { ...oldBuilding, clientId } as Building : null;
}

async function saveBuilding(building: Building, transaction: FirebaseFirestore.Transaction): Promise<void> {
    const buildingRef = adminDb.collection(BUILDINGS_COLLECTION).doc(building.id);
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(building.clientId);

    transaction.set(buildingRef, building);

    const clientDoc = await transaction.get(clientRef);
    if (clientDoc.exists) {
        const clientData = clientFromDoc(clientDoc);
        const oldBuildingIndex = (clientData.buildings || []).findIndex(b => b.id === building.id);
        if (oldBuildingIndex !== -1) {
            const updatedOldBuildings = [...clientData.buildings!];
            updatedOldBuildings.splice(oldBuildingIndex, 1);
            transaction.update(clientRef, { buildings: updatedOldBuildings });
        }
    }
}

export async function addBuilding(clientId: string, newBuildingData: { name: string; gpsLink?: string }): Promise<void> {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    const newBuildingRef = adminDb.collection(BUILDINGS_COLLECTION).doc(); 

    const building: Building = {
        id: newBuildingRef.id,
        clientId: clientId,
        name: newBuildingData.name,
        gpsLink: newBuildingData.gpsLink || '',
        extinguishers: [],
        hoses: [],
        manualInspections: [],
    };
    
    await adminDb.runTransaction(async (transaction) => {
        transaction.set(newBuildingRef, building);
        transaction.update(clientRef, { buildingOrder: FieldValue.arrayUnion(newBuildingRef.id) });
    });
}

export async function updateBuilding(clientId: string, buildingId: string, updatedData: Partial<Omit<Building, 'id' | 'clientId'>>) {
    const building = await getBuildingById(clientId, buildingId);
    if (!building) throw new Error("Local não encontrado.");

    const updatedBuilding = { ...building, ...updatedData };

    await adminDb.runTransaction(async t => {
        await saveBuilding(updatedBuilding, t);
    });
}

export async function deleteBuilding(clientId: string, buildingId: string) {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    const buildingRef = adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId);

    await adminDb.runTransaction(async (transaction) => {
        transaction.delete(buildingRef);

        const clientDoc = await transaction.get(clientRef);
        if (clientDoc.exists) {
            const clientData = clientFromDoc(clientDoc);
            const oldBuildings = (clientData.buildings || []).filter(b => b.id !== buildingId);
            const newBuildingOrder = (clientData.buildingOrder || []).filter(id => id !== buildingId);
            transaction.update(clientRef, {
                buildings: oldBuildings,
                buildingOrder: newBuildingOrder
            });
        }
    });
}

export async function updateBuildingOrder(clientId: string, orderedBuildingIds: string[]) {
    await adminDb.collection(CLIENTS_COLLECTION).doc(clientId).update({ buildingOrder: orderedBuildingIds });
}


// --- Equipment & Inspection ---

export async function getEquipmentForBuildings(clientId: string, buildingIds: string[]): Promise<{extinguishers: (Extinguisher & {buildingId: string, buildingName: string})[], hoses: (Hydrant & {buildingId: string, buildingName: string})[]}> {
  const buildings = await getBuildingsByClient(clientId);
  const relevantBuildings = buildings.filter(b => buildingIds.includes(b.id));

  const result: {
      extinguishers: (Extinguisher & {buildingId: string, buildingName: string})[],
      hoses: (Hydrant & {buildingId: string, buildingName: string})[]
  } = { extinguishers: [], hoses: [] };

  for (const building of relevantBuildings) {
      (building.extinguishers || []).forEach(ext => result.extinguishers.push({ ...ext, buildingId: building.id, buildingName: building.name }));
      (building.hoses || []).forEach(hose => result.hoses.push({ ...hose, buildingId: building.id, buildingName: building.name }));
  }
  return result;
}

export async function getExtinguishersByBuilding(clientId: string, buildingId: string): Promise<Extinguisher[]> {
    const building = await getBuildingById(clientId, buildingId);
    return building?.extinguishers || [];
}

export async function getHosesByBuilding(clientId: string, buildingId: string): Promise<Hydrant[]> {
    const building = await getBuildingById(clientId, buildingId);
    return building?.hoses || [];
}

export async function getExtinguisherByUid(clientId: string, buildingId: string, uid: string): Promise<Extinguisher | null> {
    const building = await getBuildingById(clientId, buildingId);
    return building?.extinguishers.find(e => e.uid === uid) || null;
}

export async function getHoseByUid(clientId: string, buildingId: string, uid: string): Promise<Hydrant | null> {
    const building = await getBuildingById(clientId, buildingId);
    return building?.hoses.find(h => h.uid === uid) || null;
}

async function updateEquipmentInBuilding(clientId: string, buildingId: string, equipmentType: 'extinguishers' | 'hoses', updatedEquipment: Extinguisher[] | Hydrant[]) {
    const building = await getBuildingById(clientId, buildingId);
    if (!building) throw new Error("Local não encontrado.");

    const updatedBuilding = { ...building, [equipmentType]: updatedEquipment };
    
    await adminDb.runTransaction(async t => {
        await saveBuilding(updatedBuilding, t);
    });
}

export async function addExtinguisher(clientId: string, buildingId: string, newExtinguisherData: ExtinguisherFormValues): Promise<{success: boolean, message?: string}> {
    const building = await getBuildingById(clientId, buildingId);
    if (!building) return { success: false, message: 'Local não encontrado.'};

    if (building.extinguishers.some(e => e.id === newExtinguisherData.id)) {
        return { success: false, message: 'O ID já está em uso neste local, altere!' };
    }
    
    const uid = `fireguard-ext-${Date.now()}`;
    const newExtinguisher: Extinguisher = {
        ...newExtinguisherData,
        uid,
        qrCodeValue: uid,
        inspections: [],
    };
    
    const updatedExtinguishers = [...building.extinguishers, newExtinguisher];
    await updateEquipmentInBuilding(clientId, buildingId, 'extinguishers', updatedExtinguishers);
    return { success: true };
}

export async function updateExtinguisherData(clientId: string, buildingId: string, uid: string, updatedData: Partial<ExtinguisherFormValues>): Promise<{success: boolean, message?: string}> {
    const building = await getBuildingById(clientId, buildingId);
    if (!building) return { success: false, message: 'Local não encontrado.'};

    const itemIndex = building.extinguishers.findIndex(e => e.uid === uid);
    if (itemIndex === -1) return { success: false, message: 'Extintor não encontrado.'};

    if (updatedData.id && updatedData.id !== building.extinguishers[itemIndex].id) {
        if (building.extinguishers.some(e => e.id === updatedData.id && e.uid !== uid)) {
            return { success: false, message: 'O ID já está em uso, altere!' };
        }
    }
    
    building.extinguishers[itemIndex] = { ...building.extinguishers[itemIndex], ...updatedData };
    await updateEquipmentInBuilding(clientId, buildingId, 'extinguishers', building.extinguishers);
    return { success: true };
}

export async function deleteExtinguisher(clientId: string, buildingId: string, uid: string) {
    const building = await getBuildingById(clientId, buildingId);
    if (!building) throw new Error("Local não encontrado.");

    const updatedExtinguishers = building.extinguishers.filter(e => e.uid !== uid);
    await updateEquipmentInBuilding(clientId, buildingId, 'extinguishers', updatedExtinguishers);
}

export async function addHose(clientId: string, buildingId: string, newHoseData: HydrantFormValues): Promise<{success: boolean, message?: string}> {
    const building = await getBuildingById(clientId, buildingId);
    if (!building) return { success: false, message: 'Local não encontrado.'};
    
    if (building.hoses.some(h => h.id === newHoseData.id)) {
        return { success: false, message: 'O ID já está em uso, altere!' };
    }

    const uid = `fireguard-hose-${Date.now()}`;
    const newHose: Hydrant = { ...newHoseData, uid, qrCodeValue: uid, inspections: [] };

    const updatedHoses = [...building.hoses, newHose];
    await updateEquipmentInBuilding(clientId, buildingId, 'hoses', updatedHoses);
    return { success: true };
}

export async function updateHoseData(clientId: string, buildingId: string, uid: string, updatedData: Partial<HydrantFormValues>): Promise<{success: boolean, message?: string}> {
    const building = await getBuildingById(clientId, buildingId);
    if (!building) return { success: false, message: 'Local não encontrado.' };

    const itemIndex = building.hoses.findIndex(h => h.uid === uid);
    if (itemIndex === -1) return { success: false, message: 'Hidrante não encontrado.' };
    
    if (updatedData.id && updatedData.id !== building.hoses[itemIndex].id) {
        if (building.hoses.some(h => h.id === updatedData.id && h.uid !== uid)) {
            return { success: false, message: 'O ID já está em uso, altere!' };
        }
    }

    building.hoses[itemIndex] = { ...building.hoses[itemIndex], ...updatedData };
    await updateEquipmentInBuilding(clientId, buildingId, 'hoses', building.hoses);
    return { success: true };
}

export async function deleteHose(clientId: string, buildingId: string, uid: string) {
    const building = await getBuildingById(clientId, buildingId);
    if (!building) throw new Error("Local não encontrado.");

    const updatedHoses = building.hoses.filter(h => h.uid !== uid);
    await updateEquipmentInBuilding(clientId, buildingId, 'hoses', updatedHoses);
}

export async function updateEquipmentOrder(clientId: string, buildingId: string, equipmentType: 'extinguishers' | 'hoses', orderedItems: (Extinguisher | Hydrant)[]) {
    await updateEquipmentInBuilding(clientId, buildingId, equipmentType, orderedItems as any);
}

export async function finalizeInspection(session: InspectionSession) {
    const { clientId, buildingId } = session;
    
    const building = await getBuildingById(clientId, buildingId);
    if (!building) throw new Error("Local não encontrado.");

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
        
        let equipmentIndex = -1;

        if (isExtinguisher) {
            equipmentIndex = building.extinguishers.findIndex(e => e.uid === item.uid);
            if (equipmentIndex !== -1) {
                const originalItem = building.extinguishers[equipmentIndex];
                let updatedItem = { ...originalItem };

                if (item.updatedData) {
                    const updates = item.updatedData as Partial<Extinguisher>;
                    if (updates.type && extinguisherTypes.includes(updates.type)) updatedItem.type = updates.type;
                    const newWeight = Number(updates.weight);
                    if (updates.weight && extinguisherWeights.includes(newWeight as any)) updatedItem.weight = newWeight;
                    if (updates.hydrostaticTestYear) updatedItem.hydrostaticTestYear = String(updates.hydrostaticTestYear);
                    if (updates.expiryDate !== undefined) updatedItem.expiryDate = updates.expiryDate;
                }

                updatedItem.inspections = [...(originalItem.inspections || []), newInspection];
                updatedItem.lastInspected = item.date;
                building.extinguishers[equipmentIndex] = updatedItem;
            }
        } else if (isHose) {
            equipmentIndex = building.hoses.findIndex(h => h.uid === item.uid);
            if (equipmentIndex !== -1) {
                const originalItem = building.hoses[equipmentIndex];
                let updatedItem = { ...originalItem };

                if (item.updatedData) {
                    const updates = item.updatedData as Partial<Hydrant>;
                    if (updates.location) updatedItem.location = updates.location;
                    const newQuantity = Number(updates.quantity);
                    if (updates.quantity && hydrantQuantities.includes(newQuantity as any)) updatedItem.quantity = newQuantity;
                    if (updates.hoseType && hydrantTypes.includes(updates.hoseType)) updatedItem.hoseType = updates.hoseType;
                    if (updates.diameter && hydrantDiameters.includes(updates.diameter)) updatedItem.diameter = updates.diameter;
                    const newLength = Number(updates.hoseLength);
                    if (updates.hoseLength && hydrantHoseLengths.includes(newLength as any)) updatedItem.hoseLength = newLength;
                    const newKeyQty = Number(updates.keyQuantity);
                    if (updates.keyQuantity !== undefined && hydrantKeyQuantities.includes(newKeyQty as any)) updatedItem.keyQuantity = newKeyQty;
                    const newNozzleQty = Number(updates.nozzleQuantity);
                    if (updates.nozzleQuantity !== undefined && hydrantNozzleQuantities.includes(newNozzleQty as any)) updatedItem.nozzleQuantity = newNozzleQty;
                    if (updates.hydrostaticTestDate !== undefined) updatedItem.hydrostaticTestDate = updates.hydrostaticTestDate;
                }

                updatedItem.inspections = [...(originalItem.inspections || []), newInspection];
                updatedItem.lastInspected = item.date;
                building.hoses[equipmentIndex] = updatedItem;
            }
        } else if (item.qrCodeValue.startsWith('manual:')) {
            if (!building.manualInspections) building.manualInspections = [];
            building.manualInspections.push({ ...newInspection, manualId: item.id });
        }
    }
    
    // Save the entire building, which will trigger the migration if needed
    await adminDb.runTransaction(async t => {
        await saveBuilding(building, t);
    });
}
