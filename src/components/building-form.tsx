"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { addBuilding } from "@/lib/data";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Card, CardContent } from "./ui/card";
import { Label } from "./ui/label";
import { SubmitButton } from "./submit-button";
import { BuildingFormSchema } from "@/lib/schemas";

interface BuildingFormProps {
    clientId: string;
}

export function BuildingForm({ clientId }: BuildingFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsSubmitting(true);
      const formData = new FormData(event.currentTarget);
      const name = formData.get('name') as string;

      const validatedFields = BuildingFormSchema.safeParse({ name });

      if (!validatedFields.success) {
        toast({
          variant: "destructive",
          title: "Erro de Validação",
          description: validatedFields.error.flatten().fieldErrors.name,
        });
        setIsSubmitting(false);
        return;
      }

      try {
        await addBuilding(clientId, validatedFields.data.name);
        toast({
          title: "Sucesso",
          description: `Local "${name}" criado com sucesso.`,
        });
        router.refresh();
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: error.message,
        });
      } finally {
        setIsSubmitting(false);
        const form = event.currentTarget;
        form.reset();
      }
  };

  return (
    <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="new-building" className="border-none">
            <div className="flex justify-center">
                <AccordionTrigger>
                    <Button>
                        <PlusCircle className="mr-2" /> Adicionar Novo Local
                    </Button>
                </AccordionTrigger>
            </div>
            <AccordionContent>
                <Card className="mt-4">
                    <CardContent className="pt-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome do Local (Prédio)</Label>
                                <Input id="name" name="name" placeholder="Ex: Matriz, Filial Campinas" required />
                            </div>
                            <SubmitButton isSubmitting={isSubmitting} className="w-full">
                                Salvar Local
                            </SubmitButton>
                        </form>
                    </CardContent>
                </Card>
            </AccordionContent>
        </AccordionItem>
    </Accordion>
  );
}
