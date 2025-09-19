import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { getHoseById } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

export default async function HoseDetailPage({ params }: { params: { id: string } }) {
  const hose = await getHoseById(params.id);

  if (!hose) {
    notFound();
  }

  const isExpired = new Date(hose.expiryDate) < new Date();

  const details = [
    { label: 'QR Code Value', value: hose.qrCodeValue },
    { label: 'Hose Type', value: `${hose.hoseType}"` },
    { label: 'Hose Quantity', value: hose.quantity },
    { label: 'Key Quantity', value: hose.keyQuantity },
    { label: 'Nozzle Quantity', value: hose.nozzleQuantity },
    { label: 'Expiry Date', value: format(new Date(hose.expiryDate), 'MMMM d, yyyy') },
    { label: 'Status', value: <Badge variant={isExpired ? 'destructive' : 'secondary'}>{isExpired ? 'Expired' : 'Active'}</Badge> },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title={`Hose System: ${hose.id}`} />
      
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
          {hose.observations && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Observations</p>
                <p className="text-base">{hose.observations}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inspection History</CardTitle>
          <CardDescription>A log of all inspections for this system.</CardDescription>
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
              {hose.inspections.length > 0 ? hose.inspections.map(insp => (
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
