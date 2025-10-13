
"use client";

import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getClientReportDataAction } from '@/lib/actions';
import { generateClientPdfReport } from '@/lib/pdf';
import { Button } from '@/components/ui/button';

interface ClientReportGeneratorProps {
    clientId: string;
}

export function ClientReportGenerator({ clientId }: ClientReportGeneratorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateReport = async () => {
    setIsLoading(true);
    try {
      const { client, buildings } = await getClientReportDataAction(clientId);
      if (client && buildings) {
        generateClientPdfReport(client, buildings);
        toast({
            title: 'Sucesso!',
            description: `Relatório de extintores gerado com sucesso.`,
        });
      } else {
        throw new Error("Cliente ou prédios não encontrados.");
      }
    } catch (error) {
      console.error(`Falha ao gerar relatório:`, error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: `Falha ao gerar relatório.`
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
        disabled={isLoading}
        onClick={handleGenerateReport}
        variant="outline"
    >
        {isLoading ? (
            <Loader2 className="animate-spin h-4 w-4 mr-2" />
        ) : (
            <FileText className="h-4 w-4 mr-2" />
        )}
        Gerar Relatório de Extintores
    </Button>
  );
}
