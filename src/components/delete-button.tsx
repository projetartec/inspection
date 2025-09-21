'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';

export function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button variant="destructive" type="submit" disabled={pending}>
      {pending ? 'Deletando...' : 'Deletar'}
    </Button>
  );
}
