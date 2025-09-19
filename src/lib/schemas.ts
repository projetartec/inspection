import { z } from 'zod';
import { extinguisherTypes, extinguisherWeights, hoseQuantities, hoseTypes, keyQuantities, nozzleQuantities } from '@/lib/types';

// Schemas for validation
export const ExtinguisherFormSchema = z.object({
  type: z.enum(extinguisherTypes, { invalid_type_error: 'Por favor, selecione um tipo.' }),
  weight: z.coerce.number({ invalid_type_error: 'Por favor, selecione um peso válido.' }),
  expiryDate: z.date({ required_error: 'A data de validade é obrigatória.'}),
  observations: z.string().max(500, 'As observações devem ter no máximo 500 caracteres.').optional(),
});
export type ExtinguisherFormValues = z.infer<typeof ExtinguisherFormSchema>;


export const HoseFormSchema = z.object({
  quantity: z.coerce.number({ invalid_type_error: 'Por favor, selecione uma quantidade.' }),
  hoseType: z.enum(hoseTypes, { invalid_type_error: 'Por favor, selecione um tipo de mangueira.' }),
  keyQuantity: z.coerce.number({ invalid_type_error: 'Por favor, selecione a quantidade de chaves.' }),
  nozzleQuantity: z.coerce.number({ invalid_type_error: 'Por favor, selecione a quantidade de bicos.' }),
  expiryDate: z.date({ required_error: 'A data de validade é obrigatória.'}),
  observations: z.string().max(500, 'As observações devem ter no máximo 500 caracteres.').optional(),
});
export type HoseFormValues = z.infer<typeof HoseFormSchema>;
