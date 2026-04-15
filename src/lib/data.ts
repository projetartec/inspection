

'use server';

import type { Extinguisher, Hydrant, Client, Building, Inspection, ExtinguisherType, ExtinguisherWeight, HydrantFormValues, HydrantHoseType, HydrantDiameter, HydrantHoseLength, HydrantKeyQuantity, HydrantNozzleQuantity, HydrantQuantity } from '@/lib/types';
import { adminDb } from './firebase-admin'; 
import { ClientFormValues } from './schemas';
import type { InspectedItem, InspectionSession } from '@/hooks/use-inspection-session.tsx';

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
    buildingOrder: data.buildingOrder || (data.buildings || []).map((b: any) => b.id),
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
        buildings: [],
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
    await clientRef.delete();
}


// --- Building Functions ---
export async function getBuildingById(clientId: string, buildingId: string): Promise<Building | null> {
    const client = await getClientById(clientId);
    const building = client?.buildings?.find(b => b.id === buildingId);
    return building ? { ...building, clientId } : null;
}

export async function getBuildingsByClient(clientId: string): Promise<Building[]> {
  const client = await getClientById(clientId);
  if (!client) {
    return [];
  }
  
  const buildingsMap = new Map((client.buildings || []).map(b => [b.id, b]));
  const orderedIds = client.buildingOrder || [];
  
  const orderedBuildings = orderedIds
    .map(id => buildingsMap.get(id))
    .filter((b): b is Building => !!b);
    
  const unorderedBuildings = (client.buildings || []).filter(b => !orderedIds.includes(b.id));

  return [...orderedBuildings, ...unorderedBuildings];
}


export async function addBuilding(clientId: string, newBuildingData: { name: string }): Promise<void> {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    
    await adminDb.runTransaction(async (transaction) => {
        const clientDoc = await transaction.get(clientRef);
        if (!clientDoc.exists) throw new Error('Cliente não encontrado.');
        
        const client = clientFromDoc(clientDoc);
        
        const nameExists = (client.buildings || []).some(b => b.name === newBuildingData.name);
        if (nameExists) {
            throw new Error('Um local com este nome já existe para este cliente.');
        }

        const newBuildingId = `bld-${Date.now()}`;
        const newBuilding: Building = {
            id: newBuildingId,
            clientId: clientId,
            name: newBuildingData.name,
            extinguishers: [],
            hoses: [],
            manualInspections: [],
        };
        
        const updatedBuildings = [...(client.buildings || []), newBuilding];
        const updatedBuildingOrder = [...(client.buildingOrder || []), newBuildingId];
        
        transaction.update(clientRef, { 
            buildings: updatedBuildings,
            buildingOrder: updatedBuildingOrder
        });
    });
}

export async function updateBuilding(clientId: string, buildingId: string, updatedData: Partial<Building>) {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    await adminDb.runTransaction(async (transaction) => {
        const doc = await transaction.get(clientRef);
        if (!doc.exists) throw new Error("Cliente não encontrado.");

        const client = clientFromDoc(doc);
        const buildings = client.buildings || [];
        const buildingIndex = buildings.findIndex(b => b.id === buildingId);

        if (buildingIndex === -1) throw new Error("Local não encontrado.");

        buildings[buildingIndex] = { ...buildings[buildingIndex], ...updatedData };
        transaction.update(clientRef, { buildings });
    });
}

export async function deleteBuilding(clientId: string, buildingId: string) {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
     await adminDb.runTransaction(async (transaction) => {
        const doc = await transaction.get(clientRef);
        if (!doc.exists) throw new Error("Cliente não encontrado.");
        const client = clientFromDoc(doc);
        
        const updatedBuildings = (client.buildings || []).filter(b => b.id !== buildingId);
        const updatedOrder = (client.buildingOrder || []).filter(id => id !== buildingId);
        
        transaction.update(clientRef, { buildings: updatedBuildings, buildingOrder: updatedOrder });
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
    const building = await getBuildingById(clientId, buildingId);
    return building?.hoses || [];
}

export async function getEquipmentForBuildings(clientId: string, buildingIds: string[]): Promise<{extinguishers: (Extinguisher & {buildingId: string, buildingName: string})[], hoses: (Hydrant & {buildingId: string, buildingName: string})[]}> {
  if (buildingIds.length === 0) {
      return { extinguishers: [], hoses: [] };
  }
  
  const result: {
      extinguishers: (Extinguisher & {buildingId: string, buildingName: string})[],
      hoses: (Hydrant & {buildingId: string, buildingName: string})[]
  } = { extinguishers: [], hoses: [] };

  for (const buildingId of buildingIds) {
      const building = await getBuildingById(clientId, buildingId);
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

async function performUpdate<T>(
    clientId: string,
    buildingId: string,
    uid: string,
    updatedData: Partial<T>,
    equipmentType: 'extinguishers' | 'hoses'
): Promise<ActionResponse> {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    try {
        await adminDb.runTransaction(async (transaction) => {
            const clientDoc = await transaction.get(clientRef);
            if (!clientDoc.exists) {
                throw new Error('Cliente não encontrado.');
            }

            const client = clientFromDoc(clientDoc);
            const buildings = [...(client.buildings || [])];
            const buildingIndex = buildings.findIndex(b => b.id === buildingId);

            if (buildingIndex === -1) {
                throw new Error('Local não encontrado.');
            }
            
            const building = buildings[buildingIndex];
            const equipmentList = [...(building[equipmentType] || [])];
            const itemIndex = equipmentList.findIndex(e => e.uid === uid);

            if (itemIndex === -1) {
                throw new Error('Equipamento não encontrado.');
            }
            
            const editableData = updatedData as { id?: string };
            if (editableData.id && editableData.id !== equipmentList[itemIndex].id) {
                const idExists = equipmentList.some(e => e.id === editableData.id && e.uid !== uid);
                if (idExists) {
                    throw new Error('O ID já está em uso, altere!');
                }
            }

            equipmentList[itemIndex] = { ...equipmentList[itemIndex], ...updatedData };
            building[equipmentType] = equipmentList;
            
            transaction.update(clientRef, { buildings: buildings });
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
            const buildings = [...(client.buildings || [])];
            const buildingIndex = buildings.findIndex(b => b.id === buildingId);

            if(buildingIndex === -1) throw new Error('Local não encontrado.');

            const idExists = (buildings[buildingIndex].extinguishers || []).some(e => e.id === newExtinguisherData.id);
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
            
            const newExtinguishers = [...(buildings[buildingIndex].extinguishers || []), newExtinguisher];
            buildings[buildingIndex].extinguishers = newExtinguishers;

            transaction.update(clientRef, { buildings: buildings });
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
        const buildings = [...(client.buildings || [])];
        const buildingIndex = buildings.findIndex(b => b.id === buildingId);
        
        if (buildingIndex === -1) return;

        const newExtinguishers = (buildings[buildingIndex].extinguishers || []).filter(e => e.uid !== uid);
        buildings[buildingIndex].extinguishers = newExtinguishers;
        transaction.update(clientRef, { buildings: buildings });
    });
}

export async function addHose(clientId: string, buildingId: string, newHoseData: HydrantFormValues): Promise<ActionResponse> {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    try {
        await adminDb.runTransaction(async (transaction) => {
            const clientDoc = await transaction.get(clientRef);
            if (!clientDoc.exists) throw new Error('Cliente não encontrado.');
            
            const client = clientFromDoc(clientDoc);
            const buildings = [...(client.buildings || [])];
            const buildingIndex = buildings.findIndex(b => b.id === buildingId);

            if(buildingIndex === -1) throw new Error('Local não encontrado.');
            
            const idExists = (buildings[buildingIndex].hoses || []).some(h => h.id === newHoseData.id);
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
            
            const newHoses = [...(buildings[buildingIndex].hoses || []), newHose];
            buildings[buildingIndex].hoses = newHoses;

            transaction.update(clientRef, { buildings: buildings });
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
        const buildings = [...(client.buildings || [])];
        const buildingIndex = buildings.findIndex(b => b.id === buildingId);

        if (buildingIndex === -1) return;

        const newHoses = (buildings[buildingIndex].hoses || []).filter(h => h.uid !== uid);
        buildings[buildingIndex].hoses = newHoses;

        transaction.update(clientRef, { buildings: buildings });
    });
}


// --- Inspection Action ---
export async function finalizeInspection(session: InspectionSession) {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(session.clientId);
    
    await adminDb.runTransaction(async (transaction) => {
        const clientDoc = await transaction.get(clientRef);
        if (!clientDoc.exists) {
            throw new Error('Cliente não encontrado');
        }

        const client = clientFromDoc(clientDoc);
        const buildings = [...(client.buildings || [])];
        const buildingIndex = buildings.findIndex(b => b.id === session.buildingId);

        if (buildingIndex === -1) {
            throw new Error('Local não encontrado');
        }

        const building = buildings[buildingIndex];
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
                    if (item.updatedData) {
                        const dataToUpdate: Partial<Extinguisher> = {};
                        if ('type' in item.updatedData) {
                            dataToUpdate.type = item.updatedData.type as ExtinguisherType;
                        }
                        if ('weight' in item.updatedData) {
                            const weight = Number(item.updatedData.weight);
                            if (!isNaN(weight)) {
                                dataToUpdate.weight = weight as ExtinguisherWeight;
                            }
                        }
                        if ('expiryDate' in item.updatedData) {
                            dataToUpdate.expiryDate = item.updatedData.expiryDate;
                        }
                        building.extinguishers[extIndex] = { ...building.extinguishers[extIndex], ...dataToUpdate };
                    }
                    if (!building.extinguishers[extIndex].inspections) {
                        building.extinguishers[extIndex].inspections = [];
                    }
                    building.extinguishers[extIndex].inspections.push(newInspection);
                    building.extinguishers[extIndex].lastInspected = item.date;
                }
            } else if (item.qrCodeValue.startsWith('fireguard-hose-')) {
                 const hoseIndex = (building.hoses || []).findIndex(h => h.uid === item.uid);
                 if (hoseIndex !== -1) {
                    if (item.updatedData) {
                       const dataToUpdate: Partial<Hydrant> = {};
                        if ('location' in item.updatedData && typeof item.updatedData.location === 'string') {
                           dataToUpdate.location = item.updatedData.location;
                        }
                        if ('quantity' in item.updatedData) {
                            const quantity = Number(item.updatedData.quantity);
                            if (!isNaN(quantity) && quantity >= 1) {
                                dataToUpdate.quantity = quantity as HydrantQuantity;
                            }
                        }
                        if ('hoseType' in item.updatedData && typeof item.updatedData.hoseType === 'string') {
                           dataToUpdate.hoseType = item.updatedData.hoseType as HydrantHoseType;
                        }
                        if ('diameter' in item.updatedData && typeof item.updatedData.diameter === 'string') {
                            dataToUpdate.diameter = item.updatedData.diameter as HydrantDiameter;
                        }
                        if ('hoseLength' in item.updatedData) {
                           const hoseLength = Number(item.updatedData.hoseLength);
                           if (!isNaN(hoseLength) && hoseLength >= 10) {
                                dataToUpdate.hoseLength = hoseLength as HydrantHoseLength;
                           }
                        }
                        if ('keyQuantity' in item.updatedData) {
                            const keyQuantity = Number(item.updatedData.keyQuantity);
                            if (!isNaN(keyQuantity) && keyQuantity >= 0) {
                                dataToUpdate.keyQuantity = keyQuantity as HydrantKeyQuantity;
                            }
                        }
                        if ('nozzleQuantity' in item.updatedData) {
                            const nozzleQuantity = Number(item.updatedData.nozzleQuantity);
                            if (!isNaN(nozzleQuantity) && nozzleQuantity >= 0) {
                                dataToUpdate.nozzleQuantity = nozzleQuantity as HydrantNozzleQuantity;
                            }
                        }
                        if ('hydrostaticTestDate' in item.updatedData) {
                           dataToUpdate.hydrostaticTestDate = item.updatedData.hydrostaticTestDate;
                        }
                        
                        building.hoses[hoseIndex] = { ...building.hoses[hoseIndex], ...dataToUpdate };
                    }
                    if (!building.hoses[hoseIndex].inspections) {
                        building.hoses[hoseIndex].inspections = [];
                    }
                    building.hoses[hoseIndex].inspections.push(newInspection);
                    building.hoses[hoseIndex].lastInspected = item.date;
                 }
            } else if (item.qrCodeValue.startsWith('manual:')) {
                 if (!building.manualInspections) building.manualInspections = [];
                 const manualId = item.id;
                 building.manualInspections.push({ ...newInspection, manualId: manualId });
            }
        }

        transaction.update(clientRef, { buildings: buildings });
    });
}


// --- Reorder Action ---
export async function updateEquipmentOrder(clientId: string, buildingId: string, equipmentType: 'extinguishers' | 'hoses', orderedItems: (Extinguisher | Hydrant)[]) {
    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    
    await adminDb.runTransaction(async (transaction) => {
        const clientDoc = await transaction.get(clientRef);
        if (!clientDoc.exists) throw new Error('Cliente não encontrado.');

        const client = clientFromDoc(clientDoc);
        const buildings = [...(client.buildings || [])];
        const buildingIndex = buildings.findIndex(b => b.id === buildingId);

        if (buildingIndex === -1) throw new Error('Local não encontrado.');
        
        buildings[buildingIndex][equipmentType] = orderedItems as any;
        
        transaction.update(clientRef, { buildings: buildings });
    });
}



