"use client";

import React, { useRef, useState } from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Card, CardContent } from "./ui/card";
import { Label } from "./ui/label";
import { SubmitButton } from "./submit-button";
import { createBuildingAction } from "@/lib/actions";

interface BuildingFormProps {
    clientId: string;
}

export function BuildingForm({ clientId }: BuildingFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsSubmitting(true);
      const formData = new FormData(event.currentTarget);

      try {
        await createBuildingAction(clientId, formData);
        toast({
          title: "Sucesso",
          description: `Local "${formData.get('name')}" criado com sucesso.`,
        });
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: error.message,
        });
      } finally {
        setIsSubmitting(false);
        formRef.current?.reset();
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
                        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
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
