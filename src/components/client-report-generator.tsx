
"use client";

import { useState } from 'react';
import { FileText, Loader2, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getClientReportDataAction } from '@/lib/actions';
import { generateClientPdfReport } from '@/lib/pdf';
import { generateClientXlsxReport } from '@/lib/csv';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ClientReportGeneratorProps {
    clientId: string;
}

export function ClientReportGenerator({ clientId }: ClientReportGeneratorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateReport = async (format: 'pdf' | 'xlsx') => {
    setIsLoading(true);
    try {
      const { client, buildings } = await getClientReportDataAction(clientId);
      if (client && buildings) {
        if (format === 'pdf') {
          generateClientPdfReport(client, buildings);
        } else {
          generateClientXlsxReport(client, buildings);
        }
        toast({
            title: 'Sucesso!',
            description: `Relatório em ${format.toUpperCase()} gerado com sucesso.`,
        });
      } else {
        throw new Error("Cliente ou locais não encontrados.");
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
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button
                disabled={isLoading}
                variant="outline"
                className="w-full justify-center"
            >
                {isLoading ? (
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                ) : (
                    <FileText className="h-4 w-4 mr-2" />
                )}
                Gerar Relatório Consolidado
                <ChevronDown className="h-4 w-4 ml-auto" />
            </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuItem onClick={() => handleGenerateReport('pdf')}>
          Gerar Relatório PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleGenerateReport('xlsx')}>
          Gerar Excel (XLSX)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
