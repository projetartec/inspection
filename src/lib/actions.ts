'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { addExtinguisher, addHose, addInspection, getExtinguishers, getHoses } from '@/lib/data';
import { extinguisherTypes, extinguisherWeights, hoseQuantities, hoseTypes, keyQuantities, nozzleQuantities } from '@/lib/types';

// Schemas for validation
export const ExtinguisherFormSchema = z.object({
  type: z.enum(extinguisherTypes, { invalid_type_error: 'Please select a type.' }),
  weight: z.coerce.number().refine(val => extinguisherWeights.includes(val as any), 'Please select a valid weight.'),
  expiryDate: z.date({ required_error: 'Expiry date is required.'}),
  observations: z.string().max(500, 'Observations must be 500 characters or less.').optional(),
});
export type ExtinguisherFormValues = z.infer<typeof ExtinguisherFormSchema>;


export const HoseFormSchema = z.object({
  quantity: z.coerce.number().refine(val => hoseQuantities.includes(val as any), 'Please select a quantity.'),
  hoseType: z.enum(hoseTypes, { invalid_type_error: 'Please select a hose type.' }),
  keyQuantity: z.coerce.number().refine(val => keyQuantities.includes(val as any), 'Please select a key quantity.'),
  nozzleQuantity: z.coerce.number().refine(val => nozzleQuantities.includes(val as any), 'Please select a nozzle quantity.'),
  expiryDate: z.date({ required_error: 'Expiry date is required.'}),
  observations: z.string().max(500, 'Observations must be 500 characters or less.').optional(),
});
export type HoseFormValues = z.infer<typeof HoseFormSchema>;


// Server Actions
export async function createExtinguisherAction(data: ExtinguisherFormValues) {
  try {
    await addExtinguisher(data);
  } catch (e) {
    return { message: 'Database Error: Failed to create extinguisher.' };
  }
  revalidatePath('/extinguishers');
  redirect('/extinguishers');
}

export async function createHoseAction(data: HoseFormValues) {
  try {
    await addHose(data);
  } catch (e) {
    return { message: 'Database Error: Failed to create hose.' };
  }
  revalidatePath('/hoses');
  redirect('/hoses');
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
