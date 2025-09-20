import { notFound } from 'next/navigation';
import { getExtinguisherById } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExtinguisherForm } from '@/components/extinguisher-form';
import { QrCodeDisplay } from '@/components/qr-code-display';

export default async function EditExtinguisherPage({ params }: { params: { id: string } }) {
  const extinguisher = await getExtinguisherById(params.id);

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
                <ExtinguisherForm extinguisher={extinguisher} />
            </CardContent>
            </Card>
        </div>
        <div className="md:col-span-1">
            <QrCodeDisplay value={extinguisher.qrCodeValue} label={extinguisher.id} />
        </div>
      </div>
    </>
  );
}
