import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { getHoses } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';

export default async function HosesPage() {
  const hoses = await getHoses();

  return (
    <>
      <PageHeader title="Hoses">
        <Button asChild>
          <Link href="/hoses/new">
            <PlusCircle className="mr-2" />
            Add Hose System
          </Link>
        </Button>
      </PageHeader>
      <Card>
        <CardHeader>
            <CardTitle>Registered Hose Systems</CardTitle>
            <CardDescription>A list of all fire hose systems in the system.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Expiry Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {hoses.length > 0 ? hoses.map((hose) => {
                        const isExpired = new Date(hose.expiryDate) < new Date();
                        return (
                        <TableRow key={hose.id}>
                            <TableCell className="font-medium">{hose.id}</TableCell>
                            <TableCell>{hose.hoseType}</TableCell>
                            <TableCell>{hose.quantity}</TableCell>
                            <TableCell>{format(new Date(hose.expiryDate), 'MM/dd/yyyy')}</TableCell>
                            <TableCell>
                                <Badge variant={isExpired ? 'destructive' : 'secondary'}>
                                    {isExpired ? 'Expired' : 'Active'}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button asChild variant="ghost" size="sm">
                                    <Link href={`/hoses/${hose.id}`}>View</Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                        );
                    }) : (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24">
                                No hose systems found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </>
  );
}
