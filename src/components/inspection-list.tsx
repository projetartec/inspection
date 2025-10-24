
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ThumbsUp, ThumbsDown, CheckCircle2, Loader2, Edit } from 'lucide-react';
import { useInspectionSession, type InspectedItem } from '@/hooks/use-inspection-session.tsx';
import type { Inspection, Extinguisher, Hydrant, ExtinguisherType, ExtinguisherWeight } from '@/lib/types';
import { extinguisherTypes, extinguisherWeights } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

type Item = Extinguisher | Hydrant;

interface InspectionListProps {
  items: Item[];
  type: 'extinguisher' | 'hose';
}

const extinguisherIssues = [
    "Pintura solo", "Sinalização", "Fixação", "Obstrução", "Lacre/Mangueira/Anel/manômetro"
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

  // State for editable extinguisher data
  const [editableType, setEditableType] = useState<ExtinguisherType | undefined>();
  const [editableWeight, setEditableWeight] = useState<ExtinguisherWeight | undefined>();
  const [editableExpiry, setEditableExpiry] = useState<string | undefined>();

  const { addItemToInspection, isItemInspected } = useInspectionSession();
  const { toast } = useToast();

  const handleOpenDialog = (item: Item) => {
    setSelectedItem(item);
    setStatus(null);
    setNotes('');
    setCheckedIssues([]);
    if (type === 'extinguisher') {
      const ext = item as Extinguisher;
      setEditableType(ext.type);
      setEditableWeight(ext.weight);
      setEditableExpiry(ext.expiryDate);
    }
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
    
    const effectiveStatus = (status === 'N/C' && checkedIssues.length > 0) ? 'N/C' : 'OK';

    const processInspection = (location?: GeolocationCoordinates) => {
      const itemData: InspectedItem = {
        qrCodeValue: selectedItem.qrCodeValue,
        date: new Date().toISOString(),
        notes: notes,
        status: effectiveStatus,
        checkedIssues: effectiveStatus === 'N/C' ? checkedIssues : [],
        location: location ? { latitude: location.latitude, longitude: location.longitude } : undefined,
      };

      // Include updated extinguisher data if applicable
      if (type === 'extinguisher' && status === 'N/C') {
        const originalExtinguisher = selectedItem as Extinguisher;
        const updatedData: Partial<Extinguisher> = {};
        if (editableType !== originalExtinguisher.type) updatedData.type = editableType;
        if (editableWeight !== originalExtinguisher.weight) updatedData.weight = editableWeight;
        if (editableExpiry !== originalExtinguisher.expiryDate) updatedData.expiryDate = editableExpiry;

        if (Object.keys(updatedData).length > 0) {
            itemData.updatedData = {
                id: originalExtinguisher.id,
                ...updatedData
            };
        }
      }

      addItemToInspection(itemData);
      
      setIsSubmitting(false);
      handleCloseDialog();
    };
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => processInspection(position.coords),
          (error) => {
            console.warn("Could not get GPS location, logging without it.", error);
            toast({
              variant: 'default',
              title: 'Aviso de Localização',
              description: 'Não foi possível obter a localização GPS. Registrando item sem ela.'
            });
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
  const currentExtinguisher = selectedItem as Extinguisher;

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
                    <Button variant="ghost" className="text-green-600 hover:bg-green-600/10 hover:text-green-700" onClick={() => handleOpenDialog(item)}>
                        <CheckCircle2 className="mr-2" /> Inspecionado
                    </Button>
                ) : (
                    <Button variant="outline" onClick={() => handleOpenDialog(item)}>
                        <Edit className="mr-2 h-4 w-4" /> Inspecionar
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
            
            {type === 'extinguisher' && selectedItem && (
                 <div className="space-y-3 p-4 border rounded-md">
                    <h4 className="font-medium text-sm mb-3">Dados do Equipamento</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                       <div className="space-y-2">
                           <Label htmlFor="insp-type">Tipo</Label>
                           <Select 
                                name="type" 
                                value={editableType}
                                onValueChange={(v) => setEditableType(v as ExtinguisherType)}
                                disabled={status !== 'N/C'}
                            >
                                <SelectTrigger id="insp-type"><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    {extinguisherTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                           </Select>
                       </div>
                       <div className="space-y-2">
                           <Label htmlFor="insp-weight">Capacidade</Label>
                           <Select 
                                name="weight"
                                value={String(editableWeight)}
                                onValueChange={(v) => setEditableWeight(Number(v) as ExtinguisherWeight)}
                                disabled={status !== 'N/C'}
                            >
                                <SelectTrigger id="insp-weight"><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    {extinguisherWeights.map((w) => <SelectItem key={w} value={String(w)}>{w} kg</SelectItem>)}
                                </SelectContent>
                           </Select>
                       </div>
                       <div className="space-y-2">
                           <Label htmlFor="insp-expiry">Recarga</Label>
                           <Input
                             id="insp-expiry"
                             name="expiryDate"
                             type="date"
                             value={editableExpiry}
                             onChange={(e) => setEditableExpiry(e.target.value)}
                             disabled={status !== 'N/C'}
                           />
                       </div>
                    </div>
                </div>
            )}

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
