
"use client";

import { useState } from 'react';
import { Droplets, Loader2, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getHosesReportDataAction } from '@/lib/actions';
import { generateHosesPdfReport } from '@/lib/pdf';
import { generateHosesXlsxReport } from '@/lib/csv';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HosesReportGeneratorProps {
    clientId: string;
}

export function HosesReportGenerator({ clientId }: HosesReportGeneratorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateReport = async (format: 'pdf' | 'xlsx') => {
    setIsLoading(true);
    
    // Allow the UI to update (show loader) before the heavy task
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const { client, buildingsWithHoses } = await getHosesReportDataAction(clientId);
      if (client && buildingsWithHoses) {
        if (format === 'pdf') {
          await generateHosesPdfReport(client, buildingsWithHoses);
        } else {
          await generateHosesXlsxReport(client, buildingsWithHoses);
        }
        toast({
            title: 'Sucesso!',
            description: `Relatório de mangueiras em ${format.toUpperCase()} gerado com sucesso.`,
        });
      } else {
        throw new Error("Cliente ou locais não encontrados.");
      }
    } catch (error) {
      console.error(`Falha ao gerar relatório de mangueiras:`, error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: `Falha ao gerar relatório de mangueiras.`
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
                  className="bg-emerald-200 hover:bg-emerald-300 text-black"
              >
                  {isLoading ? (
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  ) : (
                      <Droplets className="h-4 w-4 mr-2" />
                  )}
                  Relatório de Mangueiras
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
    </div>
  );
}
