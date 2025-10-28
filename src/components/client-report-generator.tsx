
"use client";

import { useState } from 'react';
import { FileText, Loader2, ChevronDown, Droplets, Flame, ClipboardList, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
    getClientReportDataAction, 
    getExpiryReportDataAction, 
    getHosesReportDataAction,
    getExtinguishersReportDataAction,
    getDescriptiveReportDataAction,
    getNonConformityReportDataAction
} from '@/lib/actions';
import { 
    generateClientPdfReport, 
    generateHosesPdfReport,
    generateExtinguishersPdfReport,
    generateDescriptivePdfReport,
    generateNonConformityPdfReport
} from '@/lib/pdf';
import { 
    generateClientXlsxReport, 
    generateHosesXlsxReport,
    generateExtinguishersXlsxReport,
    generateDescriptiveXlsxReport,
    generateNonConformityXlsxReport
} from '@/lib/csv';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { ExpiryReportGenerator } from './expiry-report-generator';


interface ClientReportGeneratorProps {
    clientId: string;
}

export function ClientReportGenerator({ clientId }: ClientReportGeneratorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateConsolidatedReport = async (format: 'pdf' | 'xlsx') => {
    setIsLoading(true);
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

  const handleGenerateHosesReport = async (format: 'pdf' | 'xlsx') => {
    setIsLoading(true);
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
        throw new Error("Cliente ou locais com mangueiras não encontrados.");
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

  const handleGenerateExtinguishersReport = async (format: 'pdf' | 'xlsx') => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 50));
    try {
      const { client, buildingsWithExtinguishers } = await getExtinguishersReportDataAction(clientId);
      if (client && buildingsWithExtinguishers) {
        if (format === 'pdf') {
          await generateExtinguishersPdfReport(client, buildingsWithExtinguishers);
        } else {
          await generateExtinguishersXlsxReport(client, buildingsWithExtinguishers);
        }
        toast({
            title: 'Sucesso!',
            description: `Relatório de extintores em ${format.toUpperCase()} gerado com sucesso.`,
        });
      } else {
        throw new Error("Cliente ou locais com extintores não encontrados.");
      }
    } catch (error) {
      console.error(`Falha ao gerar relatório de extintores:`, error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: `Falha ao gerar relatório de extintores.`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateDescriptiveReport = async (format: 'pdf' | 'xlsx') => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 50));
    try {
      const { client, buildings } = await getDescriptiveReportDataAction(clientId);
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
      const { client, buildings } = await getNonConformityReportDataAction(clientId);
      if (client && buildings.length > 0) {
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
         throw new Error("Nenhum item não conforme encontrado para este cliente.");
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
    <>
      <DropdownMenu>
          <DropdownMenuTrigger asChild>
              <Button
                  disabled={isLoading}
                  className="bg-sky-200 hover:bg-sky-300 text-black"
              >
                  {isLoading ? (
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  ) : (
                      <FileText className="h-4 w-4 mr-2" />
                  )}
                  Relatórios
                  <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                    <FileText className="mr-2 h-4 w-4" />
                    <span>Geral</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Consolidado</DropdownMenuSubTrigger>
                             <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onClick={() => handleGenerateConsolidatedReport('pdf')}>Gerar PDF</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleGenerateConsolidatedReport('xlsx')}>Gerar Excel (XLSX)</DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Extintores</DropdownMenuSubTrigger>
                             <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onClick={() => handleGenerateExtinguishersReport('pdf')}>Gerar PDF</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleGenerateExtinguishersReport('xlsx')}>Gerar Excel (XLSX)</DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>
                         <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Mangueiras</DropdownMenuSubTrigger>
                             <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onClick={() => handleGenerateHosesReport('pdf')}>Gerar PDF</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleGenerateHosesReport('xlsx')}>Gerar Excel (XLSX)</DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>
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
            
            <ExpiryReportGenerator clientId={clientId} isMenuItem={true} />

        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
