'use server';

import { revalidatePath } from 'next/cache';
import { addExtinguisher, addHose, addInspection, getExtinguishers, getHoses } from '@/lib/data';
import type { ExtinguisherFormValues, HoseFormValues } from './schemas';
import { ExtinguisherFormSchema, HoseFormSchema } from './schemas';


// Server Actions
export async function createExtinguisherAction(data: ExtinguisherFormValues) {
  const validatedFields = ExtinguisherFormSchema.safeParse(data);
  if (!validatedFields.success) {
    return { message: 'Dados do formulário inválidos.' };
  }
  try {
    await addExtinguisher(validatedFields.data as any);
  } catch (e) {
    return { message: 'Erro de banco de dados: Falha ao criar extintor.' };
  }
  revalidatePath('/extinguishers');
}

export async function createHoseAction(data: HoseFormValues) {
  const validatedFields = HoseFormSchema.safeParse(data);
  if (!validatedFields.success) {
    return { message: 'Dados do formulário inválidos.' };
  }
  try {
    await addHose(validatedFields.data as any);
  } catch (e) {
    return { message: 'Erro de banco de dados: Falha ao criar sistema de mangueira.' };
  }
  revalidatePath('/hoses');
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
  const extinguishers = await getExtinguishers();
  const hoses = await getHoses();
  return { extinguishers, hoses };
}
