import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExtinguisherForm } from "@/components/extinguisher-form";

export default function NewExtinguisherPage() {
  return (
    <>
      <PageHeader title="Add New Extinguisher" />
      <Card>
        <CardHeader>
          <CardTitle>Equipment Details</CardTitle>
          <CardDescription>
            Fill in the form below to register a new fire extinguisher.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExtinguisherForm />
        </CardContent>
      </Card>
    </>
  );
}
