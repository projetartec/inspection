'use server';

import { revalidatePath } from 'next/cache';
import { addExtinguisher, addHose, addInspection, getExtinguishers, getHoses } from '@/lib/data';
import type { ExtinguisherFormValues, HoseFormValues } from './schemas';
import { ExtinguisherFormSchema, HoseFormSchema } from './schemas';


// Server Actions
export async function createExtinguisherAction(data: ExtinguisherFormValues) {
  const validatedFields = ExtinguisherFormSchema.safeParse(data);
  if (!validatedFields.success) {
    return { message: 'Invalid form data.' };
  }
  try {
    await addExtinguisher(validatedFields.data as any);
  } catch (e) {
    return { message: 'Database Error: Failed to create extinguisher.' };
  }
  revalidatePath('/extinguishers');
}

export async function createHoseAction(data: HoseFormValues) {
  const validatedFields = HoseFormSchema.safeParse(data);
  if (!validatedFields.success) {
    return { message: 'Invalid form data.' };
  }
  try {
    await addHose(validatedFields.data as any);
  } catch (e) {
    return { message: 'Database Error: Failed to create hose.' };
  }
  revalidatePath('/hoses');
}

export async function logInspectionAction(qrCodeValue: string, notes: string, location?: { latitude: number; longitude: number }) {
  try {
    const redirectUrl = await addInspection(qrCodeValue, { date: new Date(), notes, location });
    if (!redirectUrl) {
      return { message: 'Equipment not found for the scanned QR code.' };
    }
    revalidatePath(redirectUrl);
    return { redirectUrl };
  } catch(e) {
    return { message: 'Database Error: Failed to log inspection.' };
  }
}

export async function getReportDataAction() {
  const extinguishers = await getExtinguishers();
  const hoses = await getHoses();
  return { extinguishers, hoses };
}
