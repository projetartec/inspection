
"use client";

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format, parseISO, isSameMonth, isSameYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Extinguisher, Hydrant, Client, Building, ManualInspection } from '@/lib/types';

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
    if (!inspection?.date) return { date: 'N/A', time: 'N/A', gps: 'N/A', status: 'N/A', notes: '' };
    const date = parseISO(inspection.date);
    return {
        date: format(date, 'dd/MM/yyyy', { locale: ptBR }),
        time: format(date, 'HH:mm', { locale: ptBR }),
        gps: inspection.location ? `${inspection.location.latitude.toFixed(4)}, ${inspection.location.longitude.toFixed(4)}` : 'N/A',
        status: inspection.status || 'N/A',
        notes: inspection.notes || '',
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
        headStyles: { fillColor: [0, 128, 128] }, // Teal
        bodyStyles: { halign: 'center' },
        styles: { halign: 'center', fontSize: 8 },
    };
    
    const manualEntryTableStyles = {
        ...tableStyles,
        headStyles: { fillColor: [255, 99, 71] }, // Tomato Red
    }

    // --- Extinguishers Table ---
    if (extinguishers.length > 0) {
        doc.autoTable({
            ...tableStyles,
            startY: finalY,
            head: [['ID', 'Local', 'Tipo', 'Carga', 'Recarga', 'Test. Hidro.', 'Status', 'Data Últ. Inspeção', 'Hora', 'GPS', 'Observações']],
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
                    insp.notes,
                ];
            }),
        });
        finalY = (doc as any).lastAutoTable.finalY;
    } else {
        doc.text("Nenhum extintor registrado.", 14, finalY);
        finalY += 10;
    }

     finalY += 10;

    if (finalY > pageHeight - 30) {
        doc.addPage();
        finalY = 20; 
    }
    
    // --- Hoses Table ---
    if (hoses.length > 0) {
        doc.autoTable({
            ...tableStyles,
            startY: finalY,
            head: [['ID', 'Local', 'Qtd Mang.', 'Tipo', 'Diâmetro', 'Medida', 'Chave', 'Esguicho', 'Próx. Teste', 'Status', 'Data Últ. Inspeção', 'Hora', 'GPS', 'Observações']],
            body: hoses.map(h => {
                const insp = formatLastInspection(h.inspections?.[h.inspections.length - 1]);
                return [
                    h.id,
                    h.location,
                    h.quantity,
                    'Tipo ' + h.hoseType,
                    h.diameter + '"',
                    h.hoseLength + 'm',
                    h.keyQuantity,
                    h.nozzleQuantity,
                    formatDate(h.hydrostaticTestDate),
                    insp.status,
                    insp.date,
                    insp.time,
                    insp.gps,
                    insp.notes,
                ];
            }),
        });
         finalY = (doc as any).lastAutoTable.finalY;
    } else {
         doc.text("Nenhum hidrante registrado.", 14, finalY);
         finalY += 10;
    }

    finalY += 10;

    if (finalY > pageHeight - 30) {
        doc.addPage();
        finalY = 20;
    }

    // --- Manual/Failed Inspections Table ---
    if (building.manualInspections && building.manualInspections.length > 0) {
        doc.setFontSize(14);
        doc.text("Registros Manuais e Falhas de Leitura", 14, finalY);
        finalY += 8;

        doc.autoTable({
            ...manualEntryTableStyles,
            startY: finalY,
            head: [['ID Manual', 'Data', 'Hora', 'GPS', 'Status', 'Observações']],
            body: building.manualInspections.map(insp => {
                 const formattedInsp = formatLastInspection(insp);
                 return [
                    (insp as ManualInspection).manualId,
                    formattedInsp.date,
                    formattedInsp.time,
                    formattedInsp.gps,
                    formattedInsp.status,
                    formattedInsp.notes,
                 ]
            })
        })
    }
    
    const fileName = `Relatorio_${client.name.replace(/ /g, '_')}_${building.name.replace(/ /g, '_')}.pdf`;
    doc.save(fileName);
}

export function generateClientPdfReport(client: Client, buildings: Building[]) {
    const doc = new jsPDF({
        orientation: 'landscape',
    }) as jsPDFWithAutoTable;

    const generationDate = new Date();
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    let finalY = 20;

    // --- Header ---
    doc.setFontSize(20);
    doc.text("Relatório Consolidado", 14, finalY);
    finalY += 10;
    doc.setFontSize(11);
    doc.text(`Cliente: ${client.name}`, 14, finalY);
    finalY += 5;
    doc.text(`Gerado em: ${format(generationDate, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}`, 14, finalY);
    finalY += 10;
    
    const tableStyles = {
        theme: 'striped',
        headStyles: { fillColor: [0, 128, 128] }, // Teal
        bodyStyles: { halign: 'center' },
        styles: { halign: 'center', fontSize: 8 },
    };

    const isExpiringThisMonth = (dateStr: string) => {
        if (!dateStr) return false;
        try {
            const date = parseISO(dateStr);
            return isSameMonth(date, generationDate) && isSameYear(date, generationDate);
        } catch {
            return false;
        }
    };

    // --- Extinguishers Table ---
    const allExtinguishers = buildings.flatMap(building => 
        (building.extinguishers || []).map(ext => ({...ext, buildingName: building.name}))
    );

    if (allExtinguishers.length > 0) {
        doc.setFontSize(14);
        doc.text("Extintores", 14, finalY);
        finalY += 8;

        doc.autoTable({
            ...tableStyles,
            startY: finalY,
            head: [['ID', 'Prédio', 'Local', 'Tipo', 'Carga', 'Recarga', 'Test. Hidro.', 'Status', 'Data Últ. Inspeção', 'Observações']],
            body: allExtinguishers.map(e => {
                const insp = formatLastInspection(e.inspections?.[e.inspections.length - 1]);
                return [
                    e.id, e.buildingName, e.observations || '', e.type, e.weight + ' kg',
                    formatDate(e.expiryDate), e.hydrostaticTestYear, insp.status, insp.date, insp.notes,
                ];
            }),
            willDrawCell: (data) => {
                const row = data.row.raw as any[];
                const expiryDateStr = allExtinguishers[data.row.index].expiryDate;
                if (isExpiringThisMonth(expiryDateStr)) {
                    doc.setFillColor("#FF6969"); // Light Red
                }
            }
        });
        finalY = (doc as any).lastAutoTable.finalY;
    } else {
        doc.text("Nenhum extintor registrado para este cliente.", 14, finalY);
        finalY += 10;
    }

    finalY += 10;
    if (finalY > pageHeight - 40) {
        doc.addPage();
        finalY = 20;
    }

    // --- Hoses Table ---
    const allHoses = buildings.flatMap(building => 
        (building.hoses || []).map(hose => ({...hose, buildingName: building.name}))
    );
    
    if (allHoses.length > 0) {
        doc.setFontSize(14);
        doc.text("Hidrantes", 14, finalY);
        finalY += 8;

        doc.autoTable({
            ...tableStyles,
            startY: finalY,
            head: [['ID', 'Prédio', 'Local', 'Qtd', 'Tipo', 'Diâmetro', 'Medida', 'Chave', 'Esguicho', 'Próx. Teste', 'Status', 'Data Últ. Inspeção', 'Observações']],
            body: allHoses.map(h => {
                const insp = formatLastInspection(h.inspections?.[h.inspections.length - 1]);
                return [
                    h.id, h.buildingName, h.location, h.quantity, 'Tipo ' + h.hoseType, h.diameter + '"',
                    h.hoseLength + 'm', h.keyQuantity, h.nozzleQuantity, formatDate(h.hydrostaticTestDate),
                    insp.status, insp.date, insp.notes
                ];
            }),
            willDrawCell: (data) => {
                const row = data.row.raw as any[];
                const testDateStr = allHoses[data.row.index].hydrostaticTestDate;
                if (isExpiringThisMonth(testDateStr)) {
                    doc.setFillColor("#FF6969"); // Light Red
                }
            }
        });
        finalY = (doc as any).lastAutoTable.finalY;
    } else {
        doc.text("Nenhum hidrante registrado para este cliente.", 14, finalY);
        finalY += 10;
    }
    
    const fileName = `Relatorio_Consolidado_${client.name.replace(/ /g, '_')}.pdf`;
    doc.save(fileName);
}
