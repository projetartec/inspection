'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBuildingById, getExtinguishersByBuilding, getHosesByBuilding } from "@/lib/data";
import { Flame, Droplets, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import type { Building, Extinguisher, Hose } from '@/lib/types';

export default function DashboardPage({ params }: { params: { clientId: string, buildingId: string }}) {
  const { clientId, buildingId } = params;
  
  const [building, setBuilding] = useState<Building | null>(null);
  const [extinguishers, setExtinguishers] = useState<Extinguisher[]>([]);
  const [hoses, setHoses] = useState<Hose[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const foundBuilding = await getBuildingById(clientId, buildingId);
      if (foundBuilding) {
        setBuilding(foundBuilding);
        const [extinguisherData, hoseData] = await Promise.all([
          getExtinguishersByBuilding(clientId, buildingId),
          getHosesByBuilding(clientId, buildingId),
        ]);
        setExtinguishers(extinguisherData);
        setHoses(hoseData);
      }
      setIsLoading(false);
    }
    fetchData();
  }, [clientId, buildingId]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Carregando...</div>;
  }

  if (!building) {
    notFound();
  }

  const isExpired = (item: { expiryDate: Date }) => new Date(item.expiryDate) < new Date();
  const expiredExtinguishers = extinguishers.filter(isExpired).length;
  const expiredHoses = hoses.filter(isExpired).length;

  const stats = [
    { title: "Total de Extintores", value: extinguishers.length, icon: Flame, color: "text-muted-foreground" },
    { title: "Total de Mangueiras", value: hoses.length, icon: Droplets, color: "text-muted-foreground" },
    { title: "Itens Vencidos", value: expiredExtinguishers + expiredHoses, icon: AlertTriangle, color: "text-destructive", description: `${expiredExtinguishers} extintores, ${expiredHoses} mangueiras` },
  ];

  const scanUrl = `/clients/${clientId}/${buildingId}/scan`;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={`Painel: ${building.name}`} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              {stat.description && <p className="text-xs text-muted-foreground">{stat.description}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="text-center">
        <CardHeader>
            <CardTitle className="font-headline">Pronto para a Inspeção?</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground mb-4">Inicie uma nova inspeção escaneando um código QR.</p>
            <Button asChild size="lg">
                <Link href={scanUrl}>Iniciar Leitura</Link>
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
