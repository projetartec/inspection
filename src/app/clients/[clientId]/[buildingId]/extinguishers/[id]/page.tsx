
import { notFound } from 'next/navigation';
import { format, parseISO } from 'date-fns';
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
  
  const dateValue = extinguisher.expiryDate ? parseISO(extinguisher.expiryDate) : null;
  const isValidDate = dateValue && !isNaN(dateValue.getTime());
  const isExpired = isValidDate ? dateValue < new Date() : false;
  const lastInspection = extinguisher.inspections?.slice(-1)[0];

  const details = [
    { label: 'Tipo', value: extinguisher.type },
    { label: 'Capacidade', value: `${extinguisher.weight} kg` },
    { label: 'Recarga', value: isValidDate ? format(dateValue, 'dd/MM/yyyy', { locale: ptBR }) : 'Data inválida' },
    { label: 'Teste Hidrostático', value: extinguisher.hydrostaticTestYear },
    { label: 'Localização', value: extinguisher.observations || 'N/A' },
    { label: 'Status', value: <Badge variant={isExpired ? 'destructive' : 'secondary'}>{isExpired ? 'Vencido' : 'Ativo'}</Badge> },
  ];

  const lastInspectionDetails = lastInspection ? [
      { label: 'Data da Última Inspeção', value: format(parseISO(lastInspection.date), 'dd/MM/yyyy', { locale: ptBR }) },
      { label: 'Horário da Última Inspeção', value: format(parseISO(lastInspection.date), 'HH:mm', { locale: ptBR }) },
      { label: 'Localização (GPS)', value: lastInspection.location ? `${lastInspection.location.latitude.toFixed(4)}, ${lastInspection.location.longitude.toFixed(4)}` : 'N/A' },
  ] : [];

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
                <CardTitle>Detalhes do Equipamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-6">
                    {details.map(detail => (
                    <div key={detail.label}>
                        <div className="text-sm font-medium text-muted-foreground">{detail.label}</div>
                        <div className="text-lg font-semibold">{detail.value}</div>
                    </div>
                    ))}
                </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                <CardTitle>Última Inspeção</CardTitle>
                </CardHeader>
                <CardContent>
                  {lastInspection ? (
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-6">
                      {lastInspectionDetails.map(detail => (
                        <div key={detail.label}>
                            <div className="text-sm font-medium text-muted-foreground">{detail.label}</div>
                            <div className="text-lg font-semibold">{detail.value}</div>
                        </div>
                      ))}
                     </div>
                  ) : (
                    <p className="text-muted-foreground">Nenhuma inspeção registrada para este equipamento.</p>
                  )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                <CardTitle>Histórico de Inspeção Completo</CardTitle>
                <CardDescription>Um registro de todas as inspeções para este equipamento.</CardDescription>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Data e Hora</TableHead>
                        <TableHead>Localização (Lat, Lon)</TableHead>
                        <TableHead>Notas</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {extinguisher.inspections && extinguisher.inspections.length > 0 ? [...extinguisher.inspections].reverse().map(insp => (
                        <TableRow key={insp.id}>
                        <TableCell>{format(parseISO(insp.date), 'Pp', { locale: ptBR })}</TableCell>
                        <TableCell>
                            {insp.location ? `${insp.location.latitude.toFixed(4)}, ${insp.location.longitude.toFixed(4)}` : 'N/A'}
                        </TableCell>
                        <TableCell>{insp.notes}</TableCell>
                        </TableRow>
                    )) : (
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
