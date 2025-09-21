"use client";

import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getReportDataAction } from '@/lib/actions';
import { generatePdfReport } from '@/lib/pdf';
import { SidebarMenuButton } from '@/components/ui/sidebar';

interface ReportGeneratorProps {
    clientId: string;
    buildingId: string;
}

export function ReportGenerator({ clientId, buildingId }: ReportGeneratorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateReport = async () => {
    setIsLoading(true);
    try {
      const { client, building, extinguishers, hoses } = await getReportDataAction(clientId, buildingId);
      if (client && building) {
        generatePdfReport(client, building, extinguishers, hoses);
      } else {
        throw new Error("Cliente ou prédio não encontrado.");
      }
    } catch (error) {
      console.error("Falha ao gerar relatório:", error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao gerar relatório em PDF.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SidebarMenuButton
      onClick={handleGenerateReport}
      disabled={isLoading}
      className="justify-center w-full"
      tooltip="Gerar Relatório PDF"
    >
      {isLoading ? <Loader2 className="animate-spin" /> : <FileText />}
      <span className="group-data-[collapsible=icon]:hidden">
        {isLoading ? 'Gerando...' : 'Gerar Relatório'}
      </span>
    </SidebarMenuButton>
  );
}
