'use client';

import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LocalDateTimeProps {
  dateString: string;
  formatString: string;
}

export function LocalDateTime({ dateString, formatString }: LocalDateTimeProps) {
  const [formattedDate, setFormattedDate] = useState('');

  useEffect(() => {
    try {
      const date = parseISO(dateString);
      setFormattedDate(format(date, formatString, { locale: ptBR }));
    } catch (error) {
      console.error("Invalid date string provided to LocalDateTime:", dateString);
      setFormattedDate('Data inválida');
    }
  }, [dateString, formatString]);

  // Render a placeholder or nothing on the server, and the formatted date on the client
  return <>{formattedDate}</>;
}
