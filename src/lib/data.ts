
'use server';

import type { Extinguisher, Hydrant, Client, Building, Inspection, AbbreviatedInspectionSession } from '@/lib/types';
import { ClientFormValues, ExtinguisherFormValues, HydrantFormValues } from './schemas';
import type { InspectedItem, InspectionSession } from '@/hooks/use-inspection-session.tsx';
import { adminDb } from './firebase-admin'; 
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
const EXTINGUISHERS_SUBCOLLECTION = 'extinguishers';
const HOSES_SUBCOLLECTION = 'hoses';
const INSPECTIONS_SUBCOLLECTION = 'inspections';

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
    buildings: data.buildings,
    buildingOrder: data.buildingOrder || [],
  };
}

function buildingFromDoc(doc: FirebaseFirestore.DocumentSnapshot): Building {
    const data = doc.data()!;
    return {
        id: doc.id,
        clientId: data.clientId,
        name: data.name,
        extinguishers: data.extinguishers, // Legacy array
        hoses: data.hoses, // Legacy array
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
        // Here you might want to delete subcollections too, but it requires a recursive function.
        // For now, just deleting the building doc.
        batch.delete(doc.ref);
    });

    await batch.commit();
}


// --- Building Data Functions ---

export async function getBuildingsByClient(clientId: string): Promise<Building[]> {
    const client = await getClientById(clientId);
    if (!client) return [];

    const buildingsSnapshot = await adminDb.collection(BUILDINGS_COLLECTION).where('clientId', '==', clientId).get();
    const newBuildings = buildingsSnapshot.docs.map(buildingFromDoc);
    
    // Include old buildings from the client document
    const oldBuildings = (client.buildings || []).map(b => ({ ...b, clientId: clientId } as Building));
    
    // Merge and remove duplicates, preferring the new structure
    const buildingMap = new Map<string, Building>();
    oldBuildings.forEach(b => buildingMap.set(b.id, b));
    newBuildings.forEach(b => buildingMap.set(b.id, b));

    const allBuildings = Array.from(buildingMap.values());
    const buildingOrder = client.buildingOrder || [];
    
    const orderedBuildings = buildingOrder
        .map(id => allBuildings.find(b => b.id === id))
        .filter(Boolean) as Building[];
    
    const unorderedBuildings = allBuildings.filter(b => !buildingOrder.includes(b.id));

    return [...orderedBuildings, ...unorderedBuildings];
}

export async function getBuildingById(clientId: string, buildingId: string, transaction?: FirebaseFirestore.Transaction): Promise<Building | null> {
    const get = transaction ? transaction.get.bind(transaction) : adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId).get.bind(adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId));

    const buildingDoc = await get(adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId));

    if (buildingDoc.exists) {
        const building = buildingFromDoc(buildingDoc);
        return building.clientId === clientId ? building : null;
    }

    const client = await getClientById(clientId);
    const oldBuilding = client?.buildings?.find(b => b.id === buildingId);
    
    return oldBuilding ? { ...oldBuilding, clientId } as Building : null;
}

export async function addBuilding(clientId: string, newBuildingData: { name: string; gpsLink?: string }): Promise<void> {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    const newBuildingRef = adminDb.collection(BUILDINGS_COLLECTION).doc(); 

    const building: Building = {
        id: newBuildingRef.id,
        clientId: clientId,
        name: newBuildingData.name,
        gpsLink: newBuildingData.gpsLink || '',
    };
    
    await adminDb.runTransaction(async (t) => {
        t.set(newBuildingRef, building);
        t.update(clientRef, { buildingOrder: FieldValue.arrayUnion(newBuildingRef.id) });
    });
}

export async function updateBuilding(clientId: string, buildingId: string, updatedData: Partial<Omit<Building, 'id' | 'clientId'>>) {
    const buildingRef = adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId);
    await buildingRef.update(updatedData);
}

export async function deleteBuilding(clientId: string, buildingId: string) {
    // This is a complex operation because it should delete all subcollections.
    // For now, we'll just delete the main documents. A cloud function would be better for cleanup.
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    const buildingRef = adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId);

    await adminDb.runTransaction(async (t) => {
        t.delete(buildingRef);
        t.update(clientRef, { 
            buildingOrder: FieldValue.arrayRemove(buildingId),
            buildings: FieldValue.arrayRemove( (await getBuildingById(clientId, buildingId)) ) // This might not work well
        });
    });
}

export async function updateBuildingOrder(clientId: string, orderedBuildingIds: string[]) {
    await adminDb.collection(CLIENTS_COLLECTION).doc(clientId).update({ buildingOrder: orderedBuildingIds });
}


// --- Equipment & Inspection ---

async function getEquipmentFromSubcollection<T>(buildingId: string, subcollection: string): Promise<T[]> {
    const snapshot = await adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId).collection(subcollection).get();
    return snapshot.docs.map(doc => doc.data() as T);
}

export async function getExtinguishersByBuilding(clientId: string, buildingId: string): Promise<Extinguisher[]> {
    const building = await getBuildingById(clientId, buildingId);
    if (!building) return [];
    const newExtinguishers = await getEquipmentFromSubcollection<Extinguisher>(buildingId, EXTINGUISHERS_SUBCOLLECTION);
    const legacyExtinguishers = building.extinguishers || [];
    return [...legacyExtinguishers, ...newExtinguishers];
}

export async function getHosesByBuilding(clientId: string, buildingId: string): Promise<Hydrant[]> {
    const building = await getBuildingById(clientId, buildingId);
    if (!building) return [];
    const newHoses = await getEquipmentFromSubcollection<Hydrant>(buildingId, HOSES_SUBCOLLECTION);
    const legacyHoses = building.hoses || [];
    return [...legacyHoses, ...newHoses];
}

export async function getExtinguisherByUid(clientId: string, buildingId: string, uid: string): Promise<Extinguisher | null> {
    const newDocRef = adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId).collection(EXTINGUISHERS_SUBCOLLECTION).doc(uid);
    const doc = await newDocRef.get();
    if(doc.exists) return doc.data() as Extinguisher;

    const building = await getBuildingById(clientId, buildingId);
    return building?.extinguishers?.find(e => e.uid === uid) || null;
}

export async function getHoseByUid(clientId: string, buildingId: string, uid: string): Promise<Hydrant | null> {
    const newDocRef = adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId).collection(HOSES_SUBCOLLECTION).doc(uid);
    const doc = await newDocRef.get();
    if(doc.exists) return doc.data() as Hydrant;

    const building = await getBuildingById(clientId, buildingId);
    return building?.hoses?.find(h => h.uid === uid) || null;
}


export async function addExtinguisher(clientId: string, buildingId: string, newExtinguisherData: ExtinguisherFormValues): Promise<{success: boolean, message?: string}> {
    const building = await getBuildingById(clientId, buildingId);
    if (!building) return { success: false, message: 'Local não encontrado.'};

    const allExtinguishers = await getExtinguishersByBuilding(clientId, buildingId);
    if (allExtinguishers.some(e => e.id === newExtinguisherData.id)) {
        return { success: false, message: 'O ID já está em uso neste local, altere!' };
    }
    
    const uid = `fireguard-ext-${Date.now()}`;
    const newExtinguisher: Omit<Extinguisher, 'inspections'> = {
        ...newExtinguisherData,
        uid,
        qrCodeValue: uid,
    };
    
    const newDocRef = adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId).collection(EXTINGUISHERS_SUBCOLLECTION).doc(uid);
    await newDocRef.set(newExtinguisher);

    return { success: true };
}

export async function updateExtinguisherData(clientId: string, buildingId: string, uid: string, updatedData: Partial<ExtinguisherFormValues>): Promise<{success: boolean, message?: string}> {
    const allExtinguishers = await getExtinguishersByBuilding(clientId, buildingId);
    if (updatedData.id && allExtinguishers.some(e => e.id === updatedData.id && e.uid !== uid)) {
        return { success: false, message: 'O ID já está em uso, altere!' };
    }

    const docRef = adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId).collection(EXTINGUISHERS_SUBCOLLECTION).doc(uid);
    await docRef.update(updatedData);

    return { success: true };
}

export async function deleteExtinguisher(clientId: string, buildingId: string, uid: string) {
    const docRef = adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId).collection(EXTINGUISHERS_SUBCOLLECTION).doc(uid);
    await docRef.delete();
}

export async function addHose(clientId: string, buildingId: string, newHoseData: HydrantFormValues): Promise<{success: boolean, message?: string}> {
    const allHoses = await getHosesByBuilding(clientId, buildingId);
    if (allHoses.some(h => h.id === newHoseData.id)) {
        return { success: false, message: 'O ID já está em uso, altere!' };
    }

    const uid = `fireguard-hose-${Date.now()}`;
    const newHose: Omit<Hydrant, 'inspections'> = { ...newHoseData, uid, qrCodeValue: uid };
    
    const newDocRef = adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId).collection(HOSES_SUBCOLLECTION).doc(uid);
    await newDocRef.set(newHose);

    return { success: true };
}

export async function updateHoseData(clientId: string, buildingId: string, uid: string, updatedData: Partial<HydrantFormValues>): Promise<{success: boolean, message?: string}> {
     const allHoses = await getHosesByBuilding(clientId, buildingId);
    if (updatedData.id && allHoses.some(h => h.id === updatedData.id && h.uid !== uid)) {
        return { success: false, message: 'O ID já está em uso, altere!' };
    }

    const docRef = adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId).collection(HOSES_SUBCOLLECTION).doc(uid);
    await docRef.update(updatedData);

    return { success: true };
}

export async function deleteHose(clientId: string, buildingId: string, uid: string) {
    const docRef = adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId).collection(HOSES_SUBCOLLECTION).doc(uid);
    await docRef.delete();
}

export async function updateEquipmentOrder(clientId: string, buildingId: string, equipmentType: 'extinguishers' | 'hoses', orderedItems: (Extinguisher | Hydrant)[]) {
    // This is more complex with subcollections and is a lower priority.
    // For now, this function will be a no-op.
    console.log("Reordering in subcollections is not yet implemented.");
}

export async function finalizeInspection(session: AbbreviatedInspectionSession) {
    const { cId: clientId, bId: buildingId } = session;
    const buildingRef = adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId);
    
    await adminDb.runTransaction(async t => {
        const buildingDoc = await t.get(buildingRef);
        if (!buildingDoc.exists) throw new Error("Local não encontrado.");

        const batch = adminDb.batch();

        for (const item of session.it) {
            const isManualEntry = item.qv.startsWith('manual:');
            if (isManualEntry) {
                const manualRef = buildingRef.collection('manualInspections').doc();
                const manualInspectionData = {
                    id: manualRef.id,
                    manualId: item.id,
                    date: item.dt,
                    notes: item.nt,
                    status: item.s,
                    itemStatuses: item.is
                };
                batch.set(manualRef, manualInspectionData);
                continue;
            }

            const isExtinguisher = item.qv.startsWith('fireguard-ext-');
            const collectionName = isExtinguisher ? EXTINGUISHERS_SUBCOLLECTION : HOSES_SUBCOLLECTION;
            const equipRef = buildingRef.collection(collectionName).doc(item.uid);

            const newInspRef = equipRef.collection(INSPECTIONS_SUBCOLLECTION).doc();
            const newInspection = {
                id: newInspRef.id,
                date: item.dt,
                notes: item.nt,
                status: item.s,
                itemStatuses: item.is,
            };
            batch.set(newInspRef, newInspection);

            const updatePayload: { [key: string]: any } = { lastInspected: item.dt };
            if (item.ud) {
                if (isExtinguisher) {
                    const validatedUpdate: Partial<ExtinguisherFormValues> = {};
                    const data = item.ud as Partial<ExtinguisherFormValues>;
                    if (data.type && extinguisherTypes.includes(data.type)) validatedUpdate.type = data.type;
                    if (data.weight !== undefined && extinguisherWeights.includes(Number(data.weight) as any)) validatedUpdate.weight = Number(data.weight);
                    if (data.expiryDate !== undefined) validatedUpdate.expiryDate = data.expiryDate;
                    if (data.hydrostaticTestYear !== undefined) validatedUpdate.hydrostaticTestYear = data.hydrostaticTestYear;
                    Object.assign(updatePayload, validatedUpdate);
                } else {
                    const validatedUpdate: Partial<HydrantFormValues> = {};
                    const data = item.ud as Partial<HydrantFormValues>;
                    if (data.location) validatedUpdate.location = data.location;
                    if (data.quantity !== undefined && hydrantQuantities.includes(Number(data.quantity) as any)) validatedUpdate.quantity = Number(data.quantity);
                    if (data.hoseType && hydrantTypes.includes(data.hoseType)) validatedUpdate.hoseType = data.hoseType;
                    if (data.diameter && hydrantDiameters.includes(data.diameter)) validatedUpdate.diameter = data.diameter;
                    if (data.hoseLength !== undefined && hydrantHoseLengths.includes(Number(data.hoseLength) as any)) validatedUpdate.hoseLength = Number(data.hoseLength);
                    if (data.keyQuantity !== undefined && hydrantKeyQuantities.includes(Number(data.keyQuantity) as any)) validatedUpdate.keyQuantity = Number(data.keyQuantity);
                    if (data.nozzleQuantity !== undefined && hydrantNozzleQuantities.includes(Number(data.nozzleQuantity) as any)) validatedUpdate.nozzleQuantity = Number(data.nozzleQuantity);
                    if (data.hydrostaticTestDate !== undefined) validatedUpdate.hydrostaticTestDate = data.hydrostaticTestDate;
                    Object.assign(updatePayload, validatedUpdate);
                }
            }
            batch.update(equipRef, updatePayload);
        }

        batch.update(buildingRef, { lastInspected: new Date().toISOString() });

        await batch.commit();
    });
}


// --- Report Data Fetching Actions ---

async function getFullBuildingData(clientId: string, buildingId: string): Promise<Building> {
    const building = (await getBuildingById(clientId, buildingId))!;
    const extinguishers = await getExtinguishersByBuilding(clientId, buildingId);
    const hoses = await getHosesByBuilding(clientId, buildingId);
    
    // Fetch inspections for each equipment
    for (const ext of extinguishers) {
        const inspSnapshot = await adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId).collection(EXTINGUISHERS_SUBCOLLECTION).doc(ext.uid).collection(INSPECTIONS_SUBCOLLECTION).orderBy('date', 'asc').get();
        ext.inspections = inspSnapshot.docs.map(d => d.data() as Inspection);
    }
     for (const hose of hoses) {
        const inspSnapshot = await adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId).collection(HOSES_SUBCOLLECTION).doc(hose.uid).collection(INSPECTIONS_SUBCOLLECTION).orderBy('date', 'asc').get();
        hose.inspections = inspSnapshot.docs.map(d => d.data() as Inspection);
    }

    return { ...building, extinguishers, hoses };
}

export async function getReportDataAction(clientId: string, buildingId: string) {
    const client = await getClientById(clientId);
    const building = await getFullBuildingData(clientId, buildingId);
    return { client, building, extinguishers: building.extinguishers, hoses: building.hoses };
}

export async function getClientReportDataAction(clientId: string) {
    const client = await getClientById(clientId);
    if (!client) return { client: null, buildings: [] };

    const buildingStubs = await getBuildingsByClient(clientId);
    const buildings = await Promise.all(buildingStubs.map(b => getFullBuildingData(clientId, b.id)));
    
    return { client, buildings };
}

export async function getEquipmentForBuildings(clientId: string, buildingIds: string[]) {
    const buildings = await Promise.all(buildingIds.map(bId => getFullBuildingData(clientId, bId)));
    const extinguishers = buildings.flatMap(b => (b.extinguishers || []).map(e => ({ ...e, buildingName: b.name, buildingId: b.id })));
    const hoses = buildings.flatMap(b => (b.hoses || []).map(h => ({ ...h, buildingName: b.name, buildingId: b.id })));
    return { extinguishers, hoses };
}


export async function getExpiryReportDataAction(clientId: string, buildingId: string | undefined, month: number, year: number) {
     const client = await getClientById(clientId);
    if (!client) return { client: null, buildings: [] };
    
    let buildings: Building[] = [];
    if (buildingId) {
        buildings.push(await getFullBuildingData(clientId, buildingId));
    } else {
        const buildingStubs = await getBuildingsByClient(clientId);
        buildings = await Promise.all(buildingStubs.map(b => getFullBuildingData(clientId, b.id)));
    }
    return { client, buildings };
}

export async function getHosesReportDataAction(clientId: string) {
    return getClientReportDataAction(clientId);
}

export async function getExtinguishersReportDataAction(clientId: string) {
    return getClientReportDataAction(clientId);
}

export async function getDescriptiveReportDataAction(clientId: string, buildingId?: string) {
    const client = await getClientById(clientId);
    let buildings: Building[] = [];

    if (buildingId) {
        const building = await getFullBuildingData(clientId, buildingId);
        if(building) buildings.push(building);
    } else {
        const buildingStubs = await getBuildingsByClient(clientId);
        buildings = await Promise.all(buildingStubs.map(b => getFullBuildingData(clientId, b.id)));
    }
    
    return { client, buildings };
}

export async function getNonConformityReportDataAction(clientId: string, buildingId?: string) {
    const client = await getClientById(clientId);
    let buildingsData: Building[] = [];

    if (buildingId) {
        buildingsData.push(await getFullBuildingData(clientId, buildingId));
    } else {
        const buildingStubs = await getBuildingsByClient(clientId);
        buildingsData = await Promise.all(buildingStubs.map(b => getFullBuildingData(clientId, b.id)));
    }

    const buildingsWithNC = buildingsData.map(b => {
        const ncExtinguishers = (b.extinguishers || []).filter(e => {
            if (!e.inspections || e.inspections.length === 0) return false;
            const lastInspection = e.inspections.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            return lastInspection.status === 'N/C';
        });

        const ncHoses = (b.hoses || []).filter(h => {
             if (!h.inspections || h.inspections.length === 0) return false;
            const lastInspection = h.inspections.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            return lastInspection.status === 'N/C';
        });
        
        return { ...b, extinguishers: ncExtinguishers, hoses: ncHoses };
    }).filter(b => (b.extinguishers?.length || 0) > 0 || (b.hoses?.length || 0) > 0);

    return { client, buildings: buildingsWithNC };
}
