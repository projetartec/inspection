
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { CheckCircle2, Loader2, Edit, ChevronDown, Check } from 'lucide-react';
import { useInspectionSession, type InspectedItem } from '@/hooks/use-inspection-session.tsx';
import type { Inspection, Extinguisher, Hydrant, ExtinguisherType, ExtinguisherWeight, HydrantDiameter, HydrantHoseLength, HydrantHoseType, HydrantKeyQuantity, HydrantNozzleQuantity, HydrantQuantity } from '@/lib/types';
import { extinguisherTypes, extinguisherWeights, hydrantDiameters, hydrantHoseLengths, hydrantTypes, hydrantKeyQuantities, hydrantNozzleQuantities, hydrantQuantities } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

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
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemStatuses, setItemStatuses] = useState<{ [key: string]: 'OK' | 'N/C' }>({});
  const [isDataAccordionOpen, setIsDataAccordionOpen] = useState(false);

  // Editable fields for extinguisher
  const [editableType, setEditableType] = useState<ExtinguisherType | undefined>();
  const [editableWeight, setEditableWeight] = useState<ExtinguisherWeight | undefined>();
  const [editableExpiry, setEditableExpiry] = useState<string | undefined>();

  // Editable fields for hose
  const [editableHoseLocation, setEditableHoseLocation] = useState<string | undefined>();
  const [editableHoseQuantity, setEditableHoseQuantity] = useState<HydrantQuantity | undefined>();
  const [editableHoseType, setEditableHoseType] = useState<HydrantHoseType | undefined>();
  const [editableHoseDiameter, setEditableHoseDiameter] = useState<HydrantDiameter | undefined>();
  const [editableHoseLength, setEditableHoseLength] = useState<HydrantHoseLength | undefined>();
  const [editableHoseKeyQuantity, setEditableHoseKeyQuantity] = useState<HydrantKeyQuantity | undefined>();
  const [editableHoseNozzleQuantity, setEditableHoseNozzleQuantity] = useState<HydrantNozzleQuantity | undefined>();
  const [editableHoseTestDate, setEditableHoseTestDate] = useState<string | undefined>();


  const { addItemToInspection, isItemInspected } = useInspectionSession();
  const { toast } = useToast();

  const handleOpenDialog = (item: Item) => {
    setSelectedItem(item);
    setNotes('');
    setItemStatuses({});
    setIsDataAccordionOpen(false); // Reset accordion state

    if (type === 'extinguisher') {
      const ext = item as Extinguisher;
      setEditableType(ext.type);
      setEditableWeight(ext.weight);
      setEditableExpiry(ext.expiryDate);
    } else {
        const hose = item as Hydrant;
        setEditableHoseLocation(hose.location);
        setEditableHoseQuantity(hose.quantity);
        setEditableHoseType(hose.hoseType);
        setEditableHoseDiameter(hose.diameter);
        setEditableHoseLength(hose.hoseLength);
        setEditableHoseKeyQuantity(hose.keyQuantity);
        setEditableHoseNozzleQuantity(hose.nozzleQuantity);
        setEditableHoseTestDate(hose.hydrostaticTestDate);
    }
  };

  const handleCloseDialog = () => {
    setSelectedItem(null);
  };
  
  const handleItemStatusChange = (itemName: string, status: 'OK' | 'N/C') => {
    setItemStatuses(prev => ({ ...prev, [itemName]: status }));
  };

  const handleSelectAllOk = () => {
    const allOkStatuses = issuesList.reduce((acc, issue) => {
        acc[issue] = 'OK';
        return acc;
    }, {} as { [key: string]: 'OK' | 'N/C' });
    setItemStatuses(allOkStatuses);
  };

  const handleLogInspection = () => {
    if (!selectedItem) return;

    setIsSubmitting(true);
    
    // Determine overall status
    const hasNC = Object.values(itemStatuses).some(s => s === 'N/C');
    const allItemsChecked = issuesList.every(issue => itemStatuses[issue]);
    
    if (!allItemsChecked) {
         toast({
            variant: 'destructive',
            title: 'Checklist Incompleto',
            description: 'Por favor, marque o status de todos os itens.'
        });
        setIsSubmitting(false);
        return;
    }

    const overallStatus = hasNC ? 'N/C' : 'OK';

    const processInspection = (location?: GeolocationCoordinates) => {
      const itemData: InspectedItem = {
        qrCodeValue: selectedItem.qrCodeValue,
        date: new Date().toISOString(),
        notes: notes,
        status: overallStatus,
        itemStatuses: itemStatuses,
        location: location ? { latitude: location.latitude, longitude: location.longitude } : undefined,
      };

      if (overallStatus === 'N/C') {
        if (type === 'extinguisher') {
            const originalExtinguisher = selectedItem as Extinguisher;
            const updatedData: Partial<Extinguisher> = {};
            if (editableType !== originalExtinguisher.type) updatedData.type = editableType;
            if (editableWeight !== originalExtinguisher.weight) updatedData.weight = editableWeight;
            if (editableExpiry !== originalExtinguisher.expiryDate) updatedData.expiryDate = editableExpiry;

            if (Object.keys(updatedData).length > 0) {
                itemData.updatedData = { id: originalExtinguisher.id, ...updatedData };
            }
        } else if (type === 'hose') {
            const originalHose = selectedItem as Hydrant;
            const updatedData: Partial<Hydrant> = {};
            if (editableHoseLocation !== originalHose.location) updatedData.location = editableHoseLocation;
            if (editableHoseQuantity !== originalHose.quantity) updatedData.quantity = editableHoseQuantity;
            if (editableHoseType !== originalHose.hoseType) updatedData.hoseType = editableHoseType;
            if (editableHoseDiameter !== originalHose.diameter) updatedData.diameter = editableHoseDiameter;
            if (editableHoseLength !== originalHose.hoseLength) updatedData.hoseLength = editableHoseLength;
            if (editableHoseKeyQuantity !== originalHose.keyQuantity) updatedData.keyQuantity = editableHoseKeyQuantity;
            if (editableHoseNozzleQuantity !== originalHose.nozzleQuantity) updatedData.nozzleQuantity = editableHoseNozzleQuantity;
            if (editableHoseTestDate !== originalHose.hydrostaticTestDate) updatedData.hydrostaticTestDate = editableHoseTestDate;

            if (Object.keys(updatedData).length > 0) {
                itemData.updatedData = { id: originalHose.id, ...updatedData };
            }
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
              Verifique os dados do equipamento e o status de cada item.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4 overflow-y-auto pr-2">
             <Accordion type="single" collapsible value={isDataAccordionOpen ? "data" : ""} onValueChange={(v) => setIsDataAccordionOpen(v === "data")}>
                <AccordionItem value="data" className="border rounded-md px-4">
                    <AccordionTrigger className="py-3 text-sm font-medium">
                        <div className="flex items-center gap-2">
                           <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                            Dados do Equipamento
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4">
                        {type === 'extinguisher' && selectedItem && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                                <div className="space-y-2">
                                    <Label htmlFor="insp-type">Tipo</Label>
                                    <Select name="type" value={editableType} onValueChange={(v) => setEditableType(v as ExtinguisherType)}>
                                        <SelectTrigger id="insp-type"><SelectValue/></SelectTrigger>
                                        <SelectContent>{extinguisherTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="insp-weight">Capacidade</Label>
                                    <Select name="weight" value={String(editableWeight)} onValueChange={(v) => setEditableWeight(Number(v) as ExtinguisherWeight)}>
                                        <SelectTrigger id="insp-weight"><SelectValue/></SelectTrigger>
                                        <SelectContent>{extinguisherWeights.map((w) => <SelectItem key={w} value={String(w)}>{w} kg</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="insp-expiry">Recarga</Label>
                                    <Input id="insp-expiry" name="expiryDate" type="date" value={editableExpiry} onChange={(e) => setEditableExpiry(e.target.value)} />
                                </div>
                                </div>
                            </div>
                        )}
                        {type === 'hose' && selectedItem && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2"> <Label>Local</Label> <Input value={editableHoseLocation} onChange={e => setEditableHoseLocation(e.target.value)} /> </div>
                                    <div className="space-y-2"> <Label>Qtd Mangueiras</Label> <Select value={String(editableHoseQuantity)} onValueChange={v => setEditableHoseQuantity(Number(v) as HydrantQuantity)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{hydrantQuantities.map(q => <SelectItem key={q} value={String(q)}>{q}</SelectItem>)}</SelectContent></Select> </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2"> <Label>Tipo</Label> <Select value={editableHoseType} onValueChange={v => setEditableHoseType(v as HydrantHoseType)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{hydrantTypes.map(t => <SelectItem key={t} value={t}>Tipo {t}</SelectItem>)}</SelectContent></Select> </div>
                                    <div className="space-y-2"> <Label>Diâmetro</Label> <Select value={editableHoseDiameter} onValueChange={v => setEditableHoseDiameter(v as HydrantDiameter)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{hydrantDiameters.map(d => <SelectItem key={d} value={d}>{d}"</SelectItem>)}</SelectContent></Select> </div>
                                    <div className="space-y-2"> <Label>Medida</Label> <Select value={String(editableHoseLength)} onValueChange={v => setEditableHoseLength(Number(v) as HydrantHoseLength)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{hydrantHoseLengths.map(l => <SelectItem key={l} value={String(l)}>{l}m</SelectItem>)}</SelectContent></Select> </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2"> <Label>Qtd Chaves</Label> <Select value={String(editableHoseKeyQuantity)} onValueChange={v => setEditableHoseKeyQuantity(Number(v) as HydrantKeyQuantity)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{hydrantKeyQuantities.map(q => <SelectItem key={q} value={String(q)}>{q}</SelectItem>)}</SelectContent></Select> </div>
                                    <div className="space-y-2"> <Label>Qtd Esguichos</Label> <Select value={String(editableHoseNozzleQuantity)} onValueChange={v => setEditableHoseNozzleQuantity(Number(v) as HydrantNozzleQuantity)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{hydrantNozzleQuantities.map(q => <SelectItem key={q} value={String(q)}>{q}</SelectItem>)}</SelectContent></Select> </div>
                                    <div className="space-y-2"> <Label>Próx. Teste</Label> <Input type="date" value={editableHoseTestDate} onChange={e => setEditableHoseTestDate(e.target.value)} /> </div>
                                </div>
                            </div>
                        )}
                    </AccordionContent>
                </AccordionItem>
            </Accordion>


            <div className="space-y-3 p-4 border rounded-md">
                <div className="flex justify-between items-center">
                    <h4 className="font-medium text-sm">Checklist de Inspeção</h4>
                    <Button variant="outline" size="sm" onClick={handleSelectAllOk}>
                        <Check className="mr-2 h-4 w-4" />
                        OK em Todos
                    </Button>
                </div>
                {issuesList.map(issue => (
                    <div key={issue} className="flex items-center justify-between">
                        <Label htmlFor={`issue-${issue.replace(/\s+/g, '-')}`} className="text-sm font-normal">
                            {issue}
                        </Label>
                        <div className="flex gap-2">
                             <Button
                                size="sm"
                                variant={itemStatuses[issue] === 'OK' ? 'default' : 'outline'}
                                onClick={() => handleItemStatusChange(issue, 'OK')}
                                className={cn("w-16", itemStatuses[issue] === 'OK' && "bg-green-600 hover:bg-green-700")}
                            >
                                OK
                            </Button>
                             <Button
                                size="sm"
                                variant={itemStatuses[issue] === 'N/C' ? 'destructive' : 'outline'}
                                onClick={() => handleItemStatusChange(issue, 'N/C')}
                                className="w-16"
                            >
                                N/C
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

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
            <Button onClick={handleLogInspection} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    