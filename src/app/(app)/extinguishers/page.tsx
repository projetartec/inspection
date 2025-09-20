import Link from "next/link";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { getExtinguishers } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import React from "react";
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";
import { deleteExtinguisherAction } from "@/lib/actions";

export default async function ExtinguishersPage() {
  const extinguishers = await getExtinguishers();

  return (
    <>
      <PageHeader title="Extintores">
        <Button asChild>
          <Link href="/extinguishers/new">
            <PlusCircle className="mr-2" />
            Adicionar Extintor
          </Link>
        </Button>
      </PageHeader>
      <Card>
        <CardHeader>
            <CardTitle>Extintores Registrados</CardTitle>
            <CardDescription>Uma lista de todos os extintores de incêndio no sistema.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Peso (kg)</TableHead>
                        <TableHead>Data de Validade</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead><span className="sr-only">Ações</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {extinguishers.length > 0 ? extinguishers.map((ext) => {
                        const isExpired = new Date(ext.expiryDate) < new Date();
                        return (
                        <TableRow key={ext.id}>
                            <TableCell className="font-medium">
                              <Link href={`/extinguishers/${ext.id}`} className="hover:underline">{ext.id}</Link>
                            </TableCell>
                            <TableCell>{ext.type}</TableCell>
                            <TableCell>{ext.weight}</TableCell>
                            <TableCell>{format(new Date(ext.expiryDate), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                            <TableCell>
                                <Badge variant={isExpired ? 'destructive' : 'secondary'}>
                                    {isExpired ? 'Vencido' : 'Ativo'}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-2 flex items-center justify-end">
                                <Button asChild variant="ghost" size="sm">
                                    <Link href={`/extinguishers/${ext.id}/edit`}>
                                        <Pencil className="h-4 w-4" />
                                        <span className="sr-only">Editar</span>
                                    </Link>
                                </Button>
                                <DeleteConfirmationDialog
                                  itemId={ext.id}
                                  itemName="Extintor"
                                  deleteAction={deleteExtinguisherAction}
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
                                Nenhum extintor encontrado.
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
