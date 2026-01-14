

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
    updateExtinguisher as updateExtinguisherData,
    deleteExtinguisher as deleteExtinguisherData,
    addHose as addHoseData,
    updateHose as updateHoseData,
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
  // Redirect is now handled on the client-side to avoid the next_redirect "error"
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
    } else if (name !== null) { // if name is on formData but invalid
        throw new Error('O nome do local deve ter pelo menos 2 caracteres.');
    }

    if (gpsLink !== null) { // gpsLink can be an empty string to clear it
        updatedData.gpsLink = gpsLink;
    }
    
    if (Object.keys(updatedData).length === 0) {
        // Nothing to update
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

export async function updateBuildingOrderAction(clientId: string, orderedBuildings: Building[]) {
    await updateBuildingOrderData(clientId, orderedBuildings);
    revalidatePath(`/clients/${clientId}`);
}




// --- Extinguisher Actions ---
export async function createExtinguisherAction(clientId: string, buildingId: string, data: ExtinguisherFormValues) {
    const result = await addExtinguisherData(clientId, buildingId, data);
    if (!result.success) {
        throw new Error(result.message);
    }
    
    revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
}

export async function updateExtinguisherAction(clientId: string, buildingId: string, uid: string, partialData: Partial<ExtinguisherFormValues>) {
    const result = await updateExtinguisherData(clientId, buildingId, uid, partialData);
    if (!result.success) {
        throw new Error(result.message);
    }
    const existingExtinguisher = await getExtinguisherByUid(clientId, buildingId, uid);
    
    revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers`);
    if (existingExtinguisher) {
        revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers/${existingExtinguisher.id}`);
    }
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
}

export async function deleteExtinguisherAction(clientId: string, buildingId: string, uid: string) {
    await deleteExtinguisherData(clientId, buildingId, uid);

    revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
}

// --- Hose Actions ---
export async function createHoseAction(clientId: string, buildingId: string, data: HydrantFormValues) {
    const result = await addHoseData(clientId, buildingId, data);
     if (!result.success) {
        throw new Error(result.message);
    }

    revalidatePath(`/clients/${clientId}/${buildingId}/hoses`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
}

export async function updateHoseAction(clientId: string, buildingId: string, uid: string, partialData: Partial<HydrantFormValues>) {
    const result = await updateHoseData(clientId, buildingId, uid, partialData);
    if (!result.success) {
        throw new Error(result.message);
    }
    
    const existingHose = await getHoseByUid(clientId, buildingId, uid);

    revalidatePath(`/clients/${clientId}/${buildingId}/hoses`);
    if (existingHose) {
        revalidatePath(`/clients/${clientId}/${buildingId}/hoses/${existingHose.id}`);
    }
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
}

export async function deleteHoseAction(clientId: string, buildingId: string, uid: string) {
    await deleteHoseData(clientId, buildingId, uid);

    revalidatePath(`/clients/${clientId}/${buildingId}/hoses`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
}

// --- Inspection Action ---
export async function finalizeInspectionAction(session: InspectionSession) {
    await finalizeInspectionData(session);

    // Revalidate all relevant paths after the transaction is complete
    const { clientId, buildingId, inspectedItems } = session;
    const revalidatedPaths: Set<string> = new Set();

    inspectedItems.forEach(item => {
        if (item.qrCodeValue.startsWith('fireguard-ext-')) {
            revalidatedPaths.add(`/clients/${clientId}/${buildingId}/extinguishers/${item.id}`);
        } else if (item.qrCodeValue.startsWith('fireguard-hose-')) {
            revalidatedPaths.add(`/clients/${clientId}/${buildingId}/hoses/${item.id}`);
        }
    });

    revalidatedPaths.forEach(p => revalidatePath(p));
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
    revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers`);
    revalidatePath(`/clients/${clientId}/${buildingId}/hoses`);
    revalidatePath(`/clients/${clientId}`);
}

// --- Report Actions ---
export async function getReportDataAction(clientId: string, buildingId: string) {
    const [client, building, extinguishers, hoses] = await Promise.all([
        getClientById(clientId),
        getBuildingById(clientId, buildingId),
        getExtinguishersByBuilding(clientId, buildingId),
        getHosesByBuilding(clientId, buildingId)
    ]);

    return { client, building, extinguishers, hoses };
}

export async function getClientReportDataAction(clientId: string) {
    const [client, buildings] = await Promise.all([
        getClientById(clientId),
        getBuildingsByClient(clientId)
    ]);

    // This is heavy, but necessary to get all equipment data for all buildings
    const buildingsWithEquipment = await Promise.all(buildings.map(async (b) => {
        const [extinguishers, hoses] = await Promise.all([
            getExtinguishersByBuilding(clientId, b.id),
            getHosesByBuilding(clientId, b.id)
        ]);
        return { ...b, extinguishers, hoses };
    }));


    return { client, buildings: buildingsWithEquipment };
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
        const [extinguishers, hoses] = await Promise.all([
            getExtinguishersByBuilding(clientId, b.id),
            getHosesByBuilding(clientId, b.id)
        ]);
        return { ...b, extinguishers, hoses };
    }));

    return { client, buildings: buildingsWithEquipment };
}

export async function getHosesReportDataAction(clientId: string) {
    const [client, buildings] = await Promise.all([
        getClientById(clientId),
        getBuildingsByClient(clientId)
    ]);

    const buildingsWithHoses = await Promise.all(buildings.map(async (b) => {
        const hoses = await getHosesByBuilding(clientId, b.id);
        return { ...b, hoses };
    }));

    return { client, buildingsWithHoses };
}

export async function getExtinguishersReportDataAction(clientId: string) {
    const [client, buildings] = await Promise.all([
        getClientById(clientId),
        getBuildingsByClient(clientId)
    ]);

    const buildingsWithExtinguishers = await Promise.all(buildings.map(async (b) => {
        const extinguishers = await getExtinguishersByBuilding(clientId, b.id);
        return { ...b, extinguishers };
    }));

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

    const buildingsWithEquipment = await Promise.all(buildings.map(async (b) => {
        const [extinguishers, hoses] = await Promise.all([
            getExtinguishersByBuilding(clientId, b.id),
            getHosesByBuilding(clientId, b.id)
        ]);
        return { ...b, extinguishers, hoses };
    }));
    
    return { client, buildings: buildingsWithEquipment };
}

export async function getNonConformityReportDataAction(clientId: string, buildingId?: string) {
    const client = await getClientById(clientId);
    let buildings: Building[] = [];

    if (buildingId) {
        const building = await getBuildingById(clientId, buildingId);
        if(building) buildings.push(building);
    } else {
        buildings = await getBuildingsByClient(clientId);
    }

    const buildingsWithEquipment = await Promise.all(buildings.map(async (b) => {
        const [extinguishers, hoses] = await Promise.all([
            getExtinguishersByBuilding(clientId, b.id),
            getHosesByBuilding(clientId, b.id)
        ]);

        const ncExtinguishers = extinguishers.filter(e => {
            if (!e.inspections || e.inspections.length === 0) return false;
            const lastInspection = e.inspections[e.inspections.length - 1];
            return lastInspection.status === 'N/C';
        });

        const ncHoses = hoses.filter(h => {
             if (!h.inspections || h.inspections.length === 0) return false;
            const lastInspection = h.inspections[h.inspections.length - 1];
            return lastInspection.status === 'N/C';
        });

        return { ...b, extinguishers: ncExtinguishers, hoses: ncHoses };
    }));
    
    const buildingsWithNC = buildingsWithEquipment.filter(b => b.extinguishers.length > 0 || b.hoses.length > 0);

    return { client, buildings: buildingsWithNC };
}


// --- Reorder Action ---
export async function updateEquipmentOrderAction(clientId: string, buildingId: string, equipmentType: 'extinguishers' | 'hoses', orderedItems: (Extinguisher | Hydrant)[]) {
    await updateEquipmentOrder(clientId, buildingId, equipmentType, orderedItems);
    revalidatePath(`/clients/${clientId}/${buildingId}/${equipmentType}`);
}
