
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

const NC_BG_COLOR = [255, 250, 205]; // LemonChiffon
const EXPIRING_BG_COLOR = [255, 105, 97]; // Light Coral / FF6969
const HEADER_BG_COLOR = [0, 128, 128]; // Teal

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


export async function generatePdfReport(client: Client, building: Building, extinguishers: Extinguisher[], hoses: Hydrant[]) {
    // Wrap in promise to make it async and unblock UI thread
    return new Promise<void>((resolve) => {
        const doc = new jsPDF({
            orientation: 'landscape',
        }) as jsPDFWithAutoTable;

        const generationDate = new Date();
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
        doc.text(`Gerado em: ${format(generationDate, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}`, 14, finalY);
        finalY += 10;

        const tableStyles = {
            theme: 'striped',
            headStyles: { fillColor: HEADER_BG_COLOR },
            bodyStyles: { halign: 'center' },
            styles: { halign: 'center', fontSize: 8, cellPadding: 1.5 },
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
                        e.id, e.observations || '', e.type, e.weight + ' kg', formatDate(e.expiryDate), e.hydrostaticTestYear,
                        insp.status, insp.date, insp.time, insp.gps, insp.notes,
                    ];
                }),
                didParseCell: (data) => {
                     const item = extinguishers[data.row.index];
                     if (!item) return;
                     const lastInsp = item.inspections?.[item.inspections.length - 1];

                    if (lastInsp?.status === 'N/C') {
                        data.cell.styles.fontStyle = 'bold';
                        if (data.column.dataKey === 'Observações') {
                            data.cell.styles.fillColor = NC_BG_COLOR;
                        }
                    }
                    
                    if (item.expiryDate && isSameMonth(parseISO(item.expiryDate), generationDate) && isSameYear(parseISO(item.expiryDate), generationDate)) {
                         data.row.styles.fillColor = EXPIRING_BG_COLOR;
                    }
                }
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
                        h.id, h.location, h.quantity, 'Tipo ' + h.hoseType, h.diameter + '"', h.hoseLength + 'm',
                        h.keyQuantity, h.nozzleQuantity, formatDate(h.hydrostaticTestDate),
                        insp.status, insp.date, insp.time, insp.gps, insp.notes,
                    ];
                }),
                 didParseCell: (data) => {
                     const item = hoses[data.row.index];
                     if (!item) return;
                     const lastInsp = item.inspections?.[item.inspections.length - 1];

                    if (lastInsp?.status === 'N/C') {
                        data.cell.styles.fontStyle = 'bold';
                        if (data.column.dataKey === 'Observações') {
                            data.cell.styles.fillColor = NC_BG_COLOR;
                        }
                    }
                    
                    if (item.hydrostaticTestDate && isSameMonth(parseISO(item.hydrostaticTestDate), generationDate) && isSameYear(parseISO(item.hydrostaticTestDate), generationDate)) {
                         data.row.styles.fillColor = EXPIRING_BG_COLOR;
                    }
                }
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
        resolve();
    });
}

export async function generateClientPdfReport(client: Client, buildings: Building[]) {
    return new Promise<void>((resolve) => {
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
            headStyles: { fillColor: HEADER_BG_COLOR },
            bodyStyles: { halign: 'center' },
            styles: { halign: 'center', fontSize: 8, cellPadding: 1.5 },
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
                didDrawCell: (data) => {
                    if (data.section === 'body') {
                        const item = allExtinguishers[data.row.index];
                        if (!item) return;

                        if (item.expiryDate && isSameMonth(parseISO(item.expiryDate), generationDate) && isSameYear(parseISO(item.expiryDate), generationDate)) {
                            doc.setFillColor(EXPIRING_BG_COLOR[0], EXPIRING_BG_COLOR[1], EXPIRING_BG_COLOR[2]);
                            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
                        }
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
                didDrawCell: (data) => {
                     if (data.section === 'body') {
                        const item = allHoses[data.row.index];
                        if (!item) return;
                        
                        if (item.hydrostaticTestDate && isSameMonth(parseISO(item.hydrostaticTestDate), generationDate) && isSameYear(parseISO(item.hydrostaticTestDate), generationDate)) {
                           doc.setFillColor(EXPIRING_BG_COLOR[0], EXPIRING_BG_COLOR[1], EXPIRING_BG_COLOR[2]);
                           doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
                        }
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
        resolve();
    });
}


// --- EXPIRY REPORT GENERATORS ---

export async function generateExpiryPdfReport(client: Client, buildings: Building[], month: number, year: number) {
    return new Promise<void>((resolve) => {
        const doc = new jsPDF({
            orientation: 'landscape',
        }) as jsPDFWithAutoTable;

        let finalY = 20;

        const targetMonthName = format(new Date(year, month), 'MMMM', { locale: ptBR });

        // --- Header ---
        doc.setFontSize(20);
        doc.text(`Relatório de Vencimentos - ${targetMonthName.charAt(0).toUpperCase() + targetMonthName.slice(1)}/${year}`, 14, finalY);
        finalY += 10;
        doc.setFontSize(11);
        doc.text(`Cliente: ${client.name}`, 14, finalY);
        finalY += 5;
        doc.text(`Gerado em: ${format(new Date(), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}`, 14, finalY);
        finalY += 10;

        const tableStyles = {
            theme: 'striped',
            headStyles: { fillColor: HEADER_BG_COLOR },
            bodyStyles: { halign: 'center' },
            styles: { halign: 'center', fontSize: 8, cellPadding: 1.5 },
        };
        
        const filterByMonthYear = (dateStr: string) => {
            if (!dateStr) return false;
            try {
                const date = parseISO(dateStr);
                return date.getMonth() === month && date.getFullYear() === year;
            } catch { return false; }
        };

        // --- Expiring Extinguishers ---
        const expiringExtinguishers = buildings
            .flatMap(b => (b.extinguishers || []).map(e => ({ ...e, buildingName: b.name })))
            .filter(e => filterByMonthYear(e.expiryDate));

        if (expiringExtinguishers.length > 0) {
            doc.setFontSize(14);
            doc.text("Extintores a Vencer", 14, finalY);
            finalY += 8;

            doc.autoTable({
                ...tableStyles,
                startY: finalY,
                head: [['ID', 'Prédio', 'Local', 'Tipo', 'Carga (kg)', 'Data de Recarga', 'Ano Test. Hidro.']],
                body: expiringExtinguishers.map(e => [
                    e.id, e.buildingName, e.observations || '', e.type, e.weight,
                    formatDate(e.expiryDate), e.hydrostaticTestYear,
                ]),
            });
            finalY = (doc as any).lastAutoTable.finalY + 10;
        }

        // --- Expiring Hoses ---
        const expiringHoses = buildings
            .flatMap(b => (b.hoses || []).map(h => ({ ...h, buildingName: b.name })))
            .filter(h => filterByMonthYear(h.hydrostaticTestDate));
        
        if (expiringHoses.length > 0) {
            doc.setFontSize(14);
            doc.text("Hidrantes a Vencer", 14, finalY);
            finalY += 8;

            doc.autoTable({
                ...tableStyles,
                startY: finalY,
                head: [['ID', 'Prédio', 'Local', 'Qtd Mang.', 'Tipo', 'Diâmetro', 'Medida (m)', 'Próx. Teste Hidr.']],
                body: expiringHoses.map(h => [
                    h.id, h.buildingName, h.location, h.quantity, h.hoseType,
                    h.diameter, h.hoseLength, formatDate(h.hydrostaticTestDate),
                ]),
            });
            finalY = (doc as any).lastAutoTable.finalY + 10;
        }

        if (expiringExtinguishers.length === 0 && expiringHoses.length === 0) {
            doc.text(`Nenhum item encontrado com vencimento em ${targetMonthName}/${year}.`, 14, finalY);
        }
        
        const fileName = `Relatorio_Vencimentos_${String(month + 1).padStart(2, '0')}-${year}_${client.name.replace(/ /g, '_')}.pdf`;
        doc.save(fileName);
        resolve();
    });
}
