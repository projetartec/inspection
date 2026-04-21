'use server';

import type { Extinguisher, Hydrant, Client, Building, ManualInspection, Inspection } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { ExtinguisherFormValues, HydrantFormValues, ClientFormValues, ExtinguisherFormSchema, HydrantFormSchema } from './schemas';
import type { InspectedItem } from '@/hooks/use-inspection-session.tsx';
import {
    addClient as addClientData,
    updateClient as updateClientData,
    deleteClient as deleteClientData,
    addBuilding as addBuildingData,
    updateBuilding as updateBuildingData,
    deleteBuilding as deleteBuildingData,
    updateBuildingOrder as updateBuildingOrderData,
    addExtinguisher as addExtinguisherData,
    updateExtinguisherData,
    deleteExtinguisher as deleteExtinguisherData,
    addHose as addHoseData,
    updateHoseData,
    deleteHose as deleteHoseData,
    saveInspectedItem,
    updateEquipmentOrder,
    getBackupData,
    restoreBackup,
    getLatestInspectionForEquipment,
} from './data';
import { getClientById, getBuildingsByClient, getEquipmentForBuildings } from './data';


// --- Client Actions ---
export async function createClientAction(formData: FormData) {
  const data = Object.fromEntries(formData);
  await addClientData(data as ClientFormValues);
  
  revalidatePath('/');
}

export async function updateClientAction(id: string, formData: FormData) {
  const data = Object.fromEntries(formData);
  await updateClientData(id, data as Partial<ClientFormValues>);

  revalidatePath('/');
  revalidatePath(`/clients/${id}/edit`);
}

export async function deleteClientAction(id: string) {
    await deleteClientData(id);
    revalidatePath('/');
}


// --- Building Actions ---
export async function createBuildingAction(clientId: string, formData: FormData) {
    const name = formData.get('name') as string;
    if (!name || name.trim().length < 2) {
        throw new Error('O nome do local deve ter pelo menos 2 caracteres.');
    }

    await addBuildingData(clientId, { name });
    revalidatePath(`/clients/${clientId}`);
}

export async function updateBuildingAction(clientId: string, buildingId: string, formData: FormData) {
    const name = formData.get('name') as string;
    const gpsLink = formData.get('gpsLink') as string | null;

    const updatedData: Partial<Building> = {};

    if (name && name.trim().length >= 2) {
        updatedData.name = name;
    } else if (name !== null && name.trim().length > 0) { 
        throw new Error('O nome do local deve ter pelo menos 2 caracteres.');
    }

    if (gpsLink !== null) { 
        updatedData.gpsLink = gpsLink;
    }
    
    if (Object.keys(updatedData).length === 0) {
        return;
    }

    await updateBuildingData(clientId, buildingId, updatedData);

    revalidatePath(`/clients/${clientId}`);
    revalidatePath(`/clients/${clientId}/${buildingId}/edit`);
}

export async function deleteBuildingAction(clientId: string, buildingId: string) {
    await deleteBuildingData(clientId, buildingId);
    revalidatePath(`/clients/${clientId}`);
}

export async function updateBuildingOrderAction(clientId: string, orderedBuildingIds: string[]) {
    await updateBuildingOrderData(clientId, orderedBuildingIds);
    revalidatePath(`/clients/${clientId}`);
}




// --- Extinguisher Actions ---
export async function createExtinguisherAction(formData: FormData) {
    const rawData = Object.fromEntries(formData);
    const clientId = rawData.clientId as string;
    const buildingId = rawData.buildingId as string;
    if (!buildingId || !clientId) {
        throw new Error('ID do cliente ou do local ausente.');
    }

    const validatedData = ExtinguisherFormSchema.parse(rawData);
    
    const result = await addExtinguisherData(clientId, buildingId, validatedData);
    if (!result.success) {
        throw new Error(result.message);
    }
    
    revalidatePath(`/clients/${rawData.clientId}/${buildingId}/extinguishers`);
    revalidatePath(`/clients/${rawData.clientId}/${buildingId}/dashboard`);
}

export async function updateExtinguisherAction(uid: string, formData: FormData) {
    const rawData = Object.fromEntries(formData);
    const buildingId = rawData.buildingId as string;
    const clientId = rawData.clientId as string;
    if (!buildingId || !clientId) {
        return { error: 'ID do cliente ou do local ausente.' };
    }
    const validatedData = ExtinguisherFormSchema.partial().parse(rawData);
    
    const result = await updateExtinguisherData(clientId, buildingId, uid, validatedData);
    if (!result.success) {
        return { error: result.message };
    }
    
    revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers`);
    revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers/${uid}`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);

    return { success: true };
}

export async function deleteExtinguisherAction(clientId: string, buildingId: string, uid: string) {
    await deleteExtinguisherData(clientId, buildingId, uid);

    revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
}

// --- Hose Actions ---
export async function createHoseAction(formData: FormData) {
    const rawData = Object.fromEntries(formData);
    const buildingId = rawData.buildingId as string;
    const clientId = rawData.clientId as string;
    if (!buildingId || !clientId) {
        throw new Error('ID do cliente ou do local ausente.');
    }
    const validatedData = HydrantFormSchema.parse(rawData);
    
    const result = await addHoseData(clientId, buildingId, validatedData);
     if (!result.success) {
        throw new Error(result.message);
    }

    revalidatePath(`/clients/${clientId}/${buildingId}/hoses`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
}

export async function updateHoseAction(uid: string, formData: FormData) {
    const rawData = Object.fromEntries(formData);
    const buildingId = rawData.buildingId as string;
    const clientId = rawData.clientId as string;

    if (!buildingId || !clientId) {
        return { error: 'ID do cliente ou do local ausente.' };
    }
    const validatedData = HydrantFormSchema.partial().parse(rawData);

    const result = await updateHoseData(clientId, buildingId, uid, validatedData);
    if (!result.success) {
        return { error: result.message };
    }
    
    revalidatePath(`/clients/${clientId}/${buildingId}/hoses`);
    revalidatePath(`/clients/${clientId}/${buildingId}/hoses/${uid}`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);

    return { success: true };
}

export async function deleteHoseAction(clientId: string, buildingId: string, uid: string) {
    await deleteHoseData(clientId, buildingId, uid);

    revalidatePath(`/clients/${clientId}/${buildingId}/hoses`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
}

// --- Inspection Action ---
export async function saveInspectedItemAction(clientId: string, buildingId: string, item: InspectedItem, originalItem?: Extinguisher | Hydrant) {
    try {
        await saveInspectedItem(clientId, buildingId, item, originalItem);
        revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
        revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers`);
        revalidatePath(`/clients/${clientId}/${buildingId}/hoses`);
        revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers/${item.uid}`);
        revalidatePath(`/clients/${clientId}/${buildingId}/hoses/${item.uid}`);
    } catch (error: any) {
        console.error('Server Action Error: saveInspectedItemAction failed.', error);
        throw new Error('Falha ao salvar a inspeção do item. ' + error.message);
    }
}

export async function getLatestInspectionAction(buildingId: string, equipmentType: 'extinguisher' | 'hose', equipmentUid: string): Promise<Inspection | null> {
    try {
        const collectionName = equipmentType === 'extinguisher' ? 'extinguishers' : 'hoses';
        const latestInspection = await getLatestInspectionForEquipment(buildingId, collectionName, equipmentUid);
        return latestInspection;
    } catch (error) {
        console.error('Failed to get latest inspection:', error);
        return null;
    }
}


// --- Report Actions ---
export async function getReportDataAction(clientId: string, buildingId: string) {
    const client = await getClientById(clientId);
    const building = await getBuildingById(clientId, buildingId); // Corrected function name
    if (!client || !building) {
         return { client: null, building: null, extinguishers: [], hoses: [] };
    }

    const extinguishers = await getExtinguishersByBuilding(clientId, buildingId);
    const hoses = await getHosesByBuilding(clientId, buildingId);

    return { client, building: {...building, extinguishers, hoses}, extinguishers, hoses };
}

export async function getClientReportDataAction(clientId: string) {
    const client = await getClientById(clientId);
    if (!client) return { client: null, buildings: [] };

    const buildings = await getBuildingsByClient(clientId);

    return { client, buildings };
}

export async function getExpiryReportDataAction(clientId: string, buildingId: string | undefined, month: number, year: number) {
    const client = await getClientById(clientId);
    let buildings: Building[] = [];

    if (buildingId) {
        const building = await getBuildingById(clientId, buildingId);
        if (building) buildings.push(building);
    } else {
        buildings = await getBuildingsByClient(clientId);
    }
     const buildingsWithEquipment = await Promise.all(buildings.map(async (b) => {
        const extinguishers = await getExtinguishersByBuilding(clientId, b.id);
        const hoses = await getHosesByBuilding(clientId, b.id);
        return { ...b, extinguishers, hoses };
    }));


    return { client, buildings: buildingsWithEquipment };
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
        const building = await getBuildingById(clientId, buildingId);
        if(building) buildings.push(building);
    } else {
        buildings = await getBuildingsByClient(clientId);
    }
     const buildingsWithEquipment = await Promise.all(buildings.map(async (b) => {
        const extinguishers = await getExtinguishersByBuilding(clientId, b.id);
        const hoses = await getHosesByBuilding(clientId, b.id);
        return { ...b, extinguishers, hoses };
    }));
    
    return { client, buildings: buildingsWithEquipment };
}

export async function getNonConformityReportDataAction(clientId: string, buildingId?: string) {
    const client = await getClientById(clientId);
    let buildingsData: Building[] = [];

    if (buildingId) {
        const b = await getBuildingById(clientId, buildingId);
        if(b) buildingsData.push(b);
    } else {
        buildingsData = await getBuildingsByClient(clientId);
    }
    
    const buildingsWithEquipment = await Promise.all(buildingsData.map(async (b) => {
        const extinguishers = await getExtinguishersByBuilding(clientId, b.id);
        const hoses = await getHosesByBuilding(clientId, b.id);
        
        for (const ext of extinguishers) {
            const inspSnapshot = await adminDb.collection(BUILDINGS_COLLECTION).doc(b.id).collection(EXTINGUISHERS_SUBCOLLECTION).doc(ext.uid).collection(INSPECTIONS_SUBCOLLECTION).orderBy('date', 'asc').get();
            ext.inspections = inspSnapshot.docs.map(d => d.data() as Inspection);
        }
        for (const hose of hoses) {
            const inspSnapshot = await adminDb.collection(BUILDINGS_COLLECTION).doc(b.id).collection(HOSES_SUBCOLLECTION).doc(hose.uid).collection(INSPECTIONS_SUBCOLLECTION).orderBy('date', 'asc').get();
            hose.inspections = inspSnapshot.docs.map(d => d.data() as Inspection);
        }

        return { ...b, extinguishers, hoses };
    }));

    const buildingsWithNC = buildingsWithEquipment.map(b => {
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

// --- Reorder Action ---
export async function updateEquipmentOrderAction(clientId: string, buildingId: string, equipmentType: 'extinguishers' | 'hoses', orderedItems: (Extinguisher | Hydrant)[]) {
    await updateEquipmentOrder(clientId, buildingId, equipmentType, orderedItems);
    revalidatePath(`/clients/${clientId}/${buildingId}/${equipmentType}`);
}

// --- Backup Actions ---
export async function getBackupDataAction(clientId?: string, buildingId?: string) {
    const backupData = await getBackupData(clientId, buildingId);
    return JSON.stringify(backupData, null, 2);
}

export async function restoreBackupAction(backupContent: string) {
    try {
        const data = JSON.parse(backupContent);
        await restoreBackup(data);
        revalidatePath('/', 'layout'); // Revalidate everything
    } catch (error: any) {
        console.error("Restore backup failed:", error);
        throw new Error("Falha ao restaurar backup. Verifique o arquivo e tente novamente. " + error.message);
    }
}
