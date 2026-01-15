

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
import { DatePickerInput } from "./date-picker-input";
import { Button } from "./ui/button";


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
  const [testDate, setTestDate] = useState(hydrant?.hydrostaticTestDate || '');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    
    try {
        let result;
        if (isEditMode) {
            result = await updateHoseAction(clientId, hydrant.uid, formData);
        } else {
            await createHoseAction(clientId, buildingId, formData);
            result = { success: true };
        }

        if (result?.error) {
            throw new Error(result.error);
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
            duration: 5000,
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
        <input type="hidden" name="buildingId" value={buildingId} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
                <Label htmlFor="id-input">ID do Hidrante</Label>
                <Input 
                    id="id-input"
                    name="id"
                    placeholder="Ex: HID-01" 
                    defaultValue={hydrant?.id}
                    required
                />
                 <p className="text-sm text-muted-foreground">
                    Este é o identificador visível do hidrante. Pode ser alterado a qualquer momento.
                </p>
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
                <DatePickerInput
                    value={testDate}
                    onValueChange={setTestDate}
                />
                <input type="hidden" name="hydrostaticTestDate" value={testDate} />
            </div>
        </div>
        
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="mt-2 sm:mt-0"
          >
            Cancelar
          </Button>
          <SubmitButton isSubmitting={isSubmitting}>
            {isEditMode ? 'Salvar Alterações' : 'Criar Hidrante'}
          </SubmitButton>
        </div>
      </form>
  );
}
