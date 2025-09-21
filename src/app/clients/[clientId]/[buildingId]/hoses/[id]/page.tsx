
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { getHoseById } from '@/lib/data';
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

export default async function HoseDetailPage({ params }: { params: { clientId: string, buildingId: string, id: string } }) {
  const { clientId, buildingId, id } = params;
  const hose = await getHoseById(clientId, buildingId, id);

  if (!hose) {
    notFound();
  }

  const dateValue = hose.expiryDate && typeof (hose.expiryDate as any).toDate === 'function' ? (hose.expiryDate as any).toDate() : new Date(hose.expiryDate);
  const isValidDate = dateValue && !isNaN(dateValue.getTime());
  const isExpired = isValidDate ? dateValue < new Date() : false;

  const details = [
    { label: 'Valor do QR Code', value: hose.qrCodeValue },
    { label: 'Tipo de Mangueira', value: `${hose.hoseType}"` },
    { label: 'Quantidade de Mangueiras', value: hose.quantity },
    { label: 'Quantidade de Chaves', value: hose.keyQuantity },
    { label: 'Quantidade de Bicos', value: hose.nozzleQuantity },
    { label: 'Data de Validade', value: isValidDate ? format(dateValue, 'd \'de\' MMMM \'de\' yyyy', { locale: ptBR }) : 'Data inválida' },
    { label: 'Status', value: <Badge variant={isExpired ? 'destructive' : 'secondary'}>{isExpired ? 'Vencido' : 'Ativo'}</Badge> },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title={`Sistema de Mangueira: ${hose.id}`}>
        <Button asChild variant="outline">
          <Link href={`/clients/${clientId}/${buildingId}/hoses/${hose.id}/edit`}>
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
                {hose.observations && (
                    <>
                    <Separator />
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Observações</p>
                        <p className="text-base">{hose.observations}</p>
                    </div>
                    </>
                )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                <CardTitle>Histórico de Inspeção</CardTitle>
                <CardDescription>Um registro de todas as inspeções para este sistema.</CardDescription>
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
                    {hose.inspections && hose.inspections.length > 0 ? hose.inspections.map(insp => (
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
            <QrCodeDisplay value={hose.qrCodeValue} label={hose.id} />
        </div>
      </div>
    </div>
  );
}
