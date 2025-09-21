'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';

interface DeleteButtonProps {
    onSuccess?: () => void;
}

export function DeleteButton({ onSuccess }: DeleteButtonProps) {
  const { pending, data } = useFormStatus();

  useEffect(() => {
    // This effect runs when the form submission is over (pending is false)
    // and we were previously pending (which means a submission just finished).
    // The `data` object is null during the initial render and on subsequent renders 
    // where the form was not submitted. It is non-null after a submission.
    // This logic ensures onSuccess is called only *after* a successful form action.
    if (!pending && data && onSuccess) {
      onSuccess();
    }
  }, [pending, data, onSuccess]);

  return (
    <Button variant="destructive" type="submit" disabled={pending}>
      {pending ? 'Deletando...' : 'Deletar'}
    </Button>
  );
}
