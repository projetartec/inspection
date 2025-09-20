'use client';

import React, { useState, useEffect } from 'react';
import { notFound } from 'next/navigation';
import { getHoseById } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HoseForm } from '@/components/hose-form';
import { QrCodeDisplay } from '@/components/qr-code-display';
import type { Hose } from '@/lib/types';

export default function EditHosePage({ params }: { params: { clientId: string, buildingId: string, id: string } }) {
  const { clientId, buildingId, id } = params;
  const [hose, setHose] = useState<Hose | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setHose(getHoseById(clientId, buildingId, id));
    setIsLoading(false);
  }, [clientId, buildingId, id]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Carregando...</div>;
  }

  if (!hose) {
    notFound();
  }

  return (
    <>
      <PageHeader title={`Editar Sistema de Mangueira: ${hose.id}`} />
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
            <Card>
                <CardHeader>
                <CardTitle>Detalhes do Sistema</CardTitle>
                <CardDescription>
                    Modifique o formulário abaixo para atualizar os dados do sistema de mangueira.
                </CardDescription>
                </CardHeader>
                <CardContent>
                <HoseForm hose={hose} clientId={clientId} buildingId={buildingId} />
                </CardContent>
            </Card>
        </div>
        <div className="md:col-span-1">
            <QrCodeDisplay value={hose.qrCodeValue} label={hose.id} />
        </div>
      </div>
    </>
  );
}
