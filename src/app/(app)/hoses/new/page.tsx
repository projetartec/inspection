import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HoseForm } from "@/components/hose-form";

export default function NewHosePage() {
  return (
    <>
      <PageHeader title="Adicionar Novo Sistema de Mangueira" />
      <Card>
        <CardHeader>
          <CardTitle>Detalhes do Sistema</CardTitle>
          <CardDescription>
            Preencha o formulário abaixo para registrar um novo sistema de mangueira de incêndio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HoseForm />
        </CardContent>
      </Card>
    </>
  );
}
