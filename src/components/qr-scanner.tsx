
"use client";

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CameraOff, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useInspectionSession, type InspectedItem } from '@/hooks/use-inspection-session.tsx';
import type { Inspection } from '@/lib/types';
import { cn } from '@/lib/utils';

interface QrScannerProps {
  clientId: string;
  buildingId: string;
}

export function QrScanner({ clientId, buildingId }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<Inspection['status'] | null>(null);
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
    if (!readerRef.current || scanResult) return;

    const scanner = new Html5Qrcode('qr-reader-container');
    scannerRef.current = scanner;

    const onScanSuccess = (decodedText: string) => {
      setScanResult(decodedText);
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

    // Only start if not already scanning and element is in DOM
    if (scanner.getState() === Html5QrcodeScannerState.NOT_STARTED) {
      startScanner();
    }

    return () => {
      if (scannerRef.current && scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
        scannerRef.current.stop().catch(err => {/* ignore */});
      }
    };
  }, [scanResult]);

  const handleLogInspection = async () => {
    if (!scanResult || !status) {
        toast({
            variant: 'destructive',
            title: 'Status Obrigatório',
            description: 'Por favor, selecione "OK" ou "Não Conforme".'
        });
        return;
    }
    setIsSubmitting(true);
    
    const processInspection = (location?: GeolocationCoordinates) => {
        const itemData: InspectedItem = {
            qrCodeValue: scanResult,
            date: new Date().toISOString(),
            notes,
            status,
            location: location ? {
                latitude: location.latitude,
                longitude: location.longitude,
            } : undefined
        };
        
        addItemToInspection(itemData);
        
        toast({
            title: 'Item Registrado',
            description: `Item ${scanResult} adicionado à inspeção com status ${status}.`,
        });

        // Reset for next scan
        setScanResult(null);
        setNotes('');
        setStatus(null);
        setIsSubmitting(false);
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

  if (scanResult) {
    return (
      <Card className="w-full max-w-md animate-in fade-in">
        <CardHeader>
          <CardTitle>Registrar Item</CardTitle>
          <CardDescription>
            ID do Equipamento: <span className="font-mono bg-muted px-2 py-1 rounded">{scanResult}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                 <Button 
                    variant={status === 'OK' ? 'default' : 'outline'}
                    onClick={() => setStatus('OK')}
                    className={cn("h-16 text-lg", status === 'OK' && "bg-green-600 hover:bg-green-700")}
                 >
                    <ThumbsUp className="mr-2" /> OK
                 </Button>
                 <Button 
                    variant={status === 'N/C' ? 'destructive' : 'outline'}
                    onClick={() => setStatus('N/C')}
                    className="h-16 text-lg"
                >
                    <ThumbsDown className="mr-2" /> N/C
                 </Button>
            </div>
            <Textarea 
                placeholder="Adicionar notas de observação (opcional)..."
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
          <Button variant="outline" onClick={() => { setScanResult(null); setStatus(null); }} className="w-full">
            Escanear Novamente
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return <div id="qr-reader-container" ref={readerRef} className="w-full max-w-md aspect-square bg-muted rounded-lg" />;
}
