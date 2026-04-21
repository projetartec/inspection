
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getBackupDataAction, restoreBackupAction } from '@/lib/actions';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Download, Upload, Loader2, DatabaseBackup, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  buildingId?: string;
  displayMode: 'global' | 'client' | 'building';
}

export function BackupManager({ clientId, buildingId, displayMode }: BackupManagerProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const backupData = await getBackupDataAction(clientId, buildingId);
      const blob = new Blob([backupData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');

      const date = new Date().toISOString().split('T')[0];
      let filename = `backup_${date}.json`;
      if (displayMode === 'building' && buildingId) {
        filename = `backup_predio_${buildingId}_${date}.json`;
      } else if (displayMode === 'client' && clientId) {
        filename = `backup_cliente_${clientId}_${date}.json`;
      } else if (displayMode === 'global') {
        filename = `backup_GERAL_${date}.json`;
      }

      a.download = filename;
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

    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const isLoading = isExporting || isImporting;

  if(displayMode === 'global') {
    return (
        <>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".json" className="hidden" />
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleExport(); }} disabled={isExporting}>
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                <span>Exportar Backup Geral</span>
            </DropdownMenuItem>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                     <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={isImporting}>
                        {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        <span>Carregar Backup</span>
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

  if (displayMode === 'building') {
      return (
        <div className="space-y-2">
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".json" className="hidden" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button
                      disabled={isLoading}
                      className="justify-center w-full group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:p-0"
                      variant='outline'
                  >
                      {isLoading ? (
                          <Loader2 className="animate-spin h-4 w-4" />
                      ) : (
                          <DatabaseBackup className="h-4 w-4" />
                      )}
                      <span className="group-data-[collapsible=icon]:hidden ml-2">Backup</span>
                      <ChevronDown className="h-4 w-4 ml-auto group-data-[collapsible=icon]:hidden" />
                  </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onSelect={handleExport} disabled={isExporting}>
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    <span>Exportar Backup do Prédio</span>
                </DropdownMenuItem>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                         <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={isImporting}>
                            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            <span>Carregar Backup</span>
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
  }

  // displayMode === 'client'
  return (
    <div className="space-y-2">
        <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".json" className="hidden" />
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    disabled={isLoading}
                    className="justify-center w-full group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:p-0"
                    variant='outline'
                >
                    {isLoading ? (
                        <Loader2 className="animate-spin h-4 w-4" />
                    ) : (
                        <DatabaseBackup className="h-4 w-4" />
                    )}
                    <span className="group-data-[collapsible=icon]:hidden ml-2">Backup</span>
                    <ChevronDown className="h-4 w-4 ml-auto group-data-[collapsible=icon]:hidden" />
                </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onSelect={handleExport} disabled={isExporting}>
                  {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  <span>Exportar</span>
              </DropdownMenuItem>
              <AlertDialog>
                  <AlertDialogTrigger asChild>
                       <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={isImporting}>
                          {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                          <span>Importar</span>
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
          </DropdownMenuContent>
        </DropdownMenu>
    </div>
  );

}
