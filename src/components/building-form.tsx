"use client";

import { useRouter } from "next/navigation";
import React from "react";
import { Loader2, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { createBuildingAction } from "@/lib/actions";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Card, CardContent } from "./ui/card";
import { Label } from "./ui/label";
import { SubmitButton } from "./submit-button";

interface BuildingFormProps {
    clientId: string;
}

export function BuildingForm({ clientId }: BuildingFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  const formAction = async (formData: FormData) => {
      const result = await createBuildingAction(clientId, formData);
      if (result?.message) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: result.message,
        });
      } else {
        const name = formData.get('name') as string;
        toast({
          title: "Sucesso",
          description: `Local "${name}" criado com sucesso.`,
        });
        // Reset form or close accordion if needed
        router.refresh(); // Re-fetches data for the current route
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
                        <form action={formAction} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome do Local (Prédio)</Label>
                                <Input id="name" name="name" placeholder="Ex: Matriz, Filial Campinas" required />
                            </div>
                            <SubmitButton className="w-full">
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
