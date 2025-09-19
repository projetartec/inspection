"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import React from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { HoseFormSchema, type HoseFormValues, createHoseAction } from "@/lib/actions";
import { hoseQuantities, hoseTypes, keyQuantities, nozzleQuantities } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export function HoseForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<HoseFormValues>({
    resolver: zodResolver(HoseFormSchema),
    defaultValues: {
      observations: "",
    },
  });

  function onSubmit(data: HoseFormValues) {
    startTransition(async () => {
      const result = await createHoseAction(data);
      if (result?.message) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message,
        });
      } else {
        toast({
          title: "Success",
          description: "Hose system created successfully.",
        });
        router.push("/hoses");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FormField
            control={form.control}
            name="hoseType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hose Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select hose type" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>{hoseTypes.map(t => <SelectItem key={t} value={t}>{t}"</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hose Quantity</FormLabel>
                <Select onValueChange={v => field.onChange(Number(v))} defaultValue={String(field.value)}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select quantity" /></SelectTrigger></FormControl>
                  <SelectContent>{hoseQuantities.map(q => <SelectItem key={q} value={String(q)}>{q}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="keyQuantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Key Quantity</FormLabel>
                <Select onValueChange={v => field.onChange(Number(v))} defaultValue={String(field.value)}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select key quantity" /></SelectTrigger></FormControl>
                  <SelectContent>{keyQuantities.map(q => <SelectItem key={q} value={String(q)}>{q}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nozzleQuantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nozzle Quantity</FormLabel>
                <Select onValueChange={v => field.onChange(Number(v))} defaultValue={String(field.value)}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select nozzle quantity" /></SelectTrigger></FormControl>
                  <SelectContent>{nozzleQuantities.map(q => <SelectItem key={q} value={String(q)}>{q}</SelectItem>)}</SelectContent>
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
            <FormItem className="flex flex-col"><FormLabel>Expiry Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={d => d < new Date("1900-01-01")} initialFocus />
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
              <FormLabel>Observations</FormLabel>
              <FormControl><Textarea placeholder="e.g. Located in the east wing cabinet" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Hose System
        </Button>
      </form>
    </Form>
  );
}
