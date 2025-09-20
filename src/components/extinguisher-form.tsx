"use client";

import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createExtinguisherAction, updateExtinguisherAction } from "@/lib/actions";
import { extinguisherTypes, extinguisherWeights, type Extinguisher } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "./submit-button";
import { Label } from "./ui/label";


interface ExtinguisherFormProps {
  clientId: string;
  buildingId: string;
  extinguisher?: Extinguisher;
}

export function ExtinguisherForm({ clientId, buildingId, extinguisher }: ExtinguisherFormProps) {
  const isEditMode = !!extinguisher;

  const action = isEditMode
    ? updateExtinguisherAction.bind(null, clientId, buildingId, extinguisher.id)
    : createExtinguisherAction.bind(null, clientId, buildingId);

  return (
      <form action={action} className="space-y-8">
        <div className="space-y-2">
            <Label htmlFor="id">ID do Equipamento</Label>
            <Input 
                id="id"
                name="id"
                placeholder="Ex: EXT-001" 
                defaultValue={extinguisher?.id} 
                disabled={isEditMode} 
                required 
            />
            <p className="text-sm text-muted-foreground">
                Digite um identificador único para este extintor. Não pode ser alterado após a criação.
            </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select name="type" defaultValue={extinguisher?.type} required>
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Selecione o tipo de extintor" />
                    </SelectTrigger>
                  <SelectContent>
                    {extinguisherTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="weight">Peso (kg)</Label>
                <Select name="weight" defaultValue={String(extinguisher?.weight)} required>
                    <SelectTrigger id="weight">
                      <SelectValue placeholder="Selecione o peso" />
                    </SelectTrigger>
                  <SelectContent>
                    {extinguisherWeights.map((weight) => (
                      <SelectItem key={weight} value={String(weight)}>
                        {weight} kg
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
        </div>
        
        <div className="space-y-2">
            <Label htmlFor="expiryDate">Data de Validade</Label>
            <Input 
                id="expiryDate"
                name="expiryDate"
                type="date"
                defaultValue={extinguisher ? format(new Date(extinguisher.expiryDate), 'yyyy-MM-dd') : ''}
                required
            />
        </div>
        
        <div className="space-y-2">
            <Label htmlFor="observations">Observações</Label>
            <Textarea
                id="observations"
                name="observations"
                placeholder="Ex: Localizado perto da entrada principal"
                className="resize-none"
                defaultValue={extinguisher?.observations}
            />
             <p className="text-sm text-muted-foreground">
                Notas relevantes sobre a localização ou condição do equipamento.
             </p>
        </div>
        
        <SubmitButton>
          {isEditMode ? 'Salvar Alterações' : 'Criar Extintor'}
        </SubmitButton>
      </form>
  );
}