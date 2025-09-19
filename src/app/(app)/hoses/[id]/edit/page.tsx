import { notFound } from 'next/navigation';
import { getHoseById } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HoseForm } from '@/components/hose-form';

export default async function EditHosePage({ params }: { params: { id: string } }) {
  const hose = await getHoseById(params.id);

  if (!hose) {
    notFound();
  }

  return (
    <>
      <PageHeader title={`Editar Sistema de Mangueira: ${hose.id}`} />
      <Card>
        <CardHeader>
          <CardTitle>Detalhes do Sistema</CardTitle>
          <CardDescription>
            Modifique o formulário abaixo para atualizar os dados do sistema de mangueira.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HoseForm hose={hose} />
        </CardContent>
      </Card>
    </>
  );
}
