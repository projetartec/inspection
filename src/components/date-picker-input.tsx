'use client';

import * as React from 'react';
import { format, parse } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { ptBR } from 'date-fns/locale';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

interface DatePickerInputProps {
  value: string | undefined;
  onValueChange: (dateString: string | undefined) => void;
  className?: string;
}

export function DatePickerInput({ value, onValueChange, className }: DatePickerInputProps) {
  const [internalValue, setInternalValue] = React.useState(value);
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  React.useEffect(() => {
    setInternalValue(value);
  }, [value]);
  
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const formattedDate = format(date, 'yyyy-MM-dd');
      setInternalValue(formattedDate);
      onValueChange(formattedDate);
    } else {
      setInternalValue(undefined);
      onValueChange(undefined);
    }
    setIsPopoverOpen(false);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInternalValue(e.target.value);
    onValueChange(e.target.value);
  };
  
  const selectedDate = internalValue ? parse(internalValue, 'yyyy-MM-dd', new Date()) : undefined;

  return (
    <div className={cn('relative w-full', className)}>
      <Input
        type="date"
        value={internalValue || ''}
        onChange={handleInputChange}
        className="pr-10"
      />
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={'ghost'}
            size="icon"
            className={cn(
              'absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground'
            )}
          >
            <CalendarIcon className="h-4 w-4" />
            <span className="sr-only">Abrir calendário</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
