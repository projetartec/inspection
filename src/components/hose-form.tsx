"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { addHose, updateHose } from "@/lib/data";
import { hoseQuantities, hoseTypes, keyQuantities, nozzleQuantities, type Hose } from "@/lib/types";
import { Input } from "./ui/input";
import { SubmitButton } from "./submit-button";
import { Label } from "./ui/label";
import { HoseFormSchema } from "@/lib/schemas";


interface HoseFormProps {
    clientId: string;
    buildingId: string;
    hose?: Hose;
}

export function HoseForm({ clientId, buildingId, hose }: HoseFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isEditMode = !!hose;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const rawData = Object.fromEntries(formData.entries());

    const validatedFields = HoseFormSchema.safeParse(rawData);
    
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
            await updateHose(clientId, buildingId, hose.id, validatedFields.data);
        } else {
            await addHose(clientId, buildingId, validatedFields.data as Omit<Hose, 'qrCodeValue' | 'inspections'>);
        }
        toast({
            title: "Sucesso!",
            description: `Sistema de mangueira ${isEditMode ? 'atualizado' : 'criado'} com sucesso.`,
        });
        router.push(`/clients/${clientId}/${buildingId}/hoses`);
        router.refresh();
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Erro",
            description: error.message || `Ocorreu um erro ao ${isEditMode ? 'atualizar' : 'criar'} o sistema de mangueira.`,
        });
    } finally {
        setIsSubmitting(false);
    }
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-2">
            <Label htmlFor="id">ID do Sistema</Label>
            <Input 
                id="id"
                name="id"
                placeholder="Ex: HOSE-SYS-01" 
                defaultValue={hose?.id}
                disabled={isEditMode}
                required
            />
            <p className="text-sm text-muted-foreground">
                Digite um identificador único para este sistema de mangueira. Não pode ser alterado após a criação.
            </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
                <Label htmlFor="hoseType">Tipo de Mangueira</Label>
                <Select name="hoseType" defaultValue={hose?.hoseType} required>
                    <SelectTrigger id="hoseType"><SelectValue placeholder="Selecione o tipo de mangueira" /></SelectTrigger>
                    <SelectContent>{hoseTypes.map(t => <SelectItem key={t} value={t}>{t}"</SelectItem>)}</SelectContent>
                </Select>
            </div>
             <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade de Mangueiras</Label>
                <Select name="quantity" defaultValue={String(hose?.quantity)} required>
                  <SelectTrigger id="quantity"><SelectValue placeholder="Selecione a quantidade" /></SelectTrigger>
                  <SelectContent>{hoseQuantities.map(q => <SelectItem key={q} value={String(q)}>{q}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="keyQuantity">Quantidade de Chaves</Label>
                <Select name="keyQuantity" defaultValue={String(hose?.keyQuantity)} required>
                  <SelectTrigger id="keyQuantity"><SelectValue placeholder="Selecione a quantidade de chaves" /></SelectTrigger>
                  <SelectContent>{keyQuantities.map(q => <SelectItem key={q} value={String(q)}>{q}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="nozzleQuantity">Quantidade de Bicos</Label>
                <Select name="nozzleQuantity" defaultValue={String(hose?.nozzleQuantity)} required>
                  <SelectTrigger id="nozzleQuantity"><SelectValue placeholder="Selecione a quantidade de bicos" /></SelectTrigger>
                  <SelectContent>{nozzleQuantities.map(q => <SelectItem key={q} value={String(q)}>{q}</SelectItem>)}</SelectContent>
                </Select>
            </div>
        </div>

        <div className="space-y-2">
            <Label htmlFor="expiryDate">Data de Validade</Label>
            <Input
                id="expiryDate"
                name="expiryDate"
                type="date"
                defaultValue={hose ? format(new Date(hose.expiryDate), 'yyyy-MM-dd') : ''}
                required
            />
        </div>

        <div className="space-y-2">
            <Label htmlFor="observations">Observações</Label>
            <Textarea 
                id="observations"
                name="observations"
                placeholder="Ex: Localizado no gabinete da ala leste" 
                defaultValue={hose?.observations}
            />
        </div>
        
        <SubmitButton isSubmitting={isSubmitting}>
          {isEditMode ? 'Salvar Alterações' : 'Criar Sistema de Mangueira'}
        </SubmitButton>
      </form>
  );
}
