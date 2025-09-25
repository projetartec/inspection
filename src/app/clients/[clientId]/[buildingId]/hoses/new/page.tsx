
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HoseForm } from "@/components/hose-form";

export default function NewHosePage({ params }: { params: { clientId: string, buildingId: string } }) {
  const { clientId, buildingId } = params;
  return (
    <>
      <PageHeader title="Adicionar Novo Hidrante" />
      <Card>
        <CardHeader>
          <CardTitle>Detalhes do Hidrante</CardTitle>
          <CardDescription>
            Preencha o formulário abaixo para registrar um novo hidrante.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HoseForm clientId={clientId} buildingId={buildingId} />
        </CardContent>
      </Card>
    </>
  );
}
