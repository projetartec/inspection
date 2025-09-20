'use client';

import React, { useState, useEffect } from 'react';
import { notFound } from 'next/navigation';
import { getExtinguisherById } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExtinguisherForm } from '@/components/extinguisher-form';
import { QrCodeDisplay } from '@/components/qr-code-display';
import type { Extinguisher } from '@/lib/types';

export default function EditExtinguisherPage({ params }: { params: { clientId: string, buildingId: string, id: string } }) {
  const { clientId, buildingId, id } = params;
  const [extinguisher, setExtinguisher] = useState<Extinguisher | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setExtinguisher(getExtinguisherById(clientId, buildingId, id));
    setIsLoading(false);
  }, [clientId, buildingId, id]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Carregando...</div>;
  }

  if (!extinguisher) {
    notFound();
  }

  return (
    <>
      <PageHeader title={`Editar Extintor: ${extinguisher.id}`} />
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
            <Card>
            <CardHeader>
                <CardTitle>Detalhes do Equipamento</CardTitle>
                <CardDescription>
                Modifique o formulário abaixo para atualizar os dados do extintor.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ExtinguisherForm extinguisher={extinguisher} clientId={clientId} buildingId={buildingId} />
            </CardContent>
            </Card>
        </div>
        <div className="md:col-span-1">
            <QrCodeDisplay value={extinguisher.qrCodeValue} label={extinguisher.id} />
        </div>
      </div>
    </>
  );
}
