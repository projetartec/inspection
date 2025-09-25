
'use server';

import type { Extinguisher, Hydrant, Inspection, Client, Building } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ExtinguisherFormValues, HydrantFormValues } from './schemas';
import type { InspectedItem } from '@/hooks/use-inspection-session.tsx';
import {
    getClients,
    getClientById,
    getBuildingById,
    getExtinguishersByBuilding,
    getHosesByBuilding,
    getExtinguisherById,
    getHoseById,
    addClient,
    updateClient,
    deleteClient,
    addBuilding,
    updateBuilding,
    deleteBuilding,
    addExtinguisher,
    updateExtinguisher,
    deleteExtinguisher,
    addHose,
    updateHose,
    deleteHose,
    addInspectionBatch
} from './data';

// --- Client Actions ---
export async function createClientAction(formData: FormData) {
  const name = formData.get('name') as string;
  if (!name || name.trim().length < 2) {
    throw new Error('O nome do cliente deve ter pelo menos 2 caracteres.');
  }
  
  const clients = await getClients();
  const nameExists = clients.some(client => client.name.toLowerCase() === name.toLowerCase());
  if (nameExists) {
      throw new Error('Um cliente com este nome já existe.');
  }

  await addClient({
      id: `client-${Date.now()}`,
      name: name,
      buildings: []
  });
  
  revalidatePath('/');
}

export async function updateClientAction(id: string, formData: FormData) {
  const name = formData.get('name') as string;
  if (!name || name.trim().length < 2) {
    throw new Error('O nome do cliente deve ter pelo menos 2 caracteres.');
  }

  await updateClient(id, { name });

  revalidatePath('/');
  revalidatePath(`/clients/${id}/edit`);
  redirect('/');
}

export async function deleteClientAction(id: string) {
    await deleteClient(id);
    revalidatePath('/');
}


// --- Building Actions ---
export async function createBuildingAction(clientId: string, formData: FormData) {
    const name = formData.get('name') as string;
    if (!name || name.trim().length < 2) {
        throw new Error('O nome do local deve ter pelo menos 2 caracteres.');
    }
    
    const client = await getClientById(clientId);
    if (!client) {
        throw new Error('Cliente não encontrado.');
    }

    const nameExists = client.buildings.some(b => b.name.toLowerCase() === name.toLowerCase());
    if (nameExists) {
        throw new Error('Um local com este nome já existe para este cliente.');
    }

    const newBuilding: Building = {
        id: `bldg-${Date.now()}`,
        name: name,
        extinguishers: [],
        hoses: []
    };

    await addBuilding(clientId, newBuilding);
    revalidatePath(`/clients/${clientId}`);
}

export async function updateBuildingAction(clientId: string, buildingId: string, formData: FormData) {
    const name = formData.get('name') as string;
    if (!name || name.trim().length < 2) {
        throw new Error('O nome do local deve ter pelo menos 2 caracteres.');
    }
    
    await updateBuilding(clientId, buildingId, { name });

    revalidatePath(`/clients/${clientId}`);
    revalidatePath(`/clients/${clientId}/${buildingId}/edit`);
}

export async function deleteBuildingAction(clientId: string, buildingId: string) {
    await deleteBuilding(clientId, buildingId);
    revalidatePath(`/clients/${clientId}`);
}

// --- Extinguisher Actions ---
export async function createExtinguisherAction(clientId: string, buildingId: string, data: ExtinguisherFormValues) {
    const building = await getBuildingById(clientId, buildingId);
    if (!building) throw new Error('Local não encontrado.');

    const idExists = building.extinguishers.some(e => e.id === data.id);
    if (idExists) throw new Error('Já existe um extintor com este ID neste local.');

    const newExtinguisher: Extinguisher = {
        ...data,
        qrCodeValue: `fireguard-ext-${data.id}`,
        inspections: [],
    };
    
    await addExtinguisher(clientId, buildingId, newExtinguisher);
    
    revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
}

export async function updateExtinguisherAction(clientId: string, buildingId: string, id: string, data: Partial<ExtinguisherFormValues>) {
    await updateExtinguisher(clientId, buildingId, id, data);

    revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers`);
    revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers/${id}`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
}

export async function deleteExtinguisherAction(clientId: string, buildingId: string, id: string) {
    await deleteExtinguisher(clientId, buildingId, id);

    revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
}

// --- Hose Actions ---
export async function createHoseAction(clientId: string, buildingId: string, data: HydrantFormValues) {
    const building = await getBuildingById(clientId, buildingId);
    if (!building) throw new Error('Local não encontrado.');

    const idExists = building.hoses.some(h => h.id === data.id);
    if (idExists) throw new Error('Já existe um hidrante com este ID neste local.');

    const newHose: Hydrant = {
        ...data,
        qrCodeValue: `fireguard-hose-${data.id}`,
        inspections: [],
    };
    
    await addHose(clientId, buildingId, newHose);
    
    revalidatePath(`/clients/${clientId}/${buildingId}/hoses`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
}

export async function updateHoseAction(clientId: string, buildingId: string, id: string, data: Partial<HydrantFormValues>) {
    await updateHose(clientId, buildingId, id, data);

    revalidatePath(`/clients/${clientId}/${buildingId}/hoses`);
    revalidatePath(`/clients/${clientId}/${buildingId}/hoses/${id}`);
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
}

export async function deleteHoseAction(clientId: string, buildingId: string, id: string) {
    await deleteHose(clientId, buildingId, id);

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
        }
        if (item.qrCodeValue.startsWith('fireguard-hose-')) {
            const hoseId = item.qrCodeValue.replace('fireguard-hose-', '');
            revalidatedPaths.add(`/clients/${clientId}/${buildingId}/hoses/${hoseId}`);
        }
    });

    revalidatedPaths.forEach(p => revalidatePath(p));
    revalidatePath(`/clients/${clientId}/${buildingId}/dashboard`);
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
