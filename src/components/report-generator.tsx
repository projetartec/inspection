"use client";

import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getReportDataAction } from '@/lib/actions';
import { generatePdfReport } from '@/lib/pdf';
import { SidebarMenuButton } from '@/components/ui/sidebar';

export function ReportGenerator() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateReport = async () => {
    setIsLoading(true);
    try {
      const { extinguishers, hoses } = await getReportDataAction();
      generatePdfReport(extinguishers, hoses);
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
