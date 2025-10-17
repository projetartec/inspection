
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ThumbsUp, ThumbsDown, CheckCircle2, Loader2, Edit } from 'lucide-react';
import { useInspectionSession, type InspectedItem } from '@/hooks/use-inspection-session.tsx';
import type { Inspection, Extinguisher, Hydrant } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

type Item = Extinguisher | Hydrant;

interface InspectionListProps {
  items: Item[];
  type: 'extinguisher' | 'hose';
}

const extinguisherIssues = [
    "Pintura de solo", "Sinalização", "Fixação", "Obstrução", "Lacre", 
    "Manômetro", "Rotulo", "Mangueira", "Anel"
];

const hoseIssues = [
    "Chave", "Esguicho", "Mangueira", "Abrigo", "Pintura de solo", 
    "Acrílico", "Sinalização"
];

export function InspectionList({ items, type }: InspectionListProps) {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [status, setStatus] = useState<Inspection['status'] | null>(null);
  const [notes, setNotes] = useState('');
  const [checkedIssues, setCheckedIssues] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addItemToInspection, isItemInspected } = useInspectionSession();
  const { toast } = useToast();

  const handleOpenDialog = (item: Item) => {
    setSelectedItem(item);
    setStatus(null);
    setNotes('');
    setCheckedIssues([]);
  };

  const handleCloseDialog = () => {
    setSelectedItem(null);
  };
  
  const handleStatusChange = (newStatus: Inspection['status']) => {
    setStatus(newStatus);
    if (newStatus === 'OK') {
        setCheckedIssues([]); // Clear issues if status is OK
    }
  };

  const handleCheckboxChange = (issue: string, checked: boolean) => {
    setCheckedIssues(prev => 
        checked ? [...prev, issue] : prev.filter(i => i !== issue)
    );
  };

  const handleLogInspection = () => {
    if (!selectedItem || !status) {
      toast({
        variant: 'destructive',
        title: 'Status Obrigatório',
        description: 'Por favor, selecione "OK" ou "Não Conforme".',
      });
      return;
    }

    setIsSubmitting(true);

    const processInspection = (location?: GeolocationCoordinates) => {
      let finalNotes = notes;
      if (status === 'N/C' && checkedIssues.length > 0) {
        const issuesText = `Itens não conformes: ${checkedIssues.join(', ')}.`;
        finalNotes = notes ? `${issuesText} | ${notes}` : issuesText;
      }

      const itemData: InspectedItem = {
        qrCodeValue: selectedItem.qrCodeValue,
        date: new Date().toISOString(),
        notes: finalNotes,
        status,
        location: location ? { latitude: location.latitude, longitude: location.longitude } : undefined,
      };

      addItemToInspection(itemData);
      
      toast({
        title: 'Item Registrado',
        description: `${selectedItem.id} foi adicionado à inspeção.`,
      });

      setIsSubmitting(false);
      handleCloseDialog();
    };
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => processInspection(position.coords),
          (error) => {
            console.warn("Could not get GPS location, logging without it.", error);
            processInspection();
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    } else {
        processInspection();
    }
  };

  if (items.length === 0) {
    return <p className="text-center text-muted-foreground py-8">Nenhum equipamento deste tipo encontrado.</p>;
  }

  const issuesList = type === 'extinguisher' ? extinguisherIssues : hoseIssues;

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const inspected = isItemInspected(item.qrCodeValue);
        return (
          <Card key={item.id} className="flex items-center justify-between p-3">
            <div className="flex-1 overflow-hidden">
                <p className="font-bold truncate">{item.id}</p>
                <p className="text-sm text-muted-foreground truncate">
                    {type === 'extinguisher' ? (item as Extinguisher).observations : (item as Hydrant).location}
                </p>
            </div>
            <div className="ml-4">
                {inspected ? (
                    <Button variant="ghost" className="text-green-600 hover:text-green-700" onClick={() => handleOpenDialog(item)}>
                        <CheckCircle2 className="mr-2" /> Inspecionado
                    </Button>
                ) : (
                    <Button variant="outline" onClick={() => handleOpenDialog(item)}>
                        <Edit className="mr-2" /> Inspecionar
                    </Button>
                )}
            </div>
          </Card>
        );
      })}

      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Inspecionar: {selectedItem?.id}</DialogTitle>
            <DialogDescription>
              Selecione o status do equipamento e adicione notas se necessário.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4 overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={status === 'OK' ? 'default' : 'outline'}
                onClick={() => handleStatusChange('OK')}
                className={cn("h-16 text-lg", status === 'OK' && "bg-green-600 hover:bg-green-700")}
              >
                <ThumbsUp className="mr-2" /> OK
              </Button>
              <Button
                variant={status === 'N/C' ? 'destructive' : 'outline'}
                onClick={() => handleStatusChange('N/C')}
                className="h-16 text-lg"
              >
                <ThumbsDown className="mr-2" /> N/C
              </Button>
            </div>

            {status === 'N/C' && (
                <div className="space-y-3 p-4 border rounded-md">
                    <h4 className="font-medium text-sm">Selecione os itens não conformes:</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        {issuesList.map(issue => (
                            <div key={issue} className="flex items-center space-x-2">
                                <Checkbox 
                                    id={`issue-${issue.replace(/\s+/g, '-')}`} 
                                    onCheckedChange={(checked) => handleCheckboxChange(issue, !!checked)}
                                    checked={checkedIssues.includes(issue)}
                                />
                                <Label htmlFor={`issue-${issue.replace(/\s+/g, '-')}`} className="text-sm font-normal cursor-pointer">
                                    {issue}
                                </Label>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <Textarea
              placeholder="Adicionar notas (opcional)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
             <DialogClose asChild>
                <Button type="button" variant="secondary">
                    Cancelar
                </Button>
            </DialogClose>
            <Button onClick={handleLogInspection} disabled={isSubmitting || !status}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
