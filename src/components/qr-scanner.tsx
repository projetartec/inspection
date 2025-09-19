'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { logInspectionAction } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CameraOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function QrScanner() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    const onScanSuccess = (decodedText: string) => {
      if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
        scanner.stop().catch(err => console.error("Falha ao parar o scanner", err));
      }
      setScanResult(decodedText);
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
    
    startScanner();

    return () => {
      if (scannerRef.current && scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
        scannerRef.current.stop().catch(err => console.error("Falha ao parar o scanner na limpeza", err));
      }
    };
  }, []);

  const handleLogInspection = async () => {
    if (!scanResult) return;
    setIsSubmitting(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        const result = await logInspectionAction(scanResult, notes, location);
        
        if (result?.message) {
          toast({ variant: 'destructive', title: 'Erro', description: result.message });
          setIsSubmitting(false);
        } else if (result?.redirectUrl) {
          toast({ title: 'Sucesso', description: 'Inspeção registrada com sucesso!' });
          router.push(result.redirectUrl);
        }
      },
      async (error) => {
        // If location fails, log without it but warn the user.
        toast({
          variant: 'destructive',
          title: 'Aviso de Localização',
          description: 'Não foi possível obter a localização GPS. Registrando inspeção sem ela.'
        });
        const result = await logInspectionAction(scanResult, notes);
        if (result?.message) {
          toast({ variant: 'destructive', title: 'Erro', description: result.message });
        } else if (result?.redirectUrl) {
          toast({ title: 'Sucesso', description: 'Inspeção registrada com sucesso!' });
          router.push(result.redirectUrl);
        }
        setIsSubmitting(false);
      },
      { enableHighAccuracy: true }
    );
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
          <CardTitle>Registrar Inspeção</CardTitle>
          <CardDescription>
            ID do Equipamento Escaneado: <span className="font-mono bg-muted px-2 py-1 rounded">{scanResult}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea 
            placeholder="Adicionar notas de observação..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
          />
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button onClick={handleLogInspection} disabled={isSubmitting} className="w-full">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar Inspeção
          </Button>
          <Button variant="outline" onClick={() => { setScanResult(null); router.refresh(); }} className="w-full">
            Escanear Outro
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return <div id="qr-reader" className="w-full max-w-md aspect-square bg-muted rounded-lg" />;
}
