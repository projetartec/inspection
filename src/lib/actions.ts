'use server';

import { revalidatePath } from 'next/cache';
import { 
  addClient,
  addExtinguisher, 
  addHose, 
  addInspection, 
  deleteExtinguisher, 
  deleteHose, 
  getExtinguishers, 
  getHoses, 
  updateExtinguisher, 
  updateHose 
} from '@/lib/data';
import { ExtinguisherFormSchema, HoseFormSchema, ClientFormSchema, type ExtinguisherFormValues, type HoseFormValues, type ClientFormValues } from './schemas';

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

// --- Equipment Actions (to be refactored) ---
export async function createExtinguisherAction(data: ExtinguisherFormValues) {
  const validatedFields = ExtinguisherFormSchema.safeParse(data);
  if (!validatedFields.success) {
    return { message: 'Dados do formulário inválidos.' };
  }
  try {
    await addExtinguisher(validatedFields.data);
  } catch (e: any) {
    return { message: `Erro de banco de dados: ${e.message}` };
  }
  // This path will need to be dynamic based on the client/building
  revalidatePath('/extinguishers');
}

export async function updateExtinguisherAction(id: string, data: ExtinguisherFormValues) {
  const validatedFields = ExtinguisherFormSchema.omit({ id: true }).safeParse(data);
  if (!validatedFields.success) {
    return { message: 'Dados do formulário inválidos.' };
  }
  try {
    await updateExtinguisher(id, validatedFields.data);
  } catch (e: any) {
    return { message: `Erro de banco de dados: ${e.message}` };
  }
  // These paths will need to be dynamic
  revalidatePath('/extinguishers');
  revalidatePath(`/extinguishers/${id}`);
}


export async function createHoseAction(data: HoseFormValues) {
  const validatedFields = HoseFormSchema.safeParse(data);
  if (!validatedFields.success) {
    return { message: 'Dados do formulário inválidos.' };
  }
  try {
    await addHose(validatedFields.data);
  } catch (e: any) {
    return { message: `Erro de banco de dados: ${e.message}` };
  }
  // This path will need to be dynamic
  revalidatePath('/hoses');
}

export async function updateHoseAction(id: string, data: HoseFormValues) {
    const validatedFields = HoseFormSchema.omit({ id: true }).safeParse(data);
    if (!validatedFields.success) {
      return { message: 'Dados do formulário inválidos.' };
    }
    try {
      await updateHose(id, validatedFields.data);
    } catch (e: any) {
      return { message: `Erro de banco de dados: ${e.message}` };
    }
    // These paths will need to be dynamic
    revalidatePath('/hoses');
    revalidatePath(`/hoses/${id}`);
  }

export async function logInspectionAction(qrCodeValue: string, notes: string, location?: { latitude: number; longitude: number }) {
  try {
    const redirectUrl = await addInspection(qrCodeValue, { date: new Date(), notes, location });
    if (!redirectUrl) {
      return { message: 'Equipamento não encontrado para o QR code escaneado.' };
    }
    revalidatePath(redirectUrl);
    return { redirectUrl };
  } catch(e) {
    return { message: 'Erro de banco de dados: Falha ao registrar inspeção.' };
  }
}

export async function getReportDataAction() {
  // This will need to be updated to get data for a specific building
  const extinguishers = await getExtinguishers();
  const hoses = await getHoses();
  return { extinguishers, hoses };
}

export async function deleteExtinguisherAction(id: string) {
  try {
    await deleteExtinguisher(id);
  } catch (e: any) {
    return { message: `Erro de banco de dados: ${e.message}` };
  }
  // This path will need to be dynamic
  revalidatePath('/extinguishers');
}

export async function deleteHoseAction(id: string) {
  try {
    await deleteHose(id);
  } catch (e: any) {
    return { message: `Erro de banco de dados: ${e.message}` };
  }
  // This path will need to be dynamic
  revalidatePath('/hoses');
}
