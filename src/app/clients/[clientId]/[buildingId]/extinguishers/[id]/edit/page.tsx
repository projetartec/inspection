import { notFound } from 'next/navigation';
import { getExtinguisherByUid } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExtinguisherForm } from '@/components/extinguisher-form';
import { QrCodeDisplay } from '@/components/qr-code-display';

export default async function EditExtinguisherPage({ params }: { params: { clientId: string, buildingId: string, id: string } }) {
  const { clientId, buildingId, id } = params;
  const extinguisher = await getExtinguisherByUid(buildingId, id);


  if (!extinguisher) {
    notFound();
  }

  return (
    <>
      <PageHeader title={`Editar Extintor: ${extinguisher.id}`} />
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
            <Card>
            <CardHeader>
                <CardTitle>Detalhes do Equipamento</CardTitle>
                <CardDescription>
                Modifique o formulário abaixo para atualizar os dados do extintor.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ExtinguisherForm extinguisher={extinguisher} clientId={clientId} buildingId={buildingId} />
            </CardContent>
            </Card>
        </div>
        <div className="md:col-span-1 space-y-4">
            <QrCodeDisplay value={extinguisher.qrCodeValue} label={extinguisher.id} />
             <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">ID Secreto</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground font-mono bg-muted/50 p-2 rounded-md break-all">
                        {extinguisher.uid}
                    </p>
                </CardContent>
            </Card>
        </div>
      </div>
    </>
  );
}
