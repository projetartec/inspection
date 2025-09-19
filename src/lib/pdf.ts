"use client";

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { Extinguisher, Hose } from '@/lib/types';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

export function generatePdfReport(extinguishers: Extinguisher[], hoses: Hose[]) {
  const doc = new jsPDF() as jsPDFWithAutoTable;
  const page_width = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('FireGuard Inspection Report', page_width / 2, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on: ${new Date().toLocaleString()}`, page_width / 2, 25, { align: 'center' });

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Extinguishers', 14, 40);
  doc.autoTable({
    startY: 45,
    head: [['ID', 'Type', 'Weight (kg)', 'Expiry Date', 'Observations']],
    body: extinguishers.map(e => [
      e.id,
      e.type,
      e.weight,
      new Date(e.expiryDate).toLocaleDateString(),
      e.observations
    ]),
    theme: 'striped',
    headStyles: { fillColor: '#B71C1C' }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 40;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Hoses', 14, finalY + 15);
  doc.autoTable({
    startY: finalY + 20,
    head: [['ID', 'Qty', 'Type', 'Keys', 'Nozzles', 'Expiry Date', 'Observations']],
    body: hoses.map(h => [
      h.id,
      h.quantity,
      h.hoseType,
      h.keyQuantity,
      h.nozzleQuantity,
      new Date(h.expiryDate).toLocaleDateString(),
      h.observations,
    ]),
    theme: 'striped',
    headStyles: { fillColor: '#B71C1C' }
  });

  doc.save('FireGuard-Report.pdf');
}
