import { notFound } from 'next/navigation';
import { getExtinguisherById } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExtinguisherForm } from '@/components/extinguisher-form';

export default async function EditExtinguisherPage({ params }: { params: { id: string } }) {
  const extinguisher = await getExtinguisherById(params.id);

  if (!extinguisher) {
    notFound();
  }

  return (
    <>
      <PageHeader title={`Editar Extintor: ${extinguisher.id}`} />
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
    </>
  );
}
