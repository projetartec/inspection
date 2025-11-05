
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
  value: string | undefined; // Expects yyyy-MM-dd
  onValueChange: (dateString: string | undefined) => void; // Sends yyyy-MM-dd
  className?: string;
}

const displayFormat = 'dd/MM/yyyy';
const internalFormat = 'yyyy-MM-dd';

export function DatePickerInput({ value, onValueChange, className }: DatePickerInputProps) {
  const [displayValue, setDisplayValue] = React.useState('');
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  React.useEffect(() => {
    if (value) {
      const date = parse(value, internalFormat, new Date());
      if (isValid(date)) {
        setDisplayValue(format(date, displayFormat));
      }
    } else {
      setDisplayValue('');
    }
  }, [value]);
  
  const handleDateSelect = (date: Date | undefined) => {
    if (date && isValid(date)) {
      onValueChange(format(date, internalFormat));
      setDisplayValue(format(date, displayFormat));
    } else {
      onValueChange(undefined);
      setDisplayValue('');
    }
    setIsPopoverOpen(false);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);
    
    // Check if the input is a valid date in dd/MM/yyyy format
    const parsedDate = parse(inputValue, displayFormat, new Date());
    if (isValid(parsedDate) && inputValue.length >= 8) {
      onValueChange(format(parsedDate, internalFormat));
    } else {
      // If user is clearing the input or it's incomplete, send undefined
      onValueChange(undefined);
    }
  };
  
  const selectedDate = value && isValid(parse(value, internalFormat, new Date())) 
    ? parse(value, internalFormat, new Date()) 
    : undefined;

  return (
    <div className={cn('relative w-full', className)}>
      <Input
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        className="pr-10"
        placeholder="DD/MM/AAAA"
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
