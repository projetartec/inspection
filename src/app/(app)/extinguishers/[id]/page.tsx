import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { getExtinguisherById } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

export default async function ExtinguisherDetailPage({ params }: { params: { id: string } }) {
  const extinguisher = await getExtinguisherById(params.id);

  if (!extinguisher) {
    notFound();
  }

  const isExpired = new Date(extinguisher.expiryDate) < new Date();

  const details = [
    { label: 'QR Code Value', value: extinguisher.qrCodeValue },
    { label: 'Type', value: extinguisher.type },
    { label: 'Weight', value: `${extinguisher.weight} kg` },
    { label: 'Expiry Date', value: format(new Date(extinguisher.expiryDate), 'MMMM d, yyyy') },
    { label: 'Status', value: <Badge variant={isExpired ? 'destructive' : 'secondary'}>{isExpired ? 'Expired' : 'Active'}</Badge> },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title={`Extinguisher: ${extinguisher.id}`} />
      
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
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
          {extinguisher.observations && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Observations</p>
                <p className="text-base">{extinguisher.observations}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inspection History</CardTitle>
          <CardDescription>A log of all inspections for this equipment.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Location (Lat, Lon)</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {extinguisher.inspections.length > 0 ? extinguisher.inspections.map(insp => (
                <TableRow key={insp.id}>
                  <TableCell>{format(new Date(insp.date), 'Pp')}</TableCell>
                  <TableCell>
                    {insp.location ? `${insp.location.latitude.toFixed(4)}, ${insp.location.longitude.toFixed(4)}` : 'N/A'}
                  </TableCell>
                  <TableCell>{insp.notes}</TableCell>
                </TableRow>
              )).reverse() : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-24">No inspections recorded.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
