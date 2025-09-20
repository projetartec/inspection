"use client";

import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { useFormStatus } from 'react-dom';
import { Button } from "./ui/button";

interface DeleteConfirmationDialogProps {
  itemId: string;
  clientId: string;
  buildingId: string;
  itemName: string;
  formAction: (formData: FormData) => void;
  children: React.ReactNode;
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <AlertDialogAction asChild>
        <Button
          type="submit"
          disabled={pending}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Deletar
        </Button>
    </AlertDialogAction>
  );
}

export function DeleteConfirmationDialog({
  itemId,
  clientId,
  buildingId,
  itemName,
  formAction,
  children
}: DeleteConfirmationDialogProps) {

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
          <form action={formAction}>
            <input type="hidden" name="id" value={itemId} />
            <input type="hidden" name="clientId" value={clientId} />
            <input type="hidden" name="buildingId" value={buildingId} />
            <AlertDialogHeader>
              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso irá deletar permanentemente o item
                <span className="font-bold"> {itemId}</span>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <SubmitButton />
            </AlertDialogFooter>
          </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
