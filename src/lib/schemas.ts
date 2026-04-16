

import { z } from 'zod';
import { 
    extinguisherTypes, 
    extinguisherWeights, 
    hydrantQuantities,
    hydrantTypes,
    hydrantDiameters,
    hydrantHoseLengths,
    hydrantKeyQuantities,
    hydrantNozzleQuantities
} from '@/lib/types';

// Schemas for validation
export const ClientFormSchema = z.object({
  name: z.string().min(2, 'O nome da empresa deve ter pelo menos 2 caracteres.'),
  fantasyName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  phone1: z.string().optional(),
  phone2: z.string().optional(),
  cnpj: z.string().optional(),
  email: z.string().email({ message: 'E-mail inválido.' }).optional().or(z.literal('')),
  adminContact: z.string().optional(),
  caretakerContact: z.string().optional(),
});
export type ClientFormValues = z.infer<typeof ClientFormSchema>;

export const BuildingFormSchema = z.object({
  name: z.string().min(2, 'O nome do local deve ter pelo menos 2 caracteres.'),
});
export type BuildingFormValues = z.infer<typeof BuildingFormSchema>;

export const ExtinguisherFormSchema = z.object({
  id: z.string().min(1, 'O ID é obrigatório.'),
  type: z.enum(extinguisherTypes, { required_error: 'Por favor, selecione um tipo.' }),
  weight: z.coerce.number({ required_error: 'Por favor, selecione um peso válido.' }).refine(val => extinguisherWeights.includes(val as any), { message: 'Peso inválido.' }),
  expiryDate: z.string().optional(),
  hydrostaticTestYear: z.coerce.number({invalid_type_error: "Ano inválido"})
    .int()
    .min(1900, 'Ano inválido')
    .max(new Date().getFullYear() + 10, 'Ano inválido')
    .transform(String),
  observations: z.string().max(500, 'As observações devem ter no máximo 500 caracteres.').optional().default(''),
}).passthrough(); // Allow clientId and buildingId
export type ExtinguisherFormValues = z.infer<typeof ExtinguisherFormSchema>;

export const HydrantFormSchema = z.object({
  id: z.string().min(1, 'O ID (HIDRANTE) é obrigatório.'),
  location: z.string().min(2, 'O Local é obrigatório.'),
  quantity: z.coerce.number().min(1, 'A quantidade de mangueiras é obrigatória.').refine(val => hydrantQuantities.includes(val as any), { message: 'Quantidade inválida.' }),
  hoseType: z.enum(hydrantTypes, { required_error: 'Por favor, selecione um tipo de mangueira.' }),
  diameter: z.enum(hydrantDiameters, { required_error: 'Por favor, selecione um diâmetro.' }),
  hoseLength: z.coerce.number({ required_error: 'Por favor, selecione uma medida de mangueira.' }).refine(val => hydrantHoseLengths.includes(val as any), { message: 'Medida inválida.' }),
  keyQuantity: z.coerce.number().min(0, 'A quantidade de chaves é obrigatória.').refine(val => hydrantKeyQuantities.includes(val as any), { message: 'Quantidade de chaves inválida.' }),
  nozzleQuantity: z.coerce.number().min(0, 'A quantidade de esguichos é obrigatória.').refine(val => hydrantNozzleQuantities.includes(val as any), { message: 'Quantidade de esguichos inválida.' }),
  hydrostaticTestDate: z.string().optional(),
}).passthrough(); // Allow clientId and buildingId
export type HydrantFormValues = z.infer<typeof HydrantFormSchema>;


// Compatibility export
export const HoseFormSchema = HydrantFormSchema;
export type HoseFormValues = HydrantFormValues;
