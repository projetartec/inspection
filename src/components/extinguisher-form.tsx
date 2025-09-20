"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { createExtinguisherAction, updateExtinguisherAction } from "@/lib/actions";
import { ExtinguisherFormSchema, type ExtinguisherFormValues } from "@/lib/schemas";
import { extinguisherTypes, extinguisherWeights, type Extinguisher } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import React from "react";
import { Input } from "@/components/ui/input";

interface ExtinguisherFormProps {
  clientId: string;
  buildingId: string;
  extinguisher?: Extinguisher;
}

export function ExtinguisherForm({ clientId, buildingId, extinguisher }: ExtinguisherFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  const isEditMode = !!extinguisher;

  const form = useForm<ExtinguisherFormValues>({
    resolver: zodResolver(ExtinguisherFormSchema),
    defaultValues: isEditMode
      ? {
          ...extinguisher,
          expiryDate: new Date(extinguisher.expiryDate),
        }
      : {
          id: "",
          type: undefined,
          weight: undefined,
          expiryDate: undefined,
          observations: "",
        },
  });

  function onSubmit(data: ExtinguisherFormValues) {
    startTransition(async () => {
      const result = await (isEditMode
        ? updateExtinguisherAction(clientId, buildingId, extinguisher.id, data)
        : createExtinguisherAction(clientId, buildingId, data));

      if (result?.message) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: result.message,
        });
      } else {
        toast({
          title: "Sucesso",
          description: `Extintor ${isEditMode ? 'atualizado' : 'criado'} com sucesso.`,
        });
        // The action will handle the redirect
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ID do Equipamento</FormLabel>
              <FormControl>
                <Input placeholder="Ex: EXT-001" {...field} disabled={isEditMode} />
              </FormControl>
              <FormDescription>
                Digite um identificador único para este extintor. Não pode ser alterado após a criação.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de extintor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {extinguisherTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Peso (kg)</FormLabel>
                <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={String(field.value)}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o peso" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {extinguisherWeights.map((weight) => (
                      <SelectItem key={weight} value={String(weight)}>
                        {weight} kg
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="expiryDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data de Validade</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP", { locale: ptBR })
                      ) : (
                        <span>Escolha uma data</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date < new Date("1900-01-01")}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="observations"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Ex: Localizado perto da entrada principal"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Notas relevantes sobre a localização ou condição do equipamento.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditMode ? 'Salvar Alterações' : 'Criar Extintor'}
        </Button>
      </form>
    </Form>
  );
}
