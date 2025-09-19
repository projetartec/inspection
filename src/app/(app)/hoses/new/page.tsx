import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HoseForm } from "@/components/hose-form";

export default function NewHosePage() {
  return (
    <>
      <PageHeader title="Add New Hose System" />
      <Card>
        <CardHeader>
          <CardTitle>System Details</CardTitle>
          <CardDescription>
            Fill in the form below to register a new fire hose system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HoseForm />
        </CardContent>
      </Card>
    </>
  );
}
