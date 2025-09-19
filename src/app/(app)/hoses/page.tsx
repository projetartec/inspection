import Link from "next/link";
import { PlusCircle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { getHoses } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default async function HosesPage() {
  const hoses = await getHoses();

  return (
    <>
      <PageHeader title="Mangueiras">
        <Button asChild>
          <Link href="/hoses/new">
            <PlusCircle className="mr-2" />
            Adicionar Sistema de Mangueira
          </Link>
        </Button>
      </PageHeader>
      <Card>
        <CardHeader>
            <CardTitle>Sistemas de Mangueira Registrados</CardTitle>
            <CardDescription>Uma lista de todos os sistemas de mangueira de incêndio no sistema.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Data de Validade</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead><span className="sr-only">Ações</span></TableHead>
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
                            <TableCell>{format(new Date(hose.expiryDate), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                            <TableCell>
                                <Badge variant={isExpired ? 'destructive' : 'secondary'}>
                                    {isExpired ? 'Vencido' : 'Ativo'}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                                <Button asChild variant="ghost" size="sm">
                                    <Link href={`/hoses/${hose.id}`}>Ver</Link>
                                </Button>
                                <Button asChild variant="ghost" size="sm">
                                    <Link href={`/hoses/${hose.id}/edit`}>
                                        <Pencil className="h-4 w-4" />
                                        <span className="sr-only">Editar</span>
                                    </Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                        );
                    }) : (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24">
                                Nenhum sistema de mangueira encontrado.
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
