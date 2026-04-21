
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getBackupDataAction, restoreBackupAction } from '@/lib/actions';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Download, Upload, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface BackupManagerProps {
  clientId?: string;
  isGlobal?: boolean;
}

export function BackupManager({ clientId, isGlobal = false }: BackupManagerProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const backupData = await getBackupDataAction(clientId);
      const blob = new Blob([backupData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');

      const clientName = isGlobal ? 'GERAL' : clientId || 'cliente';
      const date = new Date().toISOString().split('T')[0];
      a.download = `backup_${clientName}_${date}.json`;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Exportação Concluída',
        description: 'Arquivo de backup salvo com sucesso.',
      });
    } catch (error: any) {
      console.error('Export failed:', error);
      toast({
        variant: 'destructive',
        title: 'Erro na Exportação',
        description: error.message,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      if (!content) {
        toast({
          variant: 'destructive',
          title: 'Erro de Leitura',
          description: 'Não foi possível ler o arquivo de backup.',
        });
        return;
      }
      
      setIsImporting(true);
      try {
        await restoreBackupAction(content);
        toast({
          title: 'Importação Concluída',
          description: 'Os dados do backup foram carregados. A página será atualizada em instantes.',
        });
        // Reload after a short delay to allow toast to show and data to propagate.
        setTimeout(() => window.location.reload(), 2000);
      } catch (error: any) {
        console.error('Import failed:', error);
        toast({
          variant: 'destructive',
          title: 'Erro na Importação',
          description: error.message,
        });
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);

    // Reset file input
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const exportLabel = isGlobal ? 'Exportar Backup Geral' : 'Exportar Backup do Cliente';
  const importLabel = 'Carregar Backup';

  if(isGlobal) {
    return (
        <>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".json" className="hidden" />
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleExport(); }} disabled={isExporting}>
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                <span>{exportLabel}</span>
            </DropdownMenuItem>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                     <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={isImporting}>
                        {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        <span>{importLabel}</span>
                    </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação irá carregar os dados do arquivo de backup. Dados existentes com o mesmo ID serão atualizados e novos dados serão adicionados. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={triggerFileSelect}>Continuar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
  }

  // For Client Sidebar (not dropdown items)
  return (
    <div className="space-y-2">
        <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".json" className="hidden" />
        <Button 
            variant="outline" 
            className="w-full justify-center group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:p-0"
            onClick={handleExport}
            disabled={isExporting}
        >
            {isExporting ? <Loader2 className="animate-spin" /> : <Download />}
            <span className="group-data-[collapsible=icon]:hidden ml-2">{exportLabel}</span>
        </Button>
         <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button 
                    variant="outline" 
                    className="w-full justify-center group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:p-0"
                    disabled={isImporting}
                >
                    {isImporting ? <Loader2 className="animate-spin" /> : <Upload />}
                    <span className="group-data-[collapsible=icon]:hidden ml-2">{importLabel}</span>
                </Button>
            </AlertDialogTrigger>
             <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta ação irá carregar os dados do arquivo de backup. Dados existentes com o mesmo ID serão atualizados e novos dados serão adicionados. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={triggerFileSelect}>Continuar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );

}
