
"use client";

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Extinguisher, Hydrant, Client, Building } from '@/lib/types';

// Extend jsPDF with autoTable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDFWithAutoTable;
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

function formatLastInspection(inspection: any) {
    if (!inspection?.date) return { date: 'N/A', time: 'N/A', gps: 'N/A', status: 'N/A' };
    const date = parseISO(inspection.date);
    return {
        date: format(date, 'dd/MM/yyyy', { locale: ptBR }),
        time: format(date, 'HH:mm', { locale: ptBR }),
        gps: inspection.location ? `${inspection.location.latitude.toFixed(4)}, ${inspection.location.longitude.toFixed(4)}` : 'N/A',
        status: inspection.status || 'N/A',
    };
}


export function generatePdfReport(client: Client, building: Building, extinguishers: Extinguisher[], hoses: Hydrant[]) {
    const doc = new jsPDF({
        orientation: 'landscape',
    }) as jsPDFWithAutoTable;

    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    let finalY = 20; 

    // --- Header ---
    doc.setFontSize(20);
    doc.text("Relatório de Inspeção", 14, finalY);
    finalY += 10;
    doc.setFontSize(11);
    doc.text(`Cliente: ${client.name}`, 14, finalY);
    finalY += 5;
    doc.text(`Local: ${building.name}`, 14, finalY);
    finalY += 5;
    doc.text(`Gerado em: ${format(new Date(), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}`, 14, finalY);
    finalY += 10;

    const tableStyles = {
        theme: 'striped',
        headStyles: { fillColor: [0, 128, 128] },
        bodyStyles: { halign: 'center' },
        styles: { halign: 'center' },
    };

    // --- Extinguishers Table ---
    if (extinguishers.length > 0) {
        doc.autoTable({
            ...tableStyles,
            startY: finalY,
            head: [['ID', 'Local', 'Tipo', 'Carga', 'Recarga', 'Test. Hidro.', 'Status Últ. Insp.', 'Data Últ. Inspeção', 'Hora', 'GPS']],
            body: extinguishers.map(e => {
                const insp = formatLastInspection(e.inspections?.[e.inspections.length - 1]);
                return [
                    e.id,
                    e.observations || '',
                    e.type,
                    e.weight + ' kg',
                    formatDate(e.expiryDate),
                    e.hydrostaticTestYear,
                    insp.status,
                    insp.date,
                    insp.time,
                    insp.gps,
                ];
            }),
        });
        finalY = (doc as any).lastAutoTable.finalY;
    } else {
        doc.text("Nenhum extintor registrado.", 14, finalY);
    }

     finalY += 15;

    if (finalY > pageHeight - 30) {
        doc.addPage();
        finalY = 20; 
    }
    
    // --- Hoses Table ---
    if (hoses.length > 0) {
        doc.autoTable({
            ...tableStyles,
            startY: finalY,
            head: [['ID', 'Local', 'Qtd Mang.', 'Tipo', 'Diâmetro', 'Chave', 'Esguicho', 'Próx. Teste', 'Status Últ. Insp.', 'Data Últ. Inspeção', 'Hora', 'GPS']],
            body: hoses.map(h => {
                const insp = formatLastInspection(h.inspections?.[h.inspections.length - 1]);
                return [
                    h.id,
                    h.location,
                    h.quantity,
                    'Tipo ' + h.hoseType,
                    h.diameter + '"',
                    h.keyQuantity,
                    h.nozzleQuantity,
                    formatDate(h.hydrostaticTestDate),
                    insp.status,
                    insp.date,
                    insp.time,
                    insp.gps,
                ];
            }),
        });
    } else {
         doc.text("Nenhum hidrante registrado.", 14, finalY);
    }
    
    const fileName = `Relatorio_${client.name.replace(/ /g, '_')}_${building.name.replace(/ /g, '_')}.pdf`;
    doc.save(fileName);
}
