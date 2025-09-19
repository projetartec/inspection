"use client";

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { Extinguisher, Hose } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

export function generatePdfReport(extinguishers: Extinguisher[], hoses: Hose[]) {
  const doc = new jsPDF() as jsPDFWithAutoTable;
  const page_width = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Relatório de Inspeção FireGuard', page_width / 2, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}`, page_width / 2, 25, { align: 'center' });

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Extintores', 14, 40);
  doc.autoTable({
    startY: 45,
    head: [['ID', 'Tipo', 'Peso (kg)', 'Validade', 'Observações']],
    body: extinguishers.map(e => [
      e.id,
      e.type,
      e.weight,
      format(new Date(e.expiryDate), 'dd/MM/yyyy', { locale: ptBR }),
      e.observations
    ]),
    theme: 'striped',
    headStyles: { fillColor: '#B71C1C' }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 40;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Mangueiras', 14, finalY + 15);
  doc.autoTable({
    startY: finalY + 20,
    head: [['ID', 'Qtd', 'Tipo', 'Chaves', 'Bicos', 'Validade', 'Observações']],
    body: hoses.map(h => [
      h.id,
      h.quantity,
      h.hoseType,
      h.keyQuantity,
      h.nozzleQuantity,
      format(new Date(h.expiryDate), 'dd/MM/yyyy', { locale: ptBR }),
      h.observations,
    ]),
    theme: 'striped',
    headStyles: { fillColor: '#B71C1C' }
  });

  doc.save('FireGuard-Relatorio.pdf');
}
