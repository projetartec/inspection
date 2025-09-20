import Link from "next/link";
import { PlusCircle, Pencil, Trash2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { getHosesByBuilding } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import React from "react";
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";
import { deleteHoseAction } from "@/lib/actions";
import { QrCodeDialog } from "@/components/qr-code-dialog";

export default async function HosesPage({ params }: { params: { clientId: string, buildingId: string }}) {
  const { clientId, buildingId } = params;
  const hoses = await getHosesByBuilding(clientId, buildingId);

  return (
    <>
      <PageHeader title="Mangueiras">
        <Button asChild>
          <Link href={`/clients/${clientId}/${buildingId}/hoses/new`}>
            <PlusCircle className="mr-2" />
            Adicionar Sistema de Mangueira
          </Link>
        </Button>
      </PageHeader>
      <Card>
        <CardHeader>
            <CardTitle>Sistemas de Mangueira Registrados</CardTitle>
            <CardDescription>Uma lista de todos os sistemas de mangueira de incêndio neste local.</CardDescription>
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
                        const deleteActionWithParams = deleteHoseAction.bind(null, clientId, buildingId, hose.id);
                        return (
                        <TableRow key={hose.id}>
                            <TableCell className="font-medium">
                               <Link href={`/clients/${clientId}/${buildingId}/hoses/${hose.id}`} className="hover:underline">{hose.id}</Link>
                            </TableCell>
                            <TableCell>{hose.hoseType}"</TableCell>
                            <TableCell>{hose.quantity}</TableCell>
                            <TableCell>{format(new Date(hose.expiryDate), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                            <TableCell>
                                <Badge variant={isExpired ? 'destructive' : 'secondary'}>
                                    {isExpired ? 'Vencido' : 'Ativo'}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex items-center justify-end space-x-2">
                                    <Button asChild variant="ghost" size="sm">
                                        <Link href={`/clients/${clientId}/${buildingId}/hoses/${hose.id}/edit`}>
                                            <Pencil className="h-4 w-4" />
                                            <span className="sr-only">Editar</span>
                                        </Link>
                                    </Button>
                                    <DeleteConfirmationDialog
                                    itemId={hose.id}
                                    itemName="Sistema de Mangueira"
                                    formAction={deleteActionWithParams}
                                    >
                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Deletar</span>
                                    </Button>
                                    </DeleteConfirmationDialog>
                                    <QrCodeDialog value={hose.qrCodeValue} label={hose.id}>
                                        <Button variant="ghost" size="sm">
                                            <QrCode className="h-4 w-4" />
                                            <span className="sr-only">Ver QR Code</span>
                                        </Button>
                                    </QrCodeDialog>
                                </div>
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