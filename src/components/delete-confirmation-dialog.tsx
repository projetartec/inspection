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
import { Button } from "./ui/button";

interface DeleteConfirmationDialogProps {
  itemId: string;
  clientId: string;
  buildingId: string;
  itemName: string;
  formAction: (formData: FormData) => void;
  children: React.ReactNode;
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
              <AlertDialogAction asChild>
                <Button
                  type="submit"
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Deletar
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
