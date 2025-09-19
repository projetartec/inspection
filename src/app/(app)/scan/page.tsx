import { QrScanner } from '@/components/qr-scanner';
import { PageHeader } from '@/components/page-header';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ScanPage() {
  return (
    <div className="flex flex-col items-center gap-8">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
            <CardTitle className="font-headline text-2xl">Scan Equipment QR Code</CardTitle>
            <CardDescription>Position the QR code within the frame to begin.</CardDescription>
        </CardHeader>
      </Card>
      <QrScanner />
    </div>
  );
}
