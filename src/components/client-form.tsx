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
import { ClientFormSchema, type ClientFormValues } from "@/lib/schemas";
import { createClientAction } from "@/lib/actions";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Card, CardContent } from "./ui/card";

export function ClientForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(ClientFormSchema),
    defaultValues: {
      name: "",
    },
  });

  function onSubmit(data: ClientFormValues) {
    startTransition(async () => {
      const result = await createClientAction(data);
      
      if (result?.message) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: result.message,
        });
      } else {
        toast({
          title: "Sucesso",
          description: `Cliente "${data.name}" criado com sucesso.`,
        });
        form.reset();
        // The server action will revalidate the path
        if (result.client) {
            router.push(`/clients/${result.client.id}`);
        } else {
            router.refresh();
        }
      }
    });
  }

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
                        <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Nome do Cliente</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: Shopping Center" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <Button type="submit" disabled={isPending} className="w-full">
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Cliente
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
