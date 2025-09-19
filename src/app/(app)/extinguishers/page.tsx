import Link from "next/link";
import { PlusCircle, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { getExtinguishers } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';

export default async function ExtinguishersPage() {
  const extinguishers = await getExtinguishers();

  return (
    <>
      <PageHeader title="Extinguishers">
        <Button asChild>
          <Link href="/extinguishers/new">
            <PlusCircle className="mr-2" />
            Add Extinguisher
          </Link>
        </Button>
      </PageHeader>
      <Card>
        <CardHeader>
            <CardTitle>Registered Extinguishers</CardTitle>
            <CardDescription>A list of all fire extinguishers in the system.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Weight (kg)</TableHead>
                        <TableHead>Expiry Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {extinguishers.length > 0 ? extinguishers.map((ext) => {
                        const isExpired = new Date(ext.expiryDate) < new Date();
                        return (
                        <TableRow key={ext.id}>
                            <TableCell className="font-medium">{ext.id}</TableCell>
                            <TableCell>{ext.type}</TableCell>
                            <TableCell>{ext.weight}</TableCell>
                            <TableCell>{format(new Date(ext.expiryDate), 'MM/dd/yyyy')}</TableCell>
                            <TableCell>
                                <Badge variant={isExpired ? 'destructive' : 'secondary'}>
                                    {isExpired ? 'Expired' : 'Active'}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button asChild variant="ghost" size="sm">
                                    <Link href={`/extinguishers/${ext.id}`}>View</Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                        );
                    }) : (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24">
                                No extinguishers found.
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
