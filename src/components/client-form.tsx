
"use client";

import React, { useRef, useState } from "react";
import { PlusCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { SubmitButton } from "./submit-button";
import { Label } from "./ui/label";
import { createClientAction, updateClientAction } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils";
import { ClientFormSchema } from "@/lib/schemas";

interface ClientFormProps {
  client?: Client;
  onSuccess?: () => void;
}

export function ClientForm({ client, onSuccess }: ClientFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const isEditMode = !!client;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const rawData = Object.fromEntries(formData.entries());
    
    const validatedFields = ClientFormSchema.safeParse(rawData);

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
        await updateClientAction(client.id, formData);
        toast({
          title: "Sucesso!",
          description: `Cliente "${validatedFields.data.name}" atualizado.`,
        });
      } else {
        await createClientAction(formData);
        toast({
          title: "Sucesso!",
          description: `Cliente "${validatedFields.data.name}" criado.`,
        });
        formRef.current?.reset();
      }
      onSuccess?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formContent = (
    <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
                <Label htmlFor="name">Empresa</Label>
                <Input id="name" name="name" placeholder="Nome da Empresa" required defaultValue={client?.name}/>
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="fantasyName">Nome Fantasia</Label>
                <Input id="fantasyName" name="fantasyName" placeholder="Nome Fantasia" defaultValue={client?.fantasyName}/>
            </div>
        </div>
        <div className="space-y-1.5">
            <Label htmlFor="address">Endereço</Label>
            <Input id="address" name="address" placeholder="Rua, Av, etc." defaultValue={client?.address}/>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" name="city" placeholder="Cidade" defaultValue={client?.city}/>
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="zipCode">CEP</Label>
                <Input id="zipCode" name="zipCode" placeholder="00000-000" defaultValue={client?.zipCode}/>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
                <Label htmlFor="phone1">Telefone 1</Label>
                <Input id="phone1" name="phone1" placeholder="(00) 00000-0000" defaultValue={client?.phone1}/>
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="phone2">Telefone 2</Label>
                <Input id="phone2" name="phone2" placeholder="(00) 0000-0000" defaultValue={client?.phone2}/>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input id="cnpj" name="cnpj" placeholder="00.000.000/0001-00" defaultValue={client?.cnpj}/>
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" placeholder="contato@empresa.com" defaultValue={client?.email}/>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
                <Label htmlFor="adminContact">Contato ADM</Label>
                <Input id="adminContact" name="adminContact" placeholder="Nome do responsável" defaultValue={client?.adminContact}/>
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="caretakerContact">Zelador</Label>
                <Input id="caretakerContact" name="caretakerContact" placeholder="Nome do zelador" defaultValue={client?.caretakerContact}/>
            </div>
        </div>
    </div>
  );

  if (isEditMode) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Editar Cliente</CardTitle>
                <CardDescription>Modifique os dados do cliente abaixo.</CardDescription>
            </CardHeader>
            <CardContent>
                <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                    {formContent}
                    <SubmitButton isSubmitting={isSubmitting} className="w-full">
                        Salvar Alterações
                    </SubmitButton>
                </form>
            </CardContent>
        </Card>
    );
  }

  return (
    <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="new-client" className="border-none">
            <div className="flex justify-center">
                <AccordionTrigger className={cn(buttonVariants({ variant: "default" }), "no-underline")}>
                    <PlusCircle className="mr-2" /> Adicionar Novo Cliente
                </AccordionTrigger>
            </div>
            <AccordionContent>
                <Card className="mt-4">
                    <CardHeader>
                        <CardTitle>Novo Cliente</CardTitle>
                        <CardDescription>Preencha os dados para cadastrar um novo cliente.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                            {formContent}
                            <SubmitButton isSubmitting={isSubmitting} className="w-full">
                                Salvar Cliente
                            </SubmitButton>
                        </form>
                    </CardContent>
                </Card>
            </AccordionContent>
        </AccordionItem>
    </Accordion>
  );
}
