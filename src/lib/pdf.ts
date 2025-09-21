"use client";

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Extinguisher, Hose, Client, Building } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// This function now expects the expiryDate to be a pre-formatted string.
export function generatePdfReport(client: Client, building: Building, extinguishers: any[], hoses: any[]) {
  const doc = new jsPDF();
  const page_width = doc.internal.pageSize.getWidth();

  // Cabeçalho
  doc.setFontSize(20);
  doc.text('Relatório de Inspeção', page_width / 2, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(`Cliente: ${client.name || ''}`, 14, 35);
  doc.text(`Local: ${building.name || ''}`, 14, 42);

  doc.setFontSize(10);
  doc.text(`Gerado em: ${format(new Date(), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}`, page_width - 14, 42, { align: 'right' });


  // Tabela de Extintores
  doc.setFontSize(16);
  doc.text('Extintores', 14, 60);
  autoTable(doc, {
    startY: 65,
    head: [['ID', 'Tipo', 'Peso (kg)', 'Validade', 'Observações']],
    body: extinguishers.map(e => [
      e.id || '',
      e.type || '',
      e.weight || '',
      e.expiryDate, // Directly use the pre-formatted string
      e.observations || ''
    ]),
    theme: 'striped',
    headStyles: { fillColor: [183, 28, 28] } // Cor em formato RGB
  });

  const finalY = (doc as any).lastAutoTable.finalY || 40;

  // Tabela de Mangueiras
  doc.setFontSize(16);
  doc.text('Sistemas de Mangueira', 14, finalY + 15);
  autoTable(doc, {
    startY: finalY + 20,
    head: [['ID', 'Qtd', 'Tipo', 'Chaves', 'Bicos', 'Validade', 'Observações']],
    body: hoses.map(h => [
      h.id || '',
      h.quantity || '',
      h.hoseType || '',
      h.keyQuantity || '',
      h.nozzleQuantity || '',
      h.expiryDate, // Directly use the pre-formatted string
      h.observations || ''
    ]),
    theme: 'striped',
    headStyles: { fillColor: [183, 28, 28] } // Cor em formato RGB
  });

  doc.save(`Relatorio_${(client.name || 'Cliente').replace(/ /g, '_')}_${(building.name || 'Local').replace(/ /g, '_')}.pdf`);
}
