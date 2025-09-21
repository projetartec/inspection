"use client";

import React, { useRef, useState } from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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

    try {
      if (isEditMode) {
        await updateClientAction(client.id, formData);
        toast({
          title: "Sucesso!",
          description: `Cliente "${formData.get('name')}" atualizado.`,
        });
      } else {
        await createClientAction(formData);
        toast({
          title: "Sucesso!",
          description: `Cliente "${formData.get('name')}" criado.`,
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

  if (isEditMode) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Editar Cliente</CardTitle>
                <CardDescription>Modifique o nome do cliente abaixo.</CardDescription>
            </CardHeader>
            <CardContent>
                <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome do Cliente</Label>
                        <Input id="name" name="name" placeholder="Ex: Shopping Center" required defaultValue={client.name}/>
                    </div>
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
                <AccordionTrigger asChild className={cn(buttonVariants({ variant: "default" }), "no-underline")}>
                    <div className="flex items-center">
                        <PlusCircle className="mr-2" /> Adicionar Novo Cliente
                    </div>
                </AccordionTrigger>
            </div>
            <AccordionContent>
                <Card className="mt-4">
                    <CardContent className="pt-6">
                        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome do Cliente</Label>
                                <Input id="name" name="name" placeholder="Ex: Shopping Center" required />
                            </div>
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
