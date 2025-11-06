
'use client';

import * as React from 'react';
import { format, parse, isValid } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { ptBR } from 'date-fns/locale';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  React.useEffect(() => {
    if (value) {
      try {
        const date = parse(value, internalFormat, new Date());
        if (isValid(date)) {
          setDisplayValue(format(date, displayFormat));
        } else {
            setDisplayValue('');
        }
      } catch (e) {
          setDisplayValue('');
      }
    } else {
      setDisplayValue('');
    }
  }, [value]);
  
  const handleDateSelect = (date: Date | undefined) => {
    setIsDialogOpen(false);
    if (date && isValid(date)) {
      const internalDate = format(date, internalFormat);
      onValueChange(internalDate);
      setDisplayValue(format(date, displayFormat));
    } else {
      onValueChange(undefined);
      setDisplayValue('');
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;

    // Apply mask: dd/MM/yyyy
    const digitsOnly = inputValue.replace(/\D/g, '');
    let maskedValue = '';
    if (digitsOnly.length > 0) {
        maskedValue = digitsOnly.slice(0, 2);
    }
    if (digitsOnly.length > 2) {
        maskedValue += '/' + digitsOnly.slice(2, 4);
    }
    if (digitsOnly.length > 4) {
        maskedValue += '/' + digitsOnly.slice(4, 8);
    }
    
    setDisplayValue(maskedValue);
    
    if (maskedValue.length === 10) {
      const parsedDate = parse(maskedValue, displayFormat, new Date());
      if (isValid(parsedDate)) {
        onValueChange(format(parsedDate, internalFormat));
      } else {
        onValueChange(undefined);
      }
    } else {
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
        maxLength={10}
      />
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
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
        </DialogTrigger>
        <DialogContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
            locale={ptBR}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
