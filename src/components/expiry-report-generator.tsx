
'use client';

import { useState } from 'react';
import { CalendarClock, FileDown, Loader2, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getExpiryReportDataAction } from '@/lib/actions';
import { generateExpiryPdfReport } from '@/lib/pdf';
import { generateExpiryXlsxReport } from '@/lib/csv';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
import { cn } from '@/lib/utils';

interface ExpiryReportGeneratorProps {
  clientId: string;
  buildingId?: string;
}

export function ExpiryReportGenerator({ clientId, buildingId }: ExpiryReportGeneratorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerateReport = async (month: number, year: number, format: 'pdf' | 'xlsx') => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const { client, buildings } = await getExpiryReportDataAction(clientId, buildingId, month, year);
      
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
    handleGenerateReport(now.getUTCMonth(), now.getUTCFullYear(), format);
  };
  
  const handleFutureMonthReport = (format: 'pdf' | 'xlsx') => {
    if (selectedMonth && selectedYear) {
        handleGenerateReport(parseInt(selectedMonth), parseInt(selectedYear), format);
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
      <div className="flex flex-wrap items-center justify-center gap-2">
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button disabled={isLoading} className="bg-report-expiry-current hover:bg-report-expiry-current/90 text-black">
                     {isLoading ? (
                        <Loader2 className="animate-spin h-4 w-4" />
                     ) : (
                        <>
                            <FileDown className="h-4 w-4 mr-2" />
                            <span>Vencem este Mês</span>
                            <ChevronDown className="h-4 w-4 ml-2" />
                        </>
                     )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleCurrentMonthReport('pdf')}>Gerar PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCurrentMonthReport('xlsx')}>Gerar Excel (XLSX)</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

        <Button disabled={isLoading} onClick={() => setIsModalOpen(true)} className="bg-report-expiry-future hover:bg-report-expiry-future/90 text-black">
             {isLoading ? (
                <Loader2 className="animate-spin h-4 w-4" />
             ) : (
                <>
                    <CalendarClock className="h-4 w-4 mr-2" />
                    <span>Vencimentos Futuros</span>
                </>
             )}
        </Button>
      </div>

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
