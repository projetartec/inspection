import { z } from 'zod';
import { extinguisherTypes, extinguisherWeights, hoseQuantities, hoseTypes, keyQuantities, nozzleQuantities } from '@/lib/types';

// Schemas for validation
export const ClientFormSchema = z.object({
  name: z.string().min(2, 'O nome do cliente deve ter pelo menos 2 caracteres.'),
});
export type ClientFormValues = z.infer<typeof ClientFormSchema>;

export const BuildingFormSchema = z.object({
  name: z.string().min(2, 'O nome do local deve ter pelo menos 2 caracteres.'),
});
export type BuildingFormValues = z.infer<typeof BuildingFormSchema>;

export const ExtinguisherFormSchema = z.object({
  id: z.string().min(1, 'O ID é obrigatório.'),
  type: z.enum(extinguisherTypes, { required_error: 'Por favor, selecione um tipo.' }),
  weight: z.coerce.number({ required_error: 'Por favor, selecione um peso válido.' }),
  expiryDate: z.string().min(1, 'A data de validade é obrigatória.'),
  observations: z.string().max(500, 'As observações devem ter no máximo 500 caracteres.').optional().default(''),
});
export type ExtinguisherFormValues = z.infer<typeof ExtinguisherFormSchema>;


export const HoseFormSchema = z.object({
  id: z.string().min(1, 'O ID é obrigatório.'),
  quantity: z.coerce.number({ required_error: 'Por favor, selecione uma quantidade.' }),
  hoseType: z.enum(hoseTypes, { required_error: 'Por favor, selecione um tipo de mangueira.' }),
  keyQuantity: z.coerce.number({ required_error: 'Por favor, selecione a quantidade de chaves.' }),
  nozzleQuantity: z.coerce.number({ required_error: 'Por favor, selecione a quantidade de bicos.' }),
  expiryDate: z.string().min(1, 'A data de validade é obrigatória.'),
  observations: z.string().max(500, 'As observações devem ter no máximo 500 caracteres.').optional().default(''),
});
export type HoseFormValues = z.infer<typeof HoseFormSchema>;
