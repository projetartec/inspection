import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { getExtinguisherById } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { ptBR } from 'date-fns/locale';
import { QrCodeDisplay } from '@/components/qr-code-display';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Pencil } from 'lucide-react';

export default async function ExtinguisherDetailPage({ params }: { params: { clientId: string, buildingId: string, id: string } }) {
  const { clientId, buildingId, id } = params;
  const extinguisher = await getExtinguisherById(clientId, buildingId, id);

  if (!extinguisher) {
    notFound();
  }

  const isExpired = new Date(extinguisher.expiryDate) < new Date();

  const details = [
    { label: 'Valor do QR Code', value: extinguisher.qrCodeValue },
    { label: 'Tipo', value: extinguisher.type },
    { label: 'Peso', value: `${extinguisher.weight} kg` },
    { label: 'Data de Validade', value: format(new Date(extinguisher.expiryDate), 'd \'de\' MMMM \'de\' yyyy', { locale: ptBR }) },
    { label: 'Status', value: <Badge variant={isExpired ? 'destructive' : 'secondary'}>{isExpired ? 'Vencido' : 'Ativo'}</Badge> },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title={`Extintor: ${extinguisher.id}`}>
        <Button asChild variant="outline">
          <Link href={`/clients/${clientId}/${buildingId}/extinguishers/${extinguisher.id}/edit`}>
            <Pencil className="mr-2" />
            Editar
          </Link>
        </Button>
      </PageHeader>
      
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
            <Card>
                <CardHeader>
                <CardTitle>Detalhes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {details.map(detail => (
                    <div key={detail.label}>
                        <div className="text-sm font-medium text-muted-foreground">{detail.label}</div>
                        <div className="text-lg font-semibold">{detail.value}</div>
                    </div>
                    ))}
                </div>
                {extinguisher.observations && (
                    <>
                    <Separator />
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Observações</p>
                        <p className="text-base">{extinguisher.observations}</p>
                    </div>
                    </>
                )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                <CardTitle>Histórico de Inspeção</CardTitle>
                <CardDescription>Um registro de todas as inspeções para este equipamento.</CardDescription>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Localização (Lat, Lon)</TableHead>
                        <TableHead>Notas</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {extinguisher.inspections.length > 0 ? extinguisher.inspections.map(insp => (
                        <TableRow key={insp.id}>
                        <TableCell>{format(new Date(insp.date), 'Pp', { locale: ptBR })}</TableCell>
                        <TableCell>
                            {insp.location ? `${insp.location.latitude.toFixed(4)}, ${insp.location.longitude.toFixed(4)}` : 'N/A'}
                        </TableCell>
                        <TableCell>{insp.notes}</TableCell>
                        </TableRow>
                    )).reverse() : (
                        <TableRow>
                        <TableCell colSpan={3} className="text-center h-24">Nenhuma inspeção registrada.</TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
        </div>
        <div className="md:col-span-1">
            <QrCodeDisplay value={extinguisher.qrCodeValue} label={extinguisher.id} />
        </div>
      </div>
    </div>
  );
}
