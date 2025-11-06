







'use server';

import type { Extinguisher, Hydrant, Client, Building, Inspection } from '@/lib/types';
import { adminDb } from './firebase-admin'; 
import { ExtinguisherFormValues, HydrantFormValues, ClientFormValues } from './schemas';
import type { InspectedItem } from '@/hooks/use-inspection-session.tsx';

const CLIENTS_COLLECTION = 'clients';

function docToClient(doc: FirebaseFirestore.DocumentSnapshot): Client {
  const data = doc.data();
  return {
    id: doc.id,
    name: data?.name || '',
    fantasyName: data?.fantasyName,
    address: data?.address,
    city: data?.city,
    zipCode: data?.zipCode,
    phone1: data?.phone1,
    phone2: data?.phone2,
    cnpj: data?.cnpj,
    email: data?.email,
    adminContact: data?.adminContact,
    caretakerContact: data?.caretakerContact,
    buildings: data?.buildings || [],
  };
}

// --- Client Functions ---
export async function getClients(): Promise<Client[]> {
  try {
    const querySnapshot = await adminDb.collection(CLIENTS_COLLECTION).orderBy("name").get();
    
    if (querySnapshot.empty) {
        console.log("No clients found in Firestore.");
        return [];
    }
    
    return querySnapshot.docs.map(docToClient);
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
      return docToClient(docSnap);
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
    
    const id = `client-${Date.now()}`;
    const newClient: Omit<Client, 'id' | 'buildings'> & { buildings: Building[] } = {
        ...newClientData,
        buildings: []
    };
    await adminDb.collection(CLIENTS_COLLECTION).doc(id).set(newClient);
    return id;
}

export async function updateClient(id: string, updatedData: Partial<ClientFormValues>) {
  const docRef = adminDb.collection(CLIENTS_COLLECTION).doc(id);
  await docRef.set(updatedData, { merge: true });
}

export async function deleteClient(id: string) {
  const docRef = adminDb.collection(CLIENTS_COLLECTION).doc(id);
  await docRef.delete();
}


// --- Building Functions ---
export async function getBuildingById(clientId: string, buildingId: string): Promise<Building | null> {
    const client = await getClientById(clientId);
    return client?.buildings.find(b => b.id === buildingId) || null;
}

export async function getBuildingsByClient(clientId: string): Promise<Building[]> {
  const client = await getClientById(clientId);
  return client?.buildings || [];
}

export async function addBuilding(clientId: string, newBuildingData: { name: string }): Promise<void> {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    await adminDb.runTransaction(async (transaction) => {
        const clientDoc = await transaction.get(clientRef);
        if (!clientDoc.exists) throw new Error('Cliente não encontrado.');
        
        const client = docToClient(clientDoc);
        const nameExists = client.buildings.some(b => b.name.toLowerCase() === newBuildingData.name.toLowerCase());
        if (nameExists) {
            throw new Error('Um local com este nome já existe para este cliente.');
        }

        const newBuilding: Building = {
            id: `bldg-${Date.now()}`,
            name: newBuildingData.name,
            extinguishers: [],
            hoses: []
        };
        client.buildings.push(newBuilding);
        transaction.update(clientRef, { buildings: client.buildings });
    });
}

export async function updateBuilding(clientId: string, buildingId: string, updatedData: Partial<Building>) {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
     await adminDb.runTransaction(async (transaction) => {
        const clientDoc = await transaction.get(clientRef);
        if (!clientDoc.exists) throw new Error('Cliente não encontrado.');

        const client = docToClient(clientDoc);
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
        
        const client = docToClient(clientDoc);
        client.buildings = client.buildings.filter(b => b.id !== buildingId);
        transaction.update(clientRef, { buildings: client.buildings });
    });
}

export async function updateBuildingOrder(clientId: string, orderedBuildings: Building[]) {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    await clientRef.update({ buildings: orderedBuildings });
}


// --- Equipment Functions ---
export async function getExtinguishersByBuilding(clientId: string, buildingId: string): Promise<Extinguisher[]> {
    const building = await getBuildingById(clientId, buildingId);
    return building?.extinguishers || [];
}

export async function getHosesByBuilding(clientId: string, buildingId: string): Promise<Hydrant[]> {
    const building = await getBuildingById(clientId, buildingId);
    return building?.hoses || [];
}

export async function getExtinguisherById(clientId: string, buildingId: string, id: string): Promise<Extinguisher | null> {
    const building = await getBuildingById(clientId, buildingId);
    return building?.extinguishers.find(e => e.id === id) || null;
}

export async function getHoseById(clientId: string, buildingId: string, id: string): Promise<Hydrant | null> {
    const building = await getBuildingById(clientId, buildingId);
    return building?.hoses.find(h => h.id === id) || null;
}

export async function addExtinguisher(clientId: string, buildingId: string, newExtinguisherData: ExtinguisherFormValues) {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    await adminDb.runTransaction(async (transaction) => {
        const clientDoc = await transaction.get(clientRef);
        if (!clientDoc.exists) throw new Error('Cliente não encontrado.');
        
        const client = docToClient(clientDoc);
        const building = client.buildings.find(b => b.id === buildingId);
        if (!building) throw new Error('Local não encontrado.');

        const idExists = building.extinguishers.some(e => e.id === newExtinguisherData.id);
        if (idExists) throw new Error('Já existe um extintor com este ID neste local.');

        const newExtinguisher: Extinguisher = {
            ...newExtinguisherData,
            qrCodeValue: `fireguard-ext-${newExtinguisherData.id}`,
            inspections: [],
        };
        
        building.extinguishers.push(newExtinguisher);
        transaction.update(clientRef, { buildings: client.buildings });
    });
}

export async function updateExtinguisher(clientId: string, buildingId: string, id: string, updatedData: Partial<ExtinguisherFormValues>) {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    await adminDb.runTransaction(async (transaction) => {
        const clientDoc = await transaction.get(clientRef);
        if (!clientDoc.exists) throw new Error('Cliente não encontrado.');
        
        const client = docToClient(clientDoc);
        const building = client.buildings.find(b => b.id === buildingId);
        if (!building) throw new Error('Local não encontrado.');
        
        const extIndex = building.extinguishers.findIndex(e => e.id === id);
        if (extIndex === -1) throw new Error('Extintor não encontrado.');

        building.extinguishers[extIndex] = { ...building.extinguishers[extIndex], ...updatedData };
        transaction.update(clientRef, { buildings: client.buildings });
    });
}

export async function deleteExtinguisher(clientId: string, buildingId: string, id: string) {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    await adminDb.runTransaction(async (transaction) => {
        const clientDoc = await transaction.get(clientRef);
        if (!clientDoc.exists) throw new Error('Cliente não encontrado.');
        
        const client = docToClient(clientDoc);
        const building = client.buildings.find(b => b.id === buildingId);
        if (!building) throw new Error('Local não encontrado.');

        building.extinguishers = building.extinguishers.filter(e => e.id !== id);
        transaction.update(clientRef, { buildings: client.buildings });
    });
}

export async function addHose(clientId: string, buildingId: string, newHoseData: HydrantFormValues) {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    await adminDb.runTransaction(async (transaction) => {
        const clientDoc = await transaction.get(clientRef);
        if (!clientDoc.exists) throw new Error('Cliente não encontrado.');
        
        const client = docToClient(clientDoc);
        const building = client.buildings.find(b => b.id === buildingId);
        if (!building) throw new Error('Local não encontrado.');

        const idExists = building.hoses.some(h => h.id === newHoseData.id);
        if (idExists) throw new Error('Já existe um hidrante com este ID neste local.');
        
        const newHose: Hydrant = {
            ...newHoseData,
            qrCodeValue: `fireguard-hose-${newHoseData.id}`,
            inspections: [],
        };
        
        building.hoses.push(newHose);
        transaction.update(clientRef, { buildings: client.buildings });
    });
}

export async function updateHose(clientId: string, buildingId: string, id: string, updatedData: Partial<HydrantFormValues>) {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    await adminDb.runTransaction(async (transaction) => {
        const clientDoc = await transaction.get(clientRef);
        if (!clientDoc.exists) throw new Error('Cliente não encontrado.');
        
        const client = docToClient(clientDoc);
        const building = client.buildings.find(b => b.id === buildingId);
        if (!building) throw new Error('Local não encontrado.');
        
        const hoseIndex = building.hoses.findIndex(h => h.id === id);
        if (hoseIndex === -1) throw new Error('Hidrante não encontrado.');

        building.hoses[hoseIndex] = { ...building.hoses[hoseIndex], ...updatedData };
        transaction.update(clientRef, { buildings: client.buildings });
    });
}

export async function deleteHose(clientId: string, buildingId: string, id: string) {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    await adminDb.runTransaction(async (transaction) => {
        const clientDoc = await transaction.get(clientRef);
        if (!clientDoc.exists) throw new Error('Cliente não encontrado.');
        
        const client = docToClient(clientDoc);
        const building = client.buildings.find(b => b.id === buildingId);
        if (!building) throw new Error('Local não encontrado.');

        building.hoses = building.hoses.filter(h => h.id !== id);
        transaction.update(clientRef, { buildings: client.buildings });
    });
}


// --- Inspection Action ---
export async function addInspectionBatch(clientId: string, buildingId: string, inspectedItems: InspectedItem[]) {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);

    await adminDb.runTransaction(async (transaction) => {
        const clientDoc = await transaction.get(clientRef);
        if (!clientDoc.exists) {
            throw new Error('Cliente não encontrado');
        }

        const client = docToClient(clientDoc);
        const buildingIndex = client.buildings.findIndex(b => b.id === buildingId);
        if (buildingIndex === -1) {
            throw new Error('Local não encontrado');
        }
        
        const building = client.buildings[buildingIndex];
        
        building.lastInspected = new Date().toISOString();

        inspectedItems.forEach(item => {
            const newInspection: Inspection = {
                id: `insp-${Date.now()}-${Math.random()}`,
                date: item.date,
                notes: item.notes,
                status: item.status,
                itemStatuses: item.itemStatuses,
            };

            let targetEquipment: Extinguisher | Hydrant | undefined;

            if (item.qrCodeValue.startsWith('fireguard-ext-')) {
                targetEquipment = building.extinguishers.find(e => e.qrCodeValue === item.qrCodeValue);
                 if (targetEquipment) {
                    targetEquipment.lastInspected = item.date;
                }
            } else if (item.qrCodeValue.startsWith('fireguard-hose-')) {
                targetEquipment = building.hoses.find(h => h.qrCodeValue === item.qrCodeValue);
                 if (targetEquipment) {
                    targetEquipment.lastInspected = item.date;
                }
            } else if (item.qrCodeValue.startsWith('manual:')) {
                if (!building.manualInspections) {
                    building.manualInspections = [];
                }
                const manualId = item.qrCodeValue.replace('manual:', '');
                building.manualInspections.push({ ...newInspection, manualId: manualId });
                return; // continue to next item
            }
            
            if (targetEquipment) {
                if (!targetEquipment.inspections) {
                    targetEquipment.inspections = [];
                }
                targetEquipment.inspections.push(newInspection);
            }
        });

        // Update the building in the client's buildings array
        client.buildings[buildingIndex] = building;
        
        // Write the entire updated client object back
        transaction.update(clientRef, { buildings: client.buildings });
    });
}



// --- Report Action ---
export async function getReportDataAction(clientId: string, buildingId: string) {
    const [client, building, extinguishers, hoses] = await Promise.all([
        getClientById(clientId),
        getBuildingById(clientId, buildingId),
        getExtinguishersByBuilding(clientId, buildingId),
        getHosesByBuilding(clientId, buildingId)
    ]);

    return { client, building, extinguishers, hoses };
}

// --- Reorder Action ---
export async function updateEquipmentOrder(clientId: string, buildingId: string, equipmentType: 'extinguishers' | 'hoses', orderedItems: (Extinguisher | Hydrant)[]) {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    await adminDb.runTransaction(async (transaction) => {
        const clientDoc = await transaction.get(clientRef);
        if (!clientDoc.exists) throw new Error('Cliente não encontrado.');
        
        const client = docToClient(clientDoc);
        const building = client.buildings.find(b => b.id === buildingId);
        if (!building) throw new Error('Local não encontrado.');

        if (equipmentType === 'extinguishers') {
            building.extinguishers = orderedItems as Extinguisher[];
        } else if (equipmentType === 'hoses') {
            building.hoses = orderedItems as Hydrant[];
        }

        transaction.update(clientRef, { buildings: client.buildings });
    });
}
