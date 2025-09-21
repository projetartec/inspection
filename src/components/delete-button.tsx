"use client";

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { AlertDialogAction } from '@/components/ui/alert-dialog';

interface DeleteButtonProps {
    action: () => Promise<any>;
    onSuccess: () => void;
}

export function DeleteButton({ action, onSuccess }: DeleteButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      try {
        await action();
        onSuccess();
      } catch (error) {
        console.error("Ação de deletar falhou:", error);
        // Opcional: Adicionar um toast de erro aqui se necessário
      }
    });
  };

  return (
    <AlertDialogAction asChild>
      <Button
        variant="destructive"
        onClick={handleClick}
        disabled={isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Deletando...
          </>
        ) : (
          'Deletar'
        )}
      </Button>
    </AlertDialogAction>
  );
}
