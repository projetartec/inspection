
'use server';

import type { Extinguisher, Hydrant, Client, Building } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ExtinguisherFormValues, HydrantFormValues } from './schemas';
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
    updateExtinguisher as updateExtinguisherData,
    deleteExtinguisher as deleteExtinguisherData,
    addHose as addHoseData,
    updateHose as updateHoseData,
    deleteHose as deleteHoseData,
    addInspectionBatch,
    updateEquipmentOrder
} from './data';
import { getClientById, getBuildingById, getExtinguishersByBuilding, getHosesByBuilding, getBuildingsByClient } from './data';


// --- Client Actions ---
export async function createClientAction(formData: FormData) {
  const name = formData.get('name') as string;
  if (!name || name.trim().length < 2) {
    throw new Error('O nome do cliente deve ter pelo menos 2 caracteres.');
  }

  await addClientData({ name });
  
  revalidatePath('/');
}

export async function updateClientAction(id: string, formData: FormData) {
  const name = formData.get('name') as string;
  if (!name || name.trim().length < 2) {
    throw new Error('O nome do cliente deve ter pelo menos 2 caracteres.');
  }

  await updateClientData(id, { name });

  revalidatePath('/');
  revalidatePath(`/clients/${id}/edit`);
  redirect('/');
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
    await addExtinguisherData(clientId, buildingId, data);
    
    revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
}

export async function updateExtinguisherAction(clientId: string, buildingId: string, id: string, data: Partial<ExtinguisherFormValues>) {
    await updateExtinguisherData(clientId, buildingId, id, data);

    revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers`);
    revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers/${id}`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
}

export async function deleteExtinguisherAction(clientId: string, buildingId: string, id: string) {
    await deleteExtinguisherData(clientId, buildingId, id);

    revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
}

// --- Hose Actions ---
export async function createHoseAction(clientId: string, buildingId: string, data: HydrantFormValues) {
    await addHoseData(clientId, buildingId, data);
    
    revalidatePath(`/clients/${clientId}/${buildingId}/hoses`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
}

export async function updateHoseAction(clientId: string, buildingId: string, id: string, data: Partial<HydrantFormValues>) {
    await updateHoseData(clientId, buildingId, id, data);

    revalidatePath(`/clients/${clientId}/${buildingId}/hoses`);
    revalidatePath(`/clients/${clientId}/${buildingId}/hoses/${id}`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
}

export async function deleteHoseAction(clientId: string, buildingId: string, id: string) {
    await deleteHoseData(clientId, buildingId, id);

    revalidatePath(`/clients/${clientId}/${buildingId}/hoses`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
}

// --- Inspection Action ---
export async function addInspectionBatchAction(clientId: string, buildingId: string, inspectedItems: InspectedItem[]) {
    await addInspectionBatch(clientId, buildingId, inspectedItems);

    const revalidatedPaths: Set<string> = new Set();
    inspectedItems.forEach(item => {
        if (item.qrCodeValue.startsWith('fireguard-ext-')) {
            const extId = item.qrCodeValue.replace('fireguard-ext-', '');
            revalidatedPaths.add(`/clients/${clientId}/${buildingId}/extinguishers/${extId}`);
        } else if (item.qrCodeValue.startsWith('fireguard-hose-')) {
            const hoseId = item.qrCodeValue.replace('fireguard-hose-', '');
            revalidatedPaths.add(`/clients/${clientId}/${buildingId}/hoses/${hoseId}`);
        }
        // Manual entries don't have a specific page to revalidate, but they affect the dashboard.
    });

    revalidatedPaths.forEach(p => revalidatePath(p));
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
    revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers`);
    revalidatePath(`/clients/${clientId}/${buildingId}/hoses`);
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

export async function getClientReportDataAction(clientId: string) {
    const [client, buildings] = await Promise.all([
        getClientById(clientId),
        getBuildingsByClient(clientId)
    ]);

    return { client, buildings };
}

// --- Reorder Action ---
export async function updateEquipmentOrderAction(clientId: string, buildingId: string, equipmentType: 'extinguishers' | 'hoses', orderedItems: (Extinguisher | Hydrant)[]) {
    await updateEquipmentOrder(clientId, buildingId, equipmentType, orderedItems);
    revalidatePath(`/clients/${clientId}/${buildingId}/${equipmentType}`);
}
