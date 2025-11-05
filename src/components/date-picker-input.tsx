
'use client';

import * as React from 'react';
import { format, parse, isValid } from 'date-fns';
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
    if (date && isValid(date)) {
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
    const inputValue = e.target.value;
    setInternalValue(inputValue);
    
    // Check if the input is a valid date in yyyy-MM-dd format
    const parsedDate = parse(inputValue, 'yyyy-MM-dd', new Date());
    if (isValid(parsedDate) && inputValue.length === 10) {
      onValueChange(inputValue);
    } else {
      // If user is clearing the input or it's incomplete, send undefined
      onValueChange(undefined);
    }
  };
  
  const selectedDate = internalValue && isValid(parse(internalValue, 'yyyy-MM-dd', new Date())) 
    ? parse(internalValue, 'yyyy-MM-dd', new Date()) 
    : undefined;

  return (
    <div className={cn('relative w-full', className)}>
      <Input
        type="text"
        value={internalValue || ''}
        onChange={handleInputChange}
        className="pr-10"
        placeholder="YYYY-MM-DD"
      />
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
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
