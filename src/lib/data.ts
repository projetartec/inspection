

'use server';

import type { Extinguisher, Hydrant, Client, Building, Inspection } from '@/lib/types';
import { adminDb } from './firebase-admin'; 
import { ExtinguisherFormValues, HydrantFormValues, ClientFormValues, ExtinguisherFormSchema, HydrantFormSchema } from './schemas';
import type { InspectedItem, InspectionSession } from '@/hooks/use-inspection-session.tsx';

const CLIENTS_COLLECTION = 'clients';
const BUILDINGS_COLLECTION = 'buildings';

type ActionResponse = {
    success: boolean;
    message?: string;
}

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
    buildingIds: data.buildingIds || [],
    buildingOrder: data.buildingOrder || [],
  };
}

function buildingFromDoc(doc: FirebaseFirestore.DocumentSnapshot): Building {
    const data = doc.data()!;
    // Data migration for extinguishers
      const extinguishers = (data.extinguishers || []).map((e: any) => ({
          ...e,
          uid: e.uid || e.qrCodeValue || `ext-${Math.random()}`
      }));
      // Data migration for hoses
      const hoses = (data.hoses || []).map((h: any) => ({
          ...h,
          uid: h.uid || h.qrCodeValue || `hose-${Math.random()}`
      }));
    return {
        id: doc.id,
        clientId: data.clientId,
        name: data.name,
        extinguishers,
        hoses,
        gpsLink: data.gpsLink,
        lastInspected: data.lastInspected,
        manualInspections: data.manualInspections || [],
    };
}


// --- Client Functions ---
export async function getClients(): Promise<Client[]> {
  try {
    const querySnapshot = await adminDb.collection(CLIENTS_COLLECTION).orderBy("name").get();
    
    if (querySnapshot.empty) {
        return [];
    }
    
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
    if (docSnap.exists) {
      return clientFromDoc(docSnap);
    }
    return null;
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
    
    const docRef = adminDb.collection(CLIENTS_COLLECTION).doc();
    const newClient = {
        ...newClientData,
        buildingIds: [],
        buildingOrder: []
    };
    await docRef.set(newClient);
    return docRef.id;
}

export async function updateClient(id: string, updatedData: Partial<ClientFormValues>) {
  const docRef = adminDb.collection(CLIENTS_COLLECTION).doc(id);
  await docRef.update(updatedData);
}

export async function deleteClient(id: string) {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(id);
    const buildingsSnapshot = await adminDb.collection(BUILDINGS_COLLECTION).where('clientId', '==', id).get();

    const batch = adminDb.batch();
    
    // Delete all buildings associated with the client
    buildingsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    
    // Delete the client itself
    batch.delete(clientRef);

    await batch.commit();
}


// --- Building Functions ---
export async function getBuildingById(buildingId: string): Promise<Building | null> {
    const buildingRef = adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId);
    const buildingDoc = await buildingRef.get();
    if (!buildingDoc.exists) return null;
    return buildingFromDoc(buildingDoc);
}

export async function getBuildingsByClient(clientId: string): Promise<Building[]> {
  const client = await getClientById(clientId);
  if (!client || client.buildingIds.length === 0) {
    return [];
  }
  
  // Use a 'in' query to fetch all buildings at once
  const buildingsSnapshot = await adminDb.collection(BUILDINGS_COLLECTION).where(adminDb.FieldPath.documentId(), 'in', client.buildingIds).get();

  const buildingsMap = new Map(buildingsSnapshot.docs.map(doc => [doc.id, buildingFromDoc(doc)]));

  // Order the results based on the client's buildingOrder
  const orderedBuildings = (client.buildingOrder || client.buildingIds)
    .map(id => buildingsMap.get(id))
    .filter((b): b is Building => !!b);

  return orderedBuildings;
}

export async function addBuilding(clientId: string, newBuildingData: { name: string }): Promise<void> {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    const buildingsRef = adminDb.collection(BUILDINGS_COLLECTION);
    
    const existingBuildingsSnap = await buildingsRef.where('clientId', '==', clientId).where('name', '==', newBuildingData.name).get();
    if (!existingBuildingsSnap.empty) {
        throw new Error('Um local com este nome já existe para este cliente.');
    }
    
    const buildingDocRef = buildingsRef.doc();
    const newBuilding = {
        name: newBuildingData.name,
        clientId: clientId,
        extinguishers: [],
        hoses: [],
        manualInspections: [],
    };
    
    await adminDb.runTransaction(async (transaction) => {
        const clientDoc = await transaction.get(clientRef);
        if (!clientDoc.exists) throw new Error('Cliente não encontrado.');
        
        transaction.set(buildingDocRef, newBuilding);
        
        const currentBuildingIds = clientDoc.data()?.buildingIds || [];
        const currentBuildingOrder = clientDoc.data()?.buildingOrder || [];
        
        transaction.update(clientRef, {
            buildingIds: [...currentBuildingIds, buildingDocRef.id],
            buildingOrder: [...currentBuildingOrder, buildingDocRef.id]
        });
    });
}

export async function updateBuilding(buildingId: string, updatedData: Partial<Building>) {
    const buildingRef = adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId);
    await buildingRef.update(updatedData);
}

export async function deleteBuilding(clientId: string, buildingId: string) {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    const buildingRef = adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId);
    
    await adminDb.runTransaction(async (transaction) => {
        const clientDoc = await transaction.get(clientRef);
        if (!clientDoc.exists) throw new Error('Cliente não encontrado.');

        transaction.delete(buildingRef);

        const data = clientDoc.data()!;
        const updatedIds = (data.buildingIds || []).filter((id: string) => id !== buildingId);
        const updatedOrder = (data.buildingOrder || []).filter((id: string) => id !== buildingId);

        transaction.update(clientRef, {
            buildingIds: updatedIds,
            buildingOrder: updatedOrder
        });
    });
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

export async function getEquipmentForBuildings(buildingIds: string[]): Promise<{extinguishers: (Extinguisher & {buildingId: string, buildingName: string})[], hoses: (Hydrant & {buildingId: string, buildingName: string})[]}> {
  if (buildingIds.length === 0) {
      return { extinguishers: [], hoses: [] };
  }
  
  const buildingsSnapshot = await adminDb.collection(BUILDINGS_COLLECTION).where(adminDb.FieldPath.documentId(), 'in', buildingIds).get();

  const result = {
    extinguishers: [] as (Extinguisher & {buildingId: string, buildingName: string})[],
    hoses: [] as (Hydrant & {buildingId: string, buildingName: string})[]
  };

  buildingsSnapshot.docs.forEach(doc => {
      const building = buildingFromDoc(doc);
      (building.extinguishers || []).forEach(ext => result.extinguishers.push({ ...ext, buildingId: building.id, buildingName: building.name }));
      (building.hoses || []).forEach(hose => result.hoses.push({ ...hose, buildingId: building.id, buildingName: building.name }));
  });

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

export async function addExtinguisher(buildingId: string, newExtinguisherData: ExtinguisherFormValues): Promise<ActionResponse> {
    const buildingRef = adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId);
    try {
        await adminDb.runTransaction(async (transaction) => {
            const buildingDoc = await transaction.get(buildingRef);
            if (!buildingDoc.exists) throw new Error('Local não encontrado.');
            
            const building = buildingFromDoc(buildingDoc);

            const idExists = (building.extinguishers || []).some(e => e.id === newExtinguisherData.id);
            if (idExists) {
                throw new Error('O ID já está em uso, altere!');
            }

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

export async function updateExtinguisherData(buildingId: string, uid: string, updatedData: Partial<ExtinguisherFormValues>): Promise<ActionResponse> {
    const buildingRef = adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId);
    
    try {
        await adminDb.runTransaction(async (transaction) => {
            const buildingDoc = await transaction.get(buildingRef);
            if (!buildingDoc.exists) throw new Error('Local não encontrado.');
            
            const building = buildingFromDoc(buildingDoc);
            const extinguishers = building.extinguishers || [];
            
            const extIndex = extinguishers.findIndex(e => e.uid === uid);
            if (extIndex === -1) throw new Error('Extintor não encontrado.');
            
            if (updatedData.id && updatedData.id !== extinguishers[extIndex].id) {
                 const idExists = extinguishers.some(e => e.id === updatedData.id && e.uid !== uid);
                 if (idExists) {
                     throw new Error('O ID já está em uso, altere!');
                 }
            }

            extinguishers[extIndex] = { ...extinguishers[extIndex], ...updatedData };
            transaction.update(buildingRef, { extinguishers: extinguishers });
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
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
            if (idExists) {
                throw new Error('O ID já está em uso, altere!');
            }
            
            const uid = `fireguard-hose-${Date.now()}`;
            const newHose: Hydrant = {
                ...newHoseData,
                uid: uid,
                qrCodeValue: uid,
                inspections: [],
            };
            
            const newHoses = [...(building.hoses || []), newHose];
            transaction.update(buildingRef, { hoses: newHoses });
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function updateHoseData(buildingId: string, uid: string, updatedData: Partial<HydrantFormValues>): Promise<ActionResponse> {
    const buildingRef = adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId);
    
    try {
        await adminDb.runTransaction(async (transaction) => {
            const buildingDoc = await transaction.get(buildingRef);
            if (!buildingDoc.exists) throw new Error('Local não encontrado.');
            
            const building = buildingFromDoc(buildingDoc);
            const hoses = building.hoses || [];

            const hoseIndex = hoses.findIndex(h => h.uid === uid);
            if (hoseIndex === -1) throw new Error('Hidrante não encontrado.');

            if (updatedData.id && updatedData.id !== hoses[hoseIndex].id) {
                 const idExists = hoses.some(h => h.id === updatedData.id && h.uid !== uid);
                 if (idExists) {
                    throw new Error('O ID já está em uso, altere!');
                 }
            }

            hoses[hoseIndex] = { ...hoses[hoseIndex], ...updatedData };
            transaction.update(buildingRef, { hoses: hoses });
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
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
        if (!buildingDoc.exists) {
            throw new Error('Local não encontrado');
        }

        const building = buildingFromDoc(buildingDoc);
        
        const updates: any = {
            lastInspected: new Date().toISOString()
        };

        const extinguishers = [...(building.extinguishers || [])];
        const hoses = [...(building.hoses || [])];
        const manualInspections = [...(building.manualInspections || [])];

        let extinguishersChanged = false;
        let hosesChanged = false;
        let manualInspectionsChanged = false;
        
        session.inspectedItems.forEach(item => {
            const newInspection: Inspection = {
                id: `insp-${Date.now()}-${Math.random()}`,
                date: item.date,
                notes: item.notes,
                status: item.status,
                itemStatuses: item.itemStatuses,
            };

            if (item.qrCodeValue.startsWith('fireguard-ext-')) {
                const extIndex = extinguishers.findIndex(e => e.uid === item.uid);
                if (extIndex !== -1) {
                    extinguishersChanged = true;
                    if (item.updatedData) {
                         const validatedData = ExtinguisherFormSchema.partial().parse(item.updatedData);
                         extinguishers[extIndex] = { ...extinguishers[extIndex], ...validatedData };
                    }
                    extinguishers[extIndex].inspections.push(newInspection);
                    extinguishers[extIndex].lastInspected = item.date;
                }
            } else if (item.qrCodeValue.startsWith('fireguard-hose-')) {
                 const hoseIndex = hoses.findIndex(h => h.uid === item.uid);
                 if (hoseIndex !== -1) {
                    hosesChanged = true;
                    if (item.updatedData) {
                        const existingHose = hoses[hoseIndex];
                        const mergedData = { ...existingHose, ...item.updatedData };
                        const validatedData = HydrantFormSchema.parse(mergedData);
                        hoses[hoseIndex] = { ...existingHose, ...validatedData };
                    }
                    hoses[hoseIndex].inspections.push(newInspection);
                    hoses[hoseIndex].lastInspected = item.date;
                 }
            } else if (item.qrCodeValue.startsWith('manual:')) {
                manualInspectionsChanged = true;
                const manualId = item.qrCodeValue.replace('manual:', '');
                manualInspections.push({ ...newInspection, manualId: manualId });
            }
        });

        if (extinguishersChanged) updates.extinguishers = extinguishers;
        if (hosesChanged) updates.hoses = hoses;
        if (manualInspectionsChanged) updates.manualInspections = manualInspections;
        
        transaction.update(buildingRef, updates);
    });
}

// --- Reorder Action ---
export async function updateEquipmentOrder(buildingId: string, equipmentType: 'extinguishers' | 'hoses', orderedItems: (Extinguisher | Hydrant)[]) {
    const buildingRef = adminDb.collection(BUILDINGS_COLLECTION).doc(buildingId);
    
    if (equipmentType === 'extinguishers') {
        await buildingRef.update({ extinguishers: orderedItems });
    } else if (equipmentType === 'hoses') {
        await buildingRef.update({ hoses: orderedItems });
    }
}
