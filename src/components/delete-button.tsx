'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';

interface DeleteButtonProps {
    onSuccess?: () => void;
    action: () => Promise<any>;
}

export function DeleteButton({ onSuccess, action }: DeleteButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
        await action();
        onSuccess?.();
    });
  }

  return (
    <Button variant="destructive" type="button" onClick={handleClick} disabled={isPending}>
      {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Deletando...
          </>
      ) : 'Deletar'}
    </Button>
  );
}
