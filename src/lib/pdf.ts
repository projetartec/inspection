"use client";

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Extinguisher, Hose, Client, Building } from '@/lib/types';

// Extend jsPDF with autoTable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

function formatDate(dateInput: string | null | undefined): string {
    if (!dateInput) return 'N/A';
    try {
        const date = parseISO(dateInput);
        return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
        return 'Data Inválida';
    }
}

export function generatePdfReport(client: Client, building: Building, extinguishers: Extinguisher[], hoses: Hose[]) {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    let finalY = 40; // Initial Y position after header

    // --- Header ---
    doc.setFontSize(20);
    doc.text("Relatório de Inspeção", 14, 22);
    doc.setFontSize(11);
    doc.text(`Cliente: ${client.name}`, 14, 30);
    doc.text(`Local: ${building.name}`, 14, 35);
    doc.text(`Gerado em: ${format(new Date(), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}`, 14, 40);

    // --- Extinguishers Table ---
    if (extinguishers.length > 0) {
        doc.autoTable({
            startY: 50,
            head: [['ID', 'Tipo', 'Peso (kg)', 'Validade', 'Observações']],
            body: extinguishers.map(e => [
                e.id,
                e.type,
                e.weight,
                formatDate(e.expiryDate),
                e.observations || '',
            ]),
            theme: 'striped',
            headStyles: { fillColor: [0, 128, 128] }, // Teal header
        });
        finalY = (doc as any).lastAutoTable.finalY || finalY;
    } else {
        doc.text("Nenhum extintor registrado.", 14, 50);
        finalY = 50;
    }

    // Check if there is enough space for the next table, otherwise add a new page
    if (finalY + 30 > pageHeight) {
        doc.addPage();
        finalY = 20; // Reset Y for new page
    } else {
        finalY += 20; // Add some space before the next table
    }
    
    // --- Hoses Table ---
    if (hoses.length > 0) {
        doc.autoTable({
            startY: finalY,
            head: [['ID', 'Qtd', 'Tipo', 'Chaves', 'Bicos', 'Validade', 'Observações']],
            body: hoses.map(h => [
                h.id,
                h.quantity,
                h.hoseType,
                h.keyQuantity,
                h.nozzleQuantity,
                formatDate(h.expiryDate),
                h.observations || '',
            ]),
            theme: 'striped',
            headStyles: { fillColor: [0, 128, 128] }, // Teal header
        });
    } else {
         doc.text("Nenhum sistema de mangueira registrado.", 14, finalY);
    }
    
    // --- Download ---
    const fileName = `Relatorio_${client.name.replace(/ /g, '_')}_${building.name.replace(/ /g, '_')}.pdf`;
    doc.save(fileName);
}
