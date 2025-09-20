"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import React from "react";
import { Loader2, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { BuildingFormSchema, type BuildingFormValues } from "@/lib/schemas";
import { createBuildingAction } from "@/lib/actions";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Card, CardContent } from "./ui/card";

interface BuildingFormProps {
    clientId: string;
}

export function BuildingForm({ clientId }: BuildingFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<BuildingFormValues>({
    resolver: zodResolver(BuildingFormSchema),
    defaultValues: {
      name: "",
    },
  });

  function onSubmit(data: BuildingFormValues) {
    startTransition(async () => {
      const result = await createBuildingAction(clientId, data);
      
      if (result?.message) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: result.message,
        });
      } else {
        toast({
          title: "Sucesso",
          description: `Local "${data.name}" criado com sucesso.`,
        });
        form.reset();
        // The server action will revalidate the path
        router.refresh();
      }
    });
  }

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
                        <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Nome do Local (Prédio)</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: Matriz, Filial Campinas" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <Button type="submit" disabled={isPending} className="w-full">
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Local
                            </Button>
                        </form>
                        </Form>
                    </CardContent>
                </Card>
            </AccordionContent>
        </AccordionItem>
    </Accordion>
  );
}
