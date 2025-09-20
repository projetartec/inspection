'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { 
  addClient,
  addBuilding,
  addExtinguisher, 
  addHose, 
  addInspection, 
  deleteExtinguisher, 
  deleteHose, 
  getExtinguishersByBuilding, 
  getHosesByBuilding, 
  updateExtinguisher, 
  updateHose 
} from '@/lib/data';
import { ExtinguisherFormSchema, HoseFormSchema, ClientFormSchema, BuildingFormSchema, type ExtinguisherFormValues, type HoseFormValues, type ClientFormValues, type BuildingFormValues } from './schemas';

// --- Client Actions ---
export async function createClientAction(data: ClientFormValues) {
  const validatedFields = ClientFormSchema.safeParse(data);
  if (!validatedFields.success) {
    return { message: 'Dados do formulário inválidos.' };
  }
  try {
    const newClient = await addClient(validatedFields.data.name);
    revalidatePath('/');
    return { client: newClient };
  } catch (e: any) {
    return { message: `Erro de banco de dados: ${e.message}` };
  }
}

// --- Building Actions ---
export async function createBuildingAction(clientId: string, data: BuildingFormValues) {
    const validatedFields = BuildingFormSchema.safeParse(data);
    if (!validatedFields.success) {
      return { message: 'Dados do formulário inválidos.' };
    }
    try {
      const newBuilding = await addBuilding(clientId, validatedFields.data.name);
      revalidatePath(`/clients/${clientId}`);
      return { building: newBuilding };
    } catch (e: any) {
      return { message: `Erro de banco de dados: ${e.message}` };
    }
}


// --- Equipment Actions ---
export async function createExtinguisherAction(clientId: string, buildingId: string, data: ExtinguisherFormValues) {
  const validatedFields = ExtinguisherFormSchema.safeParse(data);
  if (!validatedFields.success) {
    return { message: 'Dados do formulário inválidos.' };
  }
  try {
    await addExtinguisher(clientId, buildingId, validatedFields.data);
  } catch (e: any) {
    return { message: `Erro de banco de dados: ${e.message}` };
  }
  revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers`);
  redirect(`/clients/${clientId}/${buildingId}/extinguishers`);
}

export async function updateExtinguisherAction(clientId: string, buildingId: string, extinguisherId: string, data: ExtinguisherFormValues) {
  const validatedFields = ExtinguisherFormSchema.omit({ id: true }).safeParse(data);
  if (!validatedFields.success) {
    return { message: 'Dados do formulário inválidos.' };
  }
  try {
    await updateExtinguisher(clientId, buildingId, extinguisherId, validatedFields.data);
  } catch (e: any) {
    return { message: `Erro de banco de dados: ${e.message}` };
  }
  revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers`);
  revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers/${extinguisherId}`);
  redirect(`/clients/${clientId}/${buildingId}/extinguishers`);
}

export async function deleteExtinguisherAction(formData: FormData) {
    const clientId = formData.get('clientId') as string;
    const buildingId = formData.get('buildingId') as string;
    const id = formData.get('id') as string;

    if (!clientId || !buildingId || !id) {
        return { message: 'IDs ausentes para exclusão.' };
    }

    try {
      await deleteExtinguisher(clientId, buildingId, id);
    } catch (e: any) {
      return { message: `Erro de banco de dados: ${e.message}` };
    }
    revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers`);
    redirect(`/clients/${clientId}/${buildingId}/extinguishers`);
}

export async function createHoseAction(clientId: string, buildingId: string, data: HoseFormValues) {
  const validatedFields = HoseFormSchema.safeParse(data);
  if (!validatedFields.success) {
    return { message: 'Dados do formulário inválidos.' };
  }
  try {
    await addHose(clientId, buildingId, data);
  } catch (e: any) {
    return { message: `Erro de banco de dados: ${e.message}` };
  }
  revalidatePath(`/clients/${clientId}/${buildingId}/hoses`);
  redirect(`/clients/${clientId}/${buildingId}/hoses`);
}

export async function updateHoseAction(clientId: string, buildingId: string, hoseId: string, data: HoseFormValues) {
    const validatedFields = HoseFormSchema.omit({ id: true }).safeParse(data);
    if (!validatedFields.success) {
      return { message: 'Dados do formulário inválidos.' };
    }
    try {
      await updateHose(clientId, buildingId, hoseId, validatedFields.data);
    } catch (e: any) {
      return { message: `Erro de banco de dados: ${e.message}` };
    }
    revalidatePath(`/clients/${clientId}/${buildingId}/hoses`);
    revalidatePath(`/clients/${clientId}/${buildingId}/hoses/${hoseId}`);
    redirect(`/clients/${clientId}/${buildingId}/hoses`);
  }

export async function deleteHoseAction(formData: FormData) {
    const clientId = formData.get('clientId') as string;
    const buildingId = formData.get('buildingId') as string;
    const id = formData.get('id') as string;

    if (!clientId || !buildingId || !id) {
        return { message: 'IDs ausentes para exclusão.' };
    }

    try {
      await deleteHose(clientId, buildingId, id);
    } catch (e: any) {
      return { message: `Erro de banco de dados: ${e.message}` };
    }
    revalidatePath(`/clients/${clientId}/${buildingId}/hoses`);
    redirect(`/clients/${clientId}/${buildingId}/hoses`);
}


// --- Inspection & Report Actions ---
export async function logInspectionAction(qrCodeValue: string, notes: string, location?: { latitude: number; longitude: number }) {
  try {
    const result = await addInspection(qrCodeValue, { date: new Date(), notes, location });
    if (!result) {
      return { message: 'Equipamento não encontrado para o QR code escaneado.' };
    }
    revalidatePath(result.redirectUrl);
    return { redirectUrl: result.redirectUrl };
  } catch(e) {
    return { message: 'Erro de banco de dados: Falha ao registrar inspeção.' };
  }
}

export async function getReportDataAction(clientId: string, buildingId: string) {
  const extinguishers = await getExtinguishersByBuilding(clientId, buildingId);
  const hoses = await getHosesByBuilding(clientId, buildingId);
  return { extinguishers, hoses };
}
