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

export default function Home() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchClients() {
      try {
        const clientList = await getClients();
        setClients(clientList);
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
    fetchClients();
  }, []); // A dependência vazia garante que isso rode apenas uma vez no carregamento

  return (
    <div className="min-h-screen container mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center">
      <header className="mb-12 pt-8">
        <AppLogo />
      </header>

      <main className="w-full max-w-2xl">
        {isLoading ? (
          <Card>
            <CardHeader>
              <CardTitle>Carregando Clientes...</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Buscando dados...</p>
            </CardContent>
          </Card>
        ) : clients.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Selecione um Cliente</CardTitle>
              <CardDescription>Escolha um cliente para gerenciar os locais e equipamentos.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {clients.map((client) => (
                <Button key={client.id} asChild variant="outline" size="lg" className="justify-start">
                  <Link href={`/clients/${client.id}`}>{client.name}</Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card className="text-center">
            <CardHeader>
              <CardTitle>Bem-vindo ao Brazil Extintores</CardTitle>
              <CardDescription>Nenhum cliente foi cadastrado ainda. Comece adicionando seu primeiro cliente.</CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="mt-8">
            <ClientForm />
        </div>
      </main>
    </div>
  );
}
