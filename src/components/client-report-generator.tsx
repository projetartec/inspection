
"use client";

import { useState } from 'react';
import { FileText, Loader2, ChevronDown, CalendarClock, FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getClientReportDataAction, getExpiryReportDataAction } from '@/lib/actions';
import { generateClientPdfReport, generateExpiryPdfReport } from '@/lib/pdf';
import { generateClientXlsxReport, generateExpiryXlsxReport } from '@/lib/csv';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


interface ClientReportGeneratorProps {
    clientId: string;
}

export function ClientReportGenerator({ clientId }: ClientReportGeneratorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
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

  const handleGenerateExpiryReport = async (month: number, year: number, format: 'pdf' | 'xlsx') => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 50));
    try {
      const { client, buildings } = await getExpiryReportDataAction(clientId, undefined, month, year);
      if (!client || !buildings) throw new Error("Dados do cliente ou locais não encontrados.");
      
      const expiringItems = buildings.flatMap(b => [
        ...(b.extinguishers || []).filter(e => e.expiryDate && new Date(e.expiryDate).getUTCMonth() === month && new Date(e.expiryDate).getUTCFullYear() === year),
        ...(b.hoses || []).filter(h => h.hydrostaticTestDate && new Date(h.hydrostaticTestDate).getUTCMonth() === month && new Date(h.hydrostaticTestDate).getUTCFullYear() === year)
      ]);

      if (expiringItems.length === 0) {
        toast({
          variant: "default",
          title: "Nenhum Item",
          description: `Nenhum item encontrado com vencimento em ${String(month + 1).padStart(2, '0')}/${year}.`
        });
        return;
      }
      if (format === 'pdf') {
        await generateExpiryPdfReport(client, buildings, month, year);
      } else {
        await generateExpiryXlsxReport(client, buildings, month, year);
      }
      toast({
        title: 'Sucesso!',
        description: `Relatório de vencimentos em ${format.toUpperCase()} gerado.`,
      });
    } catch (error: any) {
      console.error("Falha ao gerar relatório de vencimentos:", error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Falha ao gerar relatório de vencimentos.',
      });
    } finally {
      setIsLoading(false);
      setIsModalOpen(false);
      setSelectedMonth(null);
      setSelectedYear(null);
    }
  };

  const handleCurrentMonthReport = (format: 'pdf' | 'xlsx') => {
    const now = new Date();
    handleGenerateExpiryReport(now.getUTCMonth(), now.getUTCFullYear(), format);
  };
  
  const handleFutureMonthReport = (format: 'pdf' | 'xlsx') => {
    if (selectedMonth && selectedYear) {
        handleGenerateExpiryReport(parseInt(selectedMonth), parseInt(selectedYear), format);
    } else {
        toast({ variant: 'destructive', title: 'Seleção Incompleta', description: 'Por favor, selecione o mês e o ano.' });
    }
  };

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i);
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: new Date(0, i).toLocaleString('pt-BR', { month: 'long', timeZone: 'UTC' })
  }));

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
                  Relatórios Gerais
                  <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                    <FileText className="mr-2 h-4 w-4" />
                    <span>Relatório Consolidado</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => handleGenerateConsolidatedReport('pdf')}>Gerar PDF</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleGenerateConsolidatedReport('xlsx')}>Gerar Excel (XLSX)</DropdownMenuItem>
                    </DropdownMenuSubContent>
                </DropdownMenuPortal>
            </DropdownMenuSub>

            <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                    <FileDown className="mr-2 h-4 w-4" />
                    <span>Vencem este Mês</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => handleCurrentMonthReport('pdf')}>Gerar PDF</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCurrentMonthReport('xlsx')}>Gerar Excel (XLSX)</DropdownMenuItem>
                    </DropdownMenuSubContent>
                </DropdownMenuPortal>
            </DropdownMenuSub>
          
            <DropdownMenuItem onSelect={() => setIsModalOpen(true)}>
                <CalendarClock className="mr-2 h-4 w-4" />
                <span>Vencimentos Futuros</span>
            </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Relatório de Vencimentos Futuros</DialogTitle>
            <DialogDescription>
              Selecione o mês e o ano para gerar um relatório com todos os itens que vencem nesse período.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Select onValueChange={setSelectedMonth} value={selectedMonth ?? undefined}>
              <SelectTrigger><SelectValue placeholder="Selecione o Mês" /></SelectTrigger>
              <SelectContent>
                {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label.charAt(0).toUpperCase() + m.label.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select onValueChange={setSelectedYear} value={selectedYear ?? undefined}>
              <SelectTrigger><SelectValue placeholder="Selecione o Ano" /></SelectTrigger>
              <SelectContent>
                {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                 <Button disabled={!selectedMonth || !selectedYear}>
                    Gerar Relatório <ChevronDown className="h-4 w-4 ml-2" />
                 </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleFutureMonthReport('pdf')}>Gerar PDF</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleFutureMonthReport('xlsx')}>Gerar Excel (XLSX)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
