"use client";

import Link from "next/link";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { getHoses } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import React from "react";
import type { Hose } from "@/lib/types";
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";
import { deleteHoseAction } from "@/lib/actions";
import { useRouter } from "next/navigation";

export default function HosesPage() {
  const [hoses, setHoses] = React.useState<Hose[]>([]);
  const router = useRouter();

  React.useEffect(() => {
    getHoses().then(setHoses);
  }, []);

  const refreshList = () => {
    getHoses().then(setHoses);
    router.refresh();
  }

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
                            <TableCell className="font-medium">
                               <Link href={`/hoses/${hose.id}`} className="hover:underline">{hose.id}</Link>
                            </TableCell>
                            <TableCell>{hose.hoseType}</TableCell>
                            <TableCell>{hose.quantity}</TableCell>
                            <TableCell>{format(new Date(hose.expiryDate), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                            <TableCell>
                                <Badge variant={isExpired ? 'destructive' : 'secondary'}>
                                    {isExpired ? 'Vencido' : 'Ativo'}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-2 flex items-center justify-end">
                                <Button asChild variant="ghost" size="sm">
                                    <Link href={`/hoses/${hose.id}/edit`}>
                                        <Pencil className="h-4 w-4" />
                                        <span className="sr-only">Editar</span>
                                    </Link>
                                </Button>
                                <DeleteConfirmationDialog
                                  itemId={hose.id}
                                  itemName="Sistema de Mangueira"
                                  deleteAction={deleteHoseAction}
                                  onSuccess={refreshList}
                                >
                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Deletar</span>
                                  </Button>
                                </DeleteConfirmationDialog>
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
