import { QrScanner } from '@/components/qr-scanner';
import { PageHeader } from '@/components/page-header';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ScanPage({ params }: { params: { clientId: string, buildingId: string } }) {
  const { clientId, buildingId } = params;

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
