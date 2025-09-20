import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExtinguisherForm } from "@/components/extinguisher-form";

export default function NewExtinguisherPage({ params }: { params: { clientId: string, buildingId: string } }) {
  const { clientId, buildingId } = params;
  return (
    <>
      <PageHeader title="Adicionar Novo Extintor" />
      <Card>
        <CardHeader>
          <CardTitle>Detalhes do Equipamento</CardTitle>
          <CardDescription>
            Preencha o formulário abaixo para registrar um novo extintor de incêndio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExtinguisherForm clientId={clientId} buildingId={buildingId} />
        </CardContent>
      </Card>
    </>
  );
}
