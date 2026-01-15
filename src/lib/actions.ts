

'use server';

import type { Extinguisher, Hydrant, Client, Building } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { ExtinguisherFormValues, HydrantFormValues, ClientFormValues, ExtinguisherFormSchema, HydrantFormSchema, ExtinguisherUpdateSchema } from './schemas';
import type { InspectedItem, InspectionSession } from '@/hooks/use-inspection-session.tsx';
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
    finalizeInspection as finalizeInspectionData,
    updateEquipmentOrder,
    getExtinguisherByUid,
    getHoseByUid,
} from './data';
import { getClientById, getBuildingById, getExtinguishersByBuilding, getHosesByBuilding, getBuildingsByClient, getEquipmentForBuildings } from './data';


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
    } else if (name !== null) { 
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
    const buildingId = rawData.buildingId as string;
    const clientId = rawData.clientId as string;
    if (!buildingId || !clientId) {
        throw new Error('ID do cliente ou do local ausente.');
    }

    const validatedData = ExtinguisherFormSchema.parse(rawData);
    
    const result = await addExtinguisherData(clientId, buildingId, validatedData);
    if (!result.success) {
        throw new Error(result.message);
    }
    
    revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
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
export async function finalizeInspectionAction(session: InspectionSession) {
    await finalizeInspectionData(session);

    const { clientId, buildingId } = session;
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
    revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers`);
    revalidatePath(`/clients/${clientId}/${buildingId}/hoses`);
    revalidatePath(`/clients/${clientId}`);
}

// --- Report Actions ---
export async function getReportDataAction(clientId: string, buildingId: string) {
    const [client, building] = await Promise.all([
        getClientById(clientId),
        getBuildingById(clientId, buildingId),
    ]);
    if (!building) {
         return { client: null, building: null, extinguishers: [], hoses: [] };
    }

    const extinguishers = building?.extinguishers || [];
    const hoses = building?.hoses || [];

    return { client, building, extinguishers, hoses };
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

    return { client, buildings };
}

export async function getHosesReportDataAction(clientId: string) {
    const client = await getClientById(clientId);
    if (!client) return { client: null, buildingsWithHoses: [] };

    const buildingsWithHoses = await getBuildingsByClient(clientId);

    return { client, buildingsWithHoses };
}

export async function getExtinguishersReportDataAction(clientId: string) {
    const client = await getClientById(clientId);
    if (!client) return { client: null, buildingsWithExtinguishers: [] };

    const buildingsWithExtinguishers = await getBuildingsByClient(clientId);
    
    return { client, buildingsWithExtinguishers };
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
    
    return { client, buildings };
}

export async function getNonConformityReportDataAction(clientId: string, buildingId?: string) {
    const client = await getClientById(clientId);
    let buildingsData: Building[] = [];

    if (buildingId) {
        const building = await getBuildingById(clientId, buildingId);
        if(building) buildingsData.push(building);
    } else {
        buildingsData = await getBuildingsByClient(clientId);
    }

    const buildingsWithNC = buildingsData.map(b => {
        const ncExtinguishers = (b.extinguishers || []).filter(e => {
            if (!e.inspections || e.inspections.length === 0) return false;
            const lastInspection = e.inspections[e.inspections.length - 1];
            return lastInspection.status === 'N/C';
        });

        const ncHoses = (b.hoses || []).filter(h => {
             if (!h.inspections || h.inspections.length === 0) return false;
            const lastInspection = h.inspections[h.inspections.length - 1];
            return lastInspection.status === 'N/C';
        });
        
        return { ...b, extinguishers: ncExtinguishers, hoses: ncHoses };
    }).filter(b => b.extinguishers.length > 0 || b.hoses.length > 0);

    return { client, buildings: buildingsWithNC };
}


// --- Reorder Action ---
export async function updateEquipmentOrderAction(clientId: string, buildingId: string, equipmentType: 'extinguishers' | 'hoses', orderedItems: (Extinguisher | Hydrant)[]) {
    await updateEquipmentOrder(clientId, buildingId, equipmentType, orderedItems);
    revalidatePath(`/clients/${clientId}/${buildingId}/${equipmentType}`);
}

    