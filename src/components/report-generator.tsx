
"use client";

import { useState } from 'react';
import { FileText, Loader2, ChevronDown, ClipboardList, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
    getReportDataAction, 
    getDescriptiveReportDataAction,
    getNonConformityReportDataAction
} from '@/lib/actions';
import { 
    generatePdfReport as generatePdfReportClient, 
    generateDescriptivePdfReport,
    generateNonConformityPdfReport
} from '@/lib/pdf';
import { 
    generateXlsxReport as generateXlsxReportClient, 
    generateDescriptiveXlsxReport,
    generateNonConformityXlsxReport
} from '@/lib/csv';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ExpiryReportGenerator } from './expiry-report-generator';

interface ReportGeneratorProps {
    clientId: string;
    buildingId: string;
}

export function ReportGenerator({ clientId, buildingId }: ReportGeneratorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateReport = async (format: 'xlsx' | 'pdf') => {
    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const { client, building, extinguishers, hoses } = await getReportDataAction(clientId, buildingId);
      if (client && building) {
        if (format === 'xlsx') {
          await generateXlsxReportClient(client, building, extinguishers, hoses);
        } else {
          await generatePdfReportClient(client, building, extinguishers, hoses);
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

  const handleGenerateDescriptiveReport = async (format: 'pdf' | 'xlsx') => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const { client, buildings } = await getDescriptiveReportDataAction(clientId, buildingId);
      if (client && buildings) {
        if (format === 'pdf') {
          await generateDescriptivePdfReport(client, buildings);
        } else {
          await generateDescriptiveXlsxReport(client, buildings);
        }
        toast({
          title: 'Sucesso!',
          description: `Relatório Descritivo em ${format.toUpperCase()} gerado com sucesso.`,
        });
      } else {
        throw new Error("Cliente ou locais não encontrados.");
      }
    } catch (error) {
      console.error(`Falha ao gerar relatório descritivo:`, error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: `Falha ao gerar relatório descritivo.`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateNCReport = async (format: 'pdf' | 'xlsx', type: 'consolidated' | 'extinguishers' | 'hoses') => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 50));
    try {
      const { client, buildings } = await getNonConformityReportDataAction(clientId, buildingId);
      if (client && buildings) {
          if (format === 'pdf') {
              await generateNonConformityPdfReport(client, buildings, type);
          } else {
              await generateNonConformityXlsxReport(client, buildings, type);
          }
          toast({
              title: 'Sucesso!',
              description: `Relatório de Inconformidades em ${format.toUpperCase()} gerado.`,
          });
      } else {
         throw new Error("Nenhum item não conforme encontrado para este cliente/local.");
      }
    } catch (error: any) {
        console.error(`Falha ao gerar relatório de N/C:`, error);
        toast({
            variant: 'destructive',
            title: 'Erro',
            description: error.message || `Falha ao gerar relatório de inconformidades.`
        });
    } finally {
        setIsLoading(false);
    }
  };


  return (
    <div className="space-y-2">
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
                          <span className="group-data-[collapsible=icon]:hidden ml-2">Relatório do Local</span>
                          <ChevronDown className="h-4 w-4 group-data-[collapsible=icon]:hidden ml-auto" />
                      </>
                  )}
              </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FileText className="mr-2 h-4 w-4" />
              <span>Inspeção</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => handleGenerateReport('pdf')}>Gerar PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleGenerateReport('xlsx')}>Gerar Excel (XLSX)</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ClipboardList className="mr-2 h-4 w-4" />
              <span>Descritivo</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => handleGenerateDescriptiveReport('pdf')}>Gerar PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleGenerateDescriptiveReport('xlsx')}>Gerar Excel (XLSX)</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

           <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <AlertCircle className="mr-2 h-4 w-4" />
              <span>Inconformidades</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                  <DropdownMenuSub>
                      <DropdownMenuSubTrigger>Consolidado</DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                              <DropdownMenuItem onClick={() => handleGenerateNCReport('pdf', 'consolidated')}>Gerar PDF</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleGenerateNCReport('xlsx', 'consolidated')}>Gerar Excel (XLSX)</DropdownMenuItem>
                          </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <DropdownMenuSub>
                      <DropdownMenuSubTrigger>Extintores</DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                              <DropdownMenuItem onClick={() => handleGenerateNCReport('pdf', 'extinguishers')}>Gerar PDF</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleGenerateNCReport('xlsx', 'extinguishers')}>Gerar Excel (XLSX)</DropdownMenuItem>
                          </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <DropdownMenuSub>
                      <DropdownMenuSubTrigger>Mangueiras</DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                              <DropdownMenuItem onClick={() => handleGenerateNCReport('pdf', 'hoses')}>Gerar PDF</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleGenerateNCReport('xlsx', 'hoses')}>Gerar Excel (XLSX)</DropdownMenuItem>
                          </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                  </DropdownMenuSub>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuSeparator />
          <ExpiryReportGenerator clientId={clientId} buildingId={buildingId} isMenuItem={true} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
