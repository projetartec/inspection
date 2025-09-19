import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { getHoseById } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { ptBR } from 'date-fns/locale';

export default async function HoseDetailPage({ params }: { params: { id: string } }) {
  const hose = await getHoseById(params.id);

  if (!hose) {
    notFound();
  }

  const isExpired = new Date(hose.expiryDate) < new Date();

  const details = [
    { label: 'Valor do QR Code', value: hose.qrCodeValue },
    { label: 'Tipo de Mangueira', value: `${hose.hoseType}"` },
    { label: 'Quantidade de Mangueiras', value: hose.quantity },
    { label: 'Quantidade de Chaves', value: hose.keyQuantity },
    { label: 'Quantidade de Bicos', value: hose.nozzleQuantity },
    { label: 'Data de Validade', value: format(new Date(hose.expiryDate), 'd \'de\' MMMM \'de\' yyyy', { locale: ptBR }) },
    { label: 'Status', value: <Badge variant={isExpired ? 'destructive' : 'secondary'}>{isExpired ? 'Vencido' : 'Ativo'}</Badge> },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title={`Sistema de Mangueira: ${hose.id}`} />
      
      <Card>
        <CardHeader>
          <CardTitle>Detalhes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {details.map(detail => (
              <div key={detail.label}>
                <p className="text-sm font-medium text-muted-foreground">{detail.label}</p>
                <p className="text-lg font-semibold">{detail.value}</p>
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
              {hose.inspections.length > 0 ? hose.inspections.map(insp => (
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
  );
}
