
import { notFound } from 'next/navigation';
import { getHoseById } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HoseForm } from '@/components/hose-form';
import { QrCodeDisplay } from '@/components/qr-code-display';

export default async function EditHosePage({ params }: { params: { clientId: string, buildingId: string, id: string } }) {
  const { clientId, buildingId, id } = params;
  const hose = await getHoseById(clientId, buildingId, id);

  if (!hose) {
    notFound();
  }

  return (
    <>
      <PageHeader title={`Editar Hidrante: ${hose.id}`} />
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
            <Card>
                <CardHeader>
                <CardTitle>Detalhes do Hidrante</CardTitle>
                <CardDescription>
                    Modifique o formulário abaixo para atualizar os dados do hidrante.
                </CardDescription>
                </CardHeader>
                <CardContent>
                <HoseForm hose={hose} clientId={clientId} buildingId={buildingId} />
                </CardContent>
            </Card>
        </div>
        <div className="md:col-span-1">
            <QrCodeDisplay value={hose.qrCodeValue} label={hose.id} />
        </div>
      </div>
    </>
  );
}
