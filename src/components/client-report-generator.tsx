
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
import { ExpiryReportGenerator } from './expiry-report-generator';

interface ClientReportGeneratorProps {
    clientId: string;
}

export function ClientReportGenerator({ clientId }: ClientReportGeneratorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateReport = async (format: 'pdf' | 'xlsx') => {
    setIsLoading(true);
    
    // Allow the UI to update (show loader) before the heavy task
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const { client, buildings } = await getClientReportDataAction(clientId);
      if (client && buildings) {
        if (format === 'pdf') {
          await generateClientPdfReport(client, buildings);
        } else {
          await generateClientXlsxReport(client, buildings);
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
    <div className="flex flex-wrap items-center justify-center gap-2">
      <DropdownMenu>
          <DropdownMenuTrigger asChild>
              <Button
                  disabled={isLoading}
                  className="bg-report-consolidated hover:bg-report-consolidated/90 text-black"
              >
                  {isLoading ? (
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  ) : (
                      <FileText className="h-4 w-4 mr-2" />
                  )}
                  Relatório Consolidado
                  <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleGenerateReport('pdf')}>
            Gerar Relatório PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleGenerateReport('xlsx')}>
            Gerar Excel (XLSX)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ExpiryReportGenerator clientId={clientId} />
    </div>
  );
}
