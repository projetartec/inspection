"use client";

import React from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClientAction } from "@/lib/actions";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Card, CardContent } from "./ui/card";
import { SubmitButton } from "./submit-button";
import { Label } from "./ui/label";

export function ClientForm() {

  return (
    <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="new-client" className="border-none">
            <div className="flex justify-center">
                <AccordionTrigger>
                    <Button>
                        <PlusCircle className="mr-2" /> Adicionar Novo Cliente
                    </Button>
                </AccordionTrigger>
            </div>
            <AccordionContent>
                <Card className="mt-4">
                    <CardContent className="pt-6">
                        <form action={createClientAction} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome do Cliente</Label>
                                <Input id="name" name="name" placeholder="Ex: Shopping Center" required />
                            </div>
                            <SubmitButton className="w-full">
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
