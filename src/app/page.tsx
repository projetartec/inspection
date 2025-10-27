
"use client";

import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { getClients } from "@/lib/data";
import { AppLogo } from "@/components/app-logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClientForm } from "@/components/client-form";
import type { Client } from "@/lib/types";
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteClientAction } from '@/lib/actions';
import { DeleteButton } from '@/components/delete-button';
import { Input } from '@/components/ui/input';

export default function Home() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const clientList = await getClients();
      setClients(clientList);
      setFilteredClients(clientList);
    } catch (error) {
      console.error("Falha ao buscar clientes:", error);
      toast({
        variant: 'destructive',
        title: 'Erro de Conexão',
        description: 'Não foi possível buscar os dados dos clientes. Verifique sua conexão e as permissões do Firestore.'
      })
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    const results = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.fantasyName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredClients(results);
  }, [searchTerm, clients]);

  const handleDeleteSuccess = (deletedClientId: string) => {
    setClients(prevClients => prevClients.filter(client => client.id !== deletedClientId));
    toast({
      title: "Sucesso!",
      description: "Cliente deletado com sucesso."
    });
  };

  return (
    <div className="min-h-screen container mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center">
      <header className="mb-12 pt-8">
        <AppLogo />
      </header>

      <main className="w-full max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Selecione um Cliente</CardTitle>
            <CardDescription>Escolha um cliente para gerenciar os locais e equipamentos.</CardDescription>
            <div className="relative mt-4">
              <Input 
                type="text"
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-8"
              />
              {searchTerm && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Limpar busca</span>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {isLoading ? (
              <p>Buscando dados...</p>
            ) : filteredClients.length > 0 ? (
              filteredClients.map((client) => (
                <div key={client.id} className="flex items-center justify-between p-2 rounded-lg border">
                  <Button asChild variant="link" className="justify-start flex-grow text-lg p-0 overflow-hidden">
                    <Link href={`/clients/${client.id}`} className="truncate">{client.name}</Link>
                  </Button>
                  <div className="flex items-center space-x-1">
                    <Button asChild variant="ghost" size="icon">
                      <Link href={`/clients/${client.id}/edit`}>
                        <Pencil className="h-5 w-5" />
                        <span className="sr-only">Editar Cliente</span>
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-5 w-5" />
                          <span className="sr-only">Deletar Cliente</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. Isso irá deletar permanentemente o cliente{' '}
                              <span className="font-bold">{client.name}</span> e todos os seus locais e equipamentos.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <DeleteButton action={() => deleteClientAction(client.id)} onSuccess={() => handleDeleteSuccess(client.id)} />
                          </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">
                {searchTerm ? `Nenhum cliente encontrado para "${searchTerm}".` : "Nenhum cliente foi cadastrado ainda."}
              </p>
            )}
          </CardContent>
        </Card>
        
        <div className="mt-8">
            <ClientForm onSuccess={fetchClients} />
        </div>
      </main>
    </div>
  );
}
