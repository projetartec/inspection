
"use client";

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
import type { Inspection } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';


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
    "Pintura de solo", "Sinalização", "Fixação", "Obstrução", "Lacre", 
    "Manômetro", "Rotulo", "Mangueira", "Anel"
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
  const [manualId, setManualId] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<Inspection['status'] | null>(null);
  const [checkedIssues, setCheckedIssues] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
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

    const onScanSuccess = (decodedText: string) => {
      setScanResult(decodedText);
      setMode(ScanMode.Result);
      if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
        scanner.stop().catch(err => console.error("Falha ao parar o scanner", err));
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
  }, [mode, scanResult]);

  const resetState = () => {
    setScanResult(null);
    setManualId('');
    setNotes('');
    setStatus(null);
    setCheckedIssues([]);
    setIsSubmitting(false);
    setMode(ScanMode.Scanning);
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

    const effectiveStatus = mode === ScanMode.ManualEntry ? 'N/C' : status;
    if (!effectiveStatus) {
         toast({
            variant: 'destructive',
            title: 'Status Obrigatório',
            description: 'Por favor, selecione "OK" ou "Não Conforme".'
        });
        return;
    }

    setIsSubmitting(true);
    
    const processInspection = (location?: GeolocationCoordinates) => {
        const itemIdentifier = mode === ScanMode.ManualEntry ? `manual:${manualId}` : scanResult;
        
        let finalNotes = notes;
        const isResultModeNC = mode === ScanMode.Result && status === 'N/C';
        const isManualMode = mode === ScanMode.ManualEntry;

        if (isResultModeNC && checkedIssues.length > 0) {
            const issuesText = `Itens não conformes: ${checkedIssues.join(', ')}.`;
            finalNotes = notes ? `${issuesText} | ${notes}` : issuesText;
        } else if (isManualMode) {
            finalNotes = `[REGISTRO MANUAL] ${notes}`;
        }
        
        const itemData: InspectedItem = {
            qrCodeValue: itemIdentifier!,
            date: new Date().toISOString(),
            notes: finalNotes,
            status: effectiveStatus,
            location: location ? {
                latitude: location.latitude,
                longitude: location.longitude,
            } : undefined
        };
        
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
    const itemType = scanResult?.includes('ext') ? 'extinguisher' : scanResult?.includes('hose') ? 'hose' : null;
    const issuesList = itemType === 'extinguisher' ? extinguisherIssues : hoseIssues;

    return (
      <Card className="w-full max-w-md animate-in fade-in">
        <CardHeader>
          <CardTitle>Registrar Item Escaneado</CardTitle>
          <CardDescription>
            ID do Equipamento: <span className="font-mono bg-muted px-2 py-1 rounded">{scanResult}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto pr-3">
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

            {status === 'N/C' && itemType && (
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
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button onClick={handleLogInspection} disabled={isSubmitting || !status} className="w-full">
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
