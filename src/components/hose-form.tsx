
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createHoseAction, updateHoseAction } from "@/lib/actions";
import { 
    hydrantQuantities, 
    hydrantTypes,
    hydrantDiameters,
    hydrantHoseLengths,
    hydrantKeyQuantities,
    hydrantNozzleQuantities,
    type Hydrant 
} from "@/lib/types";
import { Input } from "./ui/input";
import { SubmitButton } from "./submit-button";
import { Label } from "./ui/label";
import { HydrantFormSchema } from "@/lib/schemas";


interface HoseFormProps {
    clientId: string;
    buildingId: string;
    hose?: Hydrant;
}

export function HoseForm({ clientId, buildingId, hose: hydrant }: HoseFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isEditMode = !!hydrant;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const rawData = Object.fromEntries(formData.entries());

    const validatedFields = HydrantFormSchema.safeParse(rawData);
    
    if (!validatedFields.success) {
        console.error(validatedFields.error.flatten().fieldErrors);
        toast({
            variant: "destructive",
            title: "Erro de Validação",
            description: "Por favor, verifique os campos do formulário.",
        });
        setIsSubmitting(false);
        return;
    }

    try {
        if (isEditMode) {
            await updateHoseAction(clientId, buildingId, hydrant.id, validatedFields.data);
        } else {
            await createHoseAction(clientId, buildingId, validatedFields.data);
        }
        toast({
            title: "Sucesso!",
            description: `Hidrante ${isEditMode ? 'atualizado' : 'criado'} com sucesso.`,
        });
        router.push(`/clients/${clientId}/${buildingId}/hoses`);
        router.refresh();
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Erro",
            description: error.message || `Ocorreu um erro ao ${isEditMode ? 'atualizar' : 'criar'} o hidrante.`,
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const defaultTestDate = hydrant?.hydrostaticTestDate || '';

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
        {isEditMode && <input type="hidden" name="id" value={hydrant.id} />}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
                <Label htmlFor="id-input">ID do Hidrante</Label>
                <Input 
                    id="id-input"
                    name="id"
                    placeholder="Ex: HID-01" 
                    defaultValue={hydrant?.id}
                    disabled={isEditMode}
                    required
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="location-input">Local</Label>
                <Input 
                    id="location-input"
                    name="location"
                    placeholder="Ex: Térreo, próximo à escada" 
                    defaultValue={hydrant?.location}
                    required
                />
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-2">
                <Label htmlFor="quantity">Qtd. Mangueiras</Label>
                <Select name="quantity" defaultValue={String(hydrant?.quantity)} required>
                  <SelectTrigger id="quantity"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{hydrantQuantities.map(q => <SelectItem key={q} value={String(q)}>{q}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="hoseType">Tipo Mangueira</Label>
                <Select name="hoseType" defaultValue={hydrant?.hoseType} required>
                    <SelectTrigger id="hoseType"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                    <SelectContent>{hydrantTypes.map(t => <SelectItem key={t} value={t}>Tipo {t}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="diameter">Diâmetro</Label>
                <Select name="diameter" defaultValue={hydrant?.diameter} required>
                    <SelectTrigger id="diameter"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{hydrantDiameters.map(d => <SelectItem key={d} value={d}>{d}"</SelectItem>)}</SelectContent>
                </Select>
            </div>
             <div className="space-y-2">
                <Label htmlFor="hoseLength">Medida (metros)</Label>
                <Select name="hoseLength" defaultValue={String(hydrant?.hoseLength)} required>
                  <SelectTrigger id="hoseLength"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{hydrantHoseLengths.map(q => <SelectItem key={q} value={String(q)}>{q}m</SelectItem>)}</SelectContent>
                </Select>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2">
                <Label htmlFor="keyQuantity">Qtd. Chaves</Label>
                <Select name="keyQuantity" defaultValue={String(hydrant?.keyQuantity)} required>
                  <SelectTrigger id="keyQuantity"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{hydrantKeyQuantities.map(q => <SelectItem key={q} value={String(q)}>{q}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="nozzleQuantity">Qtd. Esguichos (ESG)</Label>
                <Select name="nozzleQuantity" defaultValue={String(hydrant?.nozzleQuantity)} required>
                  <SelectTrigger id="nozzleQuantity"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{hydrantNozzleQuantities.map(q => <SelectItem key={q} value={String(q)}>{q}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="hydrostaticTestDate">Próx. Teste Hidrostático</Label>
                <Input
                    id="hydrostaticTestDate"
                    name="hydrostaticTestDate"
                    type="date"
                    defaultValue={defaultTestDate}
                    required
                />
            </div>
        </div>
        
        <SubmitButton isSubmitting={isSubmitting}>
          {isEditMode ? 'Salvar Alterações' : 'Criar Hidrante'}
        </SubmitButton>
      </form>
  );
}
