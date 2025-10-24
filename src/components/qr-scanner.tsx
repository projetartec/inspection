
'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CameraOff, ThumbsUp, ThumbsDown, Edit } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useInspectionSession, type InspectedItem } from '@/hooks/use-inspection-session.tsx';
import type { Inspection, Extinguisher, Hydrant, ExtinguisherType, ExtinguisherWeight } from '@/lib/types';
import { extinguisherTypes, extinguisherWeights, getExtinguisherById } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Skeleton } from './ui/skeleton';


interface QrScannerProps {
  clientId: string;
  buildingId: string;
}

enum ScanMode {
  Scanning,
  ManualEntry,
  Result,
}

const extinguisherIssues = [
    "Pintura solo", "Sinalização", "Fixação", "Obstrução", "Lacre/Mangueira/Anel/manômetro"
];

const hoseIssues = [
    "Chave", "Esguicho", "Mangueira", "Abrigo", "Pintura de solo", 
    "Acrílico", "Sinalização"
];


export function QrScanner({ clientId, buildingId }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  
  const [mode, setMode] = useState<ScanMode>(ScanMode.Scanning);
  
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scannedItem, setScannedItem] = useState<Extinguisher | Hydrant | null>(null);
  const [isFetchingItem, setIsFetchingItem] = useState(false);
  const [manualId, setManualId] = useState('');
  const [notes, setNotes] = useState('');
  const [itemStatuses, setItemStatuses] = useState<{ [key: string]: 'OK' | 'N/C' }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // State for editable extinguisher data
  const [editableType, setEditableType] = useState<ExtinguisherType | undefined>();
  const [editableWeight, setEditableWeight] = useState<ExtinguisherWeight | undefined>();
  const [editableExpiry, setEditableExpiry] = useState<string | undefined>();
  
  const router = useRouter();
  const { toast } = useToast();
  const { session, addItemToInspection, startInspection } = useInspectionSession();

  // Ensure an inspection is active
  useEffect(() => {
    if (!session) {
      startInspection(clientId, buildingId);
    }
  }, [session, startInspection, clientId, buildingId]);

  useEffect(() => {
    if (mode !== ScanMode.Scanning || !readerRef.current || scanResult) return;

    const scanner = new Html5Qrcode('qr-reader-container');
    scannerRef.current = scanner;

    const onScanSuccess = async (decodedText: string) => {
      setScanResult(decodedText);
      setMode(ScanMode.Result);
      if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
        scanner.stop().catch(err => console.error("Falha ao parar o scanner", err));
      }

      // Fetch item details after scan
      if (decodedText.startsWith('fireguard-ext-')) {
          setIsFetchingItem(true);
          const extId = decodedText.replace('fireguard-ext-', '');
          try {
              const item = await getExtinguisherById(clientId, buildingId, extId);
              if (item) {
                  setScannedItem(item);
                  setEditableType(item.type);
                  setEditableWeight(item.weight);
                  setEditableExpiry(item.expiryDate);
              } else {
                 toast({ variant: 'destructive', title: 'Erro', description: 'Extintor não encontrado.' });
              }
          } catch (error) {
              console.error(error);
              toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao buscar dados do extintor.' });
          } finally {
              setIsFetchingItem(false);
          }
      }
    };
    
    const startScanner = async () => {
      try {
          await Html5Qrcode.getCameras();
          await scanner.start(
              { facingMode: "environment" },
              { fps: 10, qrbox: { width: 250, height: 250 } },
              onScanSuccess,
              (errorMessage) => { /* ignore */ }
          );
      } catch (err: any) {
          setCameraError(err.message || "Não foi possível acessar a câmera. Por favor, conceda permissão nas configurações do seu navegador.");
      }
    }

    if (scanner.getState() === Html5QrcodeScannerState.NOT_STARTED) {
      startScanner();
    }

    return () => {
      if (scannerRef.current && scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
        scannerRef.current.stop().catch(err => {/* ignore */});
      }
    };
  }, [mode, scanResult, clientId, buildingId, toast]);

  const resetState = () => {
    setScanResult(null);
    setScannedItem(null);
    setManualId('');
    setNotes('');
    setItemStatuses({});
    setIsSubmitting(false);
    setIsFetchingItem(false);
    setMode(ScanMode.Scanning);
  };

  const handleItemStatusChange = (itemName: string, status: 'OK' | 'N/C') => {
    setItemStatuses(prev => ({...prev, [itemName]: status}));
  };


  const handleLogInspection = async () => {
    if (mode === ScanMode.Result && !scanResult) return;
    if (mode === ScanMode.ManualEntry && !manualId) {
        toast({
            variant: 'destructive',
            title: 'ID Manual Obrigatório',
            description: 'Por favor, insira o ID do equipamento.'
        });
        return;
    }
    
    const itemType = (scannedItem as Extinguisher)?.type ? 'extinguisher' : (scannedItem as Hydrant)?.hoseType ? 'hose' : null;
    let overallStatus: Inspection['status'] = 'OK';
    
    if (itemType === 'extinguisher') {
        const hasNC = Object.values(itemStatuses).some(s => s === 'N/C');
        overallStatus = hasNC ? 'N/C' : 'OK';
    } else { // For hoses or other items
        overallStatus = itemStatuses.general === 'N/C' ? 'N/C' : 'OK';
        if(!itemStatuses.general) {
             toast({ variant: 'destructive', title: 'Status Obrigatório', description: 'Por favor, selecione "OK" ou "Não Conforme".' });
             return;
        }
    }
    
    if(mode === ScanMode.ManualEntry){
        overallStatus = 'N/C';
    }

    setIsSubmitting(true);
    
    const processInspection = (location?: GeolocationCoordinates) => {
        const itemIdentifier = mode === ScanMode.ManualEntry ? `manual:${manualId}` : scanResult;
        
        let finalNotes = notes;
        if (mode === ScanMode.ManualEntry) {
            finalNotes = `[REGISTRO MANUAL] ${notes}`;
        }
        
        const itemData: InspectedItem = {
            qrCodeValue: itemIdentifier!,
            date: new Date().toISOString(),
            notes: finalNotes,
            status: overallStatus,
            itemStatuses: itemStatuses,
            location: location ? {
                latitude: location.latitude,
                longitude: location.longitude,
            } : undefined
        };

        if (scannedItem && (scannedItem as Extinguisher).type && overallStatus === 'N/C') {
          const originalExtinguisher = scannedItem as Extinguisher;
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

        resetState();
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
  
  if (cameraError) {
    return (
      <Alert variant="destructive" className="max-w-md">
        <CameraOff className="h-4 w-4" />
        <AlertTitle>Erro na Câmera</AlertTitle>
        <AlertDescription>{cameraError}</AlertDescription>
      </Alert>
    );
  }

  if (mode === ScanMode.Result) {
    const itemType = (scannedItem as Extinguisher)?.type ? 'extinguisher' : (scannedItem as Hydrant)?.hoseType ? 'hose' : null;
    const issuesList = itemType === 'extinguisher' ? extinguisherIssues : hoseIssues;
    const isExtinguisher = itemType === 'extinguisher';

    return (
      <Card className="w-full max-w-md animate-in fade-in">
        <CardHeader>
          <CardTitle>Registrar Item Escaneado</CardTitle>
          <CardDescription>
            ID: <span className="font-mono bg-muted px-2 py-1 rounded">{scanResult?.replace('fireguard-ext-', '').replace('fireguard-hose-', '')}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto pr-3">
            {isFetchingItem ? (
                <div className="space-y-4 p-4 border rounded-md">
                    <Skeleton className="h-5 w-3/4"/>
                    <div className="grid grid-cols-3 gap-4">
                        <Skeleton className="h-10 w-full"/>
                        <Skeleton className="h-10 w-full"/>
                        <Skeleton className="h-10 w-full"/>
                    </div>
                </div>
            ) : isExtinguisher && scannedItem && (
                 <div className="space-y-3 p-4 border rounded-md">
                    <h4 className="font-medium text-sm mb-3">Dados do Equipamento</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                       <div className="space-y-2">
                           <Label htmlFor="insp-type">Tipo</Label>
                           <Select 
                                name="type" 
                                value={editableType}
                                onValueChange={(v) => setEditableType(v as ExtinguisherType)}
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
                           />
                       </div>
                    </div>
                </div>
            )}
            
            <div className="space-y-3 p-4 border rounded-md">
                <h4 className="font-medium text-sm">Checklist de Inspeção</h4>
                 {isExtinguisher ? (
                     issuesList.map(issue => (
                        <div key={issue} className="flex items-center justify-between">
                            <Label htmlFor={`issue-${issue.replace(/\s+/g, '-')}`} className="text-sm font-normal">
                                {issue}
                            </Label>
                            <div className="flex gap-2">
                                <Button size="sm" variant={itemStatuses[issue] === 'OK' ? 'default' : 'outline'} onClick={() => handleItemStatusChange(issue, 'OK')} className={cn("w-16", itemStatuses[issue] === 'OK' && "bg-green-600 hover:bg-green-700")}>
                                    <ThumbsUp className="mr-2 h-4 w-4" /> OK
                                </Button>
                                <Button size="sm" variant={itemStatuses[issue] === 'N/C' ? 'destructive' : 'outline'} onClick={() => handleItemStatusChange(issue, 'N/C')} className="w-16">
                                    <ThumbsDown className="mr-2 h-4 w-4" /> N/C
                                </Button>
                            </div>
                        </div>
                    ))
                 ) : (
                    <div className="grid grid-cols-2 gap-4">
                        <Button variant={itemStatuses.general === 'OK' ? 'default' : 'outline'} onClick={() => handleItemStatusChange('general', 'OK')} className={cn("h-16 text-lg", itemStatuses.general === 'OK' && "bg-green-600 hover:bg-green-700")}>
                            <ThumbsUp className="mr-2" /> OK
                        </Button>
                        <Button variant={itemStatuses.general === 'N/C' ? 'destructive' : 'outline'} onClick={() => handleItemStatusChange('general', 'N/C')} className="h-16 text-lg">
                            <ThumbsDown className="mr-2" /> N/C
                        </Button>
                    </div>
                 )}
            </div>

            <Textarea 
                placeholder="Adicionar notas (opcional)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
            />
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button onClick={handleLogInspection} disabled={isSubmitting || isFetchingItem} className="w-full">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar e Continuar
          </Button>
          <Button variant="outline" onClick={resetState} className="w-full">
            Escanear Novamente
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (mode === ScanMode.ManualEntry) {
     return (
        <Card className="w-full max-w-md animate-in fade-in">
            <CardHeader>
                <CardTitle>Registro Manual de Item</CardTitle>
                <CardDescription>
                    Use quando não for possível ler o QR code ou o item estiver faltando. O status será 'N/C'.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="manual-id">ID do Equipamento</Label>
                    <Input 
                        id="manual-id"
                        placeholder="Ex: EXT-102 ou Hidrante Corredor"
                        value={manualId}
                        onChange={(e) => setManualId(e.target.value)}
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="manual-notes">Motivo / Observações</Label>
                    <Textarea 
                        id="manual-notes"
                        placeholder="Ex: QR code danificado, Extintor faltando"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        required
                    />
                </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
                <Button onClick={handleLogInspection} disabled={isSubmitting || !notes || !manualId} className="w-full">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Registro Manual
                </Button>
                <Button variant="outline" onClick={resetState} className="w-full">
                    Voltar para o Scanner
                </Button>
            </CardFooter>
        </Card>
     );
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-4">
        <div id="qr-reader-container" ref={readerRef} className="w-full aspect-square bg-muted rounded-lg" />
        <Button variant="outline" onClick={() => setMode(ScanMode.ManualEntry)}>
            <Edit className="mr-2" />
            Não foi possível ler / Item Faltando
        </Button>
    </div>
  );
}
