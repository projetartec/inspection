"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createExtinguisherAction, updateExtinguisherAction } from "@/lib/actions";
import { extinguisherTypes, extinguisherWeights, type Extinguisher } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "./submit-button";
import { Label } from "./ui/label";
import { ExtinguisherFormSchema } from "@/lib/schemas";
import { useState } from "react";


interface ExtinguisherFormProps {
  clientId: string;
  buildingId: string;
  extinguisher?: Extinguisher;
}

export function ExtinguisherForm({ clientId, buildingId, extinguisher }: ExtinguisherFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isEditMode = !!extinguisher;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const rawData = Object.fromEntries(formData.entries());

    const validatedFields = ExtinguisherFormSchema.safeParse(rawData);
  
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
        await updateExtinguisherAction(clientId, buildingId, extinguisher.id, validatedFields.data);
      } else {
        await createExtinguisherAction(clientId, buildingId, validatedFields.data);
      }
      toast({
        title: "Sucesso!",
        description: `Extintor ${isEditMode ? 'atualizado' : 'criado'} com sucesso.`,
      });
      router.push(`/clients/${clientId}/${buildingId}/extinguishers`);
      router.refresh();
    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || `Ocorreu um erro ao ${isEditMode ? 'atualizar' : 'criar'} o extintor.`,
      });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const defaultExpiryDate = extinguisher?.expiryDate && !isNaN(new Date(extinguisher.expiryDate).getTime())
    ? format(new Date(extinguisher.expiryDate), 'yyyy-MM-dd')
    : '';

  return (
      <form onSubmit={handleSubmit} className="space-y-8">
        {isEditMode && <input type="hidden" name="id" value={extinguisher.id} />}
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
                defaultValue={defaultExpiryDate}
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
        
        <SubmitButton isSubmitting={isSubmitting}>
          {isEditMode ? 'Salvar Alterações' : 'Criar Extintor'}
        </SubmitButton>
      </form>
  );
}
