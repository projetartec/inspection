
"use client";

import { useState } from 'react';
import { FileText, Loader2, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getReportDataAction } from '@/lib/actions';
import { generateXlsxReport } from '@/lib/csv';
import { generatePdfReport } from '@/lib/pdf';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ReportGeneratorProps {
    clientId: string;
    buildingId: string;
}

export function ReportGenerator({ clientId, buildingId }: ReportGeneratorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateReport = async (format: 'xlsx' | 'pdf') => {
    setIsLoading(true);
    
    // Allow the UI to update (show loader) before the heavy task
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const { client, building, extinguishers, hoses } = await getReportDataAction(clientId, buildingId);
      if (client && building) {
        if (format === 'xlsx') {
          await generateXlsxReport(client, building, extinguishers, hoses);
        } else {
          await generatePdfReport(client, building, extinguishers, hoses);
        }
        toast({
            title: 'Sucesso!',
            description: `Relatório em ${format.toUpperCase()} gerado com sucesso.`,
        });
      } else {
        throw new Error("Cliente ou prédio não encontrado.");
      }
    } catch (error) {
      console.error(`Falha ao gerar relatório em ${format.toUpperCase()}:`, error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: `Falha ao gerar relatório em ${format.toUpperCase()}.`
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
                className="justify-center w-full group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:p-0"
                variant="outline"
            >
                {isLoading ? (
                    <Loader2 className="animate-spin h-4 w-4" />
                ) : (
                    <>
                        <FileText className="h-4 w-4" />
                        <span className="group-data-[collapsible=icon]:hidden ml-2">Gerar Relatório</span>
                        <ChevronDown className="h-4 w-4 group-data-[collapsible=icon]:hidden ml-auto" />
                    </>
                )}
            </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuItem onClick={() => handleGenerateReport('xlsx')}>
          Gerar Excel (XLSX)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleGenerateReport('pdf')}>
          Gerar Relatório PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
