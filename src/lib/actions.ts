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
import { ExtinguisherFormSchema, HoseFormSchema, ClientFormSchema, BuildingFormSchema } from './schemas';
import type { Extinguisher, Hose } from './types';

// --- Client Actions ---
export async function createClientAction(formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());
  const validatedFields = ClientFormSchema.safeParse(rawData);
  if (!validatedFields.success) {
    // Melhorar o tratamento de erro no futuro
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
export async function createBuildingAction(clientId: string, formData: FormData) {
    const rawData = Object.fromEntries(formData.entries());
    const validatedFields = BuildingFormSchema.safeParse(rawData);
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
export async function createExtinguisherAction(clientId: string, buildingId: string, formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());
  const validatedFields = ExtinguisherFormSchema.safeParse(rawData);
  
  if (!validatedFields.success) {
    console.error(validatedFields.error.flatten().fieldErrors);
    // Este redirecionamento é uma solução temporária para mostrar um erro.
    // Em um aplicativo real, você lidaria com isso de forma mais elegante.
    redirect(`/clients/${clientId}/${buildingId}/extinguishers/new?error=validation`);
  }
  
  try {
    await addExtinguisher(clientId, buildingId, validatedFields.data as Omit<Extinguisher, 'qrCodeValue' | 'inspections'>);
  } catch (e: any) {
     redirect(`/clients/${clientId}/${buildingId}/extinguishers/new?error=database`);
  }

  revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers`);
  redirect(`/clients/${clientId}/${buildingId}/extinguishers`);
}

export async function updateExtinguisherAction(clientId: string, buildingId: string, extinguisherId: string, formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());
  const validatedFields = ExtinguisherFormSchema.omit({ id: true }).safeParse(rawData);

  if (!validatedFields.success) {
     redirect(`/clients/${clientId}/${buildingId}/extinguishers/${extinguisherId}/edit?error=validation`);
  }

  try {
    await updateExtinguisher(clientId, buildingId, extinguisherId, validatedFields.data as Omit<Extinguisher, 'id' | 'qrCodeValue' | 'inspections'>);
  } catch (e: any) {
    redirect(`/clients/${clientId}/${buildingId}/extinguishers/${extinguisherId}/edit?error=database`);
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
        throw new Error('IDs ausentes para exclusão.');
    }

    try {
      await deleteExtinguisher(clientId, buildingId, id);
    } catch (e: any) {
       throw new Error(`Erro de banco de dados: ${e.message}`);
    }
    revalidatePath(`/clients/${clientId}/${buildingId}/extinguishers`);
    redirect(`/clients/${clientId}/${buildingId}/extinguishers`);
}

export async function createHoseAction(clientId: string, buildingId: string, formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());
  const validatedFields = HoseFormSchema.safeParse(rawData);

  if (!validatedFields.success) {
    console.error(validatedFields.error.flatten().fieldErrors);
    redirect(`/clients/${clientId}/${buildingId}/hoses/new?error=validation`);
  }
  
  try {
    await addHose(clientId, buildingId, validatedFields.data as Omit<Hose, 'qrCodeValue' | 'inspections'>);
  } catch (e: any) {
    redirect(`/clients/${clientId}/${buildingId}/hoses/new?error=database`);
  }
  revalidatePath(`/clients/${clientId}/${buildingId}/hoses`);
  redirect(`/clients/${clientId}/${buildingId}/hoses`);
}

export async function updateHoseAction(clientId: string, buildingId: string, hoseId: string, formData: FormData) {
    const rawData = Object.fromEntries(formData.entries());
    const validatedFields = HoseFormSchema.omit({ id: true }).safeParse(rawData);
    if (!validatedFields.success) {
      redirect(`/clients/${clientId}/${buildingId}/hoses/${hoseId}/edit?error=validation`);
    }
    try {
      await updateHose(clientId, buildingId, hoseId, validatedFields.data as Omit<Hose, 'id' | 'qrCodeValue' | 'inspections'>);
    } catch (e: any) {
      redirect(`/clients/${clientId}/${buildingId}/hoses/${hoseId}/edit?error=database`);
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
       throw new Error('IDs ausentes para exclusão.');
    }

    try {
      await deleteHose(clientId, buildingId, id);
    } catch (e: any) {
       throw new Error(`Erro de banco de dados: ${e.message}`);
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
