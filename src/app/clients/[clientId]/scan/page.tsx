
'use client';

import { QrScanner } from '@/components/qr-scanner';
import { PageHeader } from '@/components/page-header';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useParams } from 'next/navigation';
import { useInspectionSession } from '@/hooks/use-inspection-session.tsx';
import { useEffect } from 'react';

export default function ScanPage() {
  const params = useParams() as { clientId: string, buildingId: string };
  const { clientId, buildingId } = params;
  const { startInspection } = useInspectionSession();

  // Ensure the session is started for this building when the page loads
  useEffect(() => {
    startInspection(clientId, buildingId);
  }, [startInspection, clientId, buildingId]);

  return (
    <div className="flex flex-col items-center gap-8">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
            <CardTitle className="font-headline text-2xl">Escanear QR Code do Equipamento</CardTitle>
            <CardDescription>Posicione o QR code dentro do quadro para começar.</CardDescription>
        </CardHeader>
      </Card>
      <QrScanner clientId={clientId} buildingId={buildingId} />
    </div>
  );
}
