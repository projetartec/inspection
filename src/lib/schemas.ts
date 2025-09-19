import { z } from 'zod';
import { extinguisherTypes, extinguisherWeights, hoseQuantities, hoseTypes, keyQuantities, nozzleQuantities } from '@/lib/types';

// Schemas for validation
export const ExtinguisherFormSchema = z.object({
  type: z.enum(extinguisherTypes, { invalid_type_error: 'Please select a type.' }),
  weight: z.coerce.number({ invalid_type_error: 'Please select a valid weight.' }),
  expiryDate: z.date({ required_error: 'Expiry date is required.'}),
  observations: z.string().max(500, 'Observations must be 500 characters or less.').optional(),
});
export type ExtinguisherFormValues = z.infer<typeof ExtinguisherFormSchema>;


export const HoseFormSchema = z.object({
  quantity: z.coerce.number({ invalid_type_error: 'Please select a quantity.' }),
  hoseType: z.enum(hoseTypes, { invalid_type_error: 'Please select a hose type.' }),
  keyQuantity: z.coerce.number({ invalid_type_error: 'Please select a key quantity.' }),
  nozzleQuantity: z.coerce.number({ invalid_type_error: 'Please select a nozzle quantity.' }),
  expiryDate: z.date({ required_error: 'Expiry date is required.'}),
  observations: z.string().max(500, 'Observations must be 500 characters or less.').optional(),
});
export type HoseFormValues = z.infer<typeof HoseFormSchema>;
