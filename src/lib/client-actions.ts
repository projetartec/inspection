

'use server';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format, parseISO, isSameMonth, isSameYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Extinguisher, Hydrant, Client, Building, ManualInspection, Inspection } from '@/lib/types';
import * as XLSX from 'xlsx';
import { getReportDataAction } from './actions';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDFWithAutoTable;
}

const NC_BG_COLOR = [252, 250, 152];
const EXPIRING_BG_COLOR = [255, 105, 97];
const HEADER_BG_COLOR = [0, 128, 128];

const EXTINGUISHER_INSPECTION_ITEMS = [
    "Pintura solo", "Sinalização", "Fixação", "Obstrução", "Lacre/Mangueira/Anel/manômetro"
];

function formatDate(dateInput: string | null | undefined): string {
    if (!dateInput) return 'N/A';
    try {
        const date = parseISO(dateInput);
        return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
        return 'Data Inválida';
    }
}

export async function generatePdfReport(clientId: string, buildingId: string, extinguishers: Extinguisher[], hoses: Hydrant[]) {
    const { client, building } = await getReportDataAction(clientId, buildingId);
    
    if (!client || !building) {
        throw new Error("Client or building not found");
    }

    const doc = new jsPDF({
        orientation: 'landscape',
    }) as jsPDFWithAutoTable;

    const generationDate = new Date();
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    let finalY = 20;

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
        styles: { halign: 'center', fontSize: 7, cellPadding: 1.5 },
    };

    if (extinguishers.length > 0) {
        const extHeader = ['ID', 'Local', 'Tipo', 'Carga', 'Recarga', 'Test. Hidro.', ...EXTINGUISHER_INSPECTION_ITEMS, 'Observações'];
        doc.autoTable({
            ...tableStyles,
            startY: finalY,
            head: [extHeader],
            body: extinguishers.map(e => {
                const lastInsp = e.inspections?.[e.inspections.length - 1];
                const inspectionStatus = EXTINGUISHER_INSPECTION_ITEMS.map(item => lastInsp?.itemStatuses?.[item] || 'OK');
                
                return [
                    e.id, 
                    e.observations || '', 
                    e.type, 
                    e.weight + ' kg', 
                    formatDate(e.expiryDate), 
                    e.hydrostaticTestYear,
                    ...inspectionStatus,
                    lastInsp?.notes || '', 
                ];
            }),
            didParseCell: (data) => {
                 const item = extinguishers[data.row.index];
                 if (!item) return;

                if (item.expiryDate && isSameMonth(parseISO(item.expiryDate), generationDate) && isSameYear(parseISO(item.expiryDate), generationDate)) {
                     data.row.styles.fillColor = EXPIRING_BG_COLOR;
                }
                
                const itemStatusStartIndex = 6;
                if (data.column.index >= itemStatusStartIndex && data.column.index < itemStatusStartIndex + EXTINGUISHER_INSPECTION_ITEMS.length) {
                    if (data.cell.text && data.cell.text[0] === 'N/C') {
                        data.cell.styles.fillColor = NC_BG_COLOR;
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            }
        });
        finalY = (doc as any).lastAutoTable.finalY;
    }

    finalY += 10;
     if (finalY > pageHeight - 30) {
        doc.addPage();
        finalY = 20; 
    }

    if (hoses.length > 0) {
         const hoseHeader = ['ID', 'Local', 'Qtd Mang.', 'Tipo', 'Diâmetro', 'Medida', 'Chave', 'Esguicho', 'Próx. Teste', 'Status', 'Observações'];
        doc.autoTable({
            ...tableStyles,
            startY: finalY,
            head: [hoseHeader],
            body: hoses.map(h => {
                 const lastInsp = h.inspections?.[h.inspections.length - 1];
                 const status = lastInsp?.status || 'N/A';
                 const observationNotes = lastInsp?.notes || '';

                return [
                    h.id, h.location, h.quantity, 'Tipo ' + h.hoseType, h.diameter + '"', h.hoseLength + 'm',
                    h.keyQuantity, h.nozzleQuantity, formatDate(h.hydrostaticTestDate), status, observationNotes
                ];
            }),
             didParseCell: (data) => {
                 const item = hoses[data.row.index];
                 if (!item) return;
                
                if (item.hydrostaticTestDate && isSameMonth(parseISO(item.hydrostaticTestDate), generationDate) && isSameYear(parseISO(item.hydrostaticTestDate), generationDate)) {
                     data.row.styles.fillColor = EXPIRING_BG_COLOR;
                }

                if (data.column.index === 9 && data.cell.text && data.cell.text[0] === 'N/C') {
                    data.cell.styles.fillColor = NC_BG_COLOR;
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        });
         finalY = (doc as any).lastAutoTable.finalY;
    }
    
    const fileName = `Relatorio_Inspecao_${client.name.replace(/ /g, '_')}_${building.name.replace(/ /g, '_')}.pdf`;
    doc.save(fileName);
}

export async function generateXlsxReport(clientId: string, buildingId: string, extinguishers: Extinguisher[], hoses: Hydrant[]) {
    const { client, building } = await getReportDataAction(clientId, buildingId);
    
    if (!client || !building) {
        throw new Error("Client or building not found");
    }

    const wb = XLSX.utils.book_new();
    const generationDate = new Date();

    const extHeader = ['Alerta', 'ID', 'Local', 'Tipo', 'Carga (kg)', 'Recarga', 'Test. Hidrostático', ...EXTINGUISHER_INSPECTION_ITEMS, 'Observações'];
    const extBody = (extinguishers || []).map(e => {
        const lastInsp = e.inspections?.[e.inspections.length - 1];
        let alert = '';
        
        const inspectionStatus = EXTINGUISHER_INSPECTION_ITEMS.map(item => lastInsp?.itemStatuses?.[item] || 'OK');
        
        if (inspectionStatus.includes('N/C')) {
            alert = 'NÃO CONFORME';
        }
        if (e.expiryDate && isSameMonth(parseISO(e.expiryDate), generationDate) && isSameYear(parseISO(e.expiryDate), generationDate)) {
             alert = alert ? `${alert} / VENCE ESTE MÊS` : 'VENCE ESTE MÊS';
        }

        return [alert, e.id, e.observations, e.type, e.weight, formatDate(e.expiryDate), e.hydrostaticTestYear, ...inspectionStatus, lastInsp?.notes || ''];
    });
    const wsExt = XLSX.utils.aoa_to_sheet([extHeader, ...extBody]);
    if (wsExt['!ref']) wsExt['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: extHeader.length - 1, r: 0 } }) };
    XLSX.utils.book_append_sheet(wb, wsExt, 'Extintores');

    const hoseHeader = ['Alerta', 'ID', 'Local', 'Qtd Mang.', 'Tipo', 'Diâmetro', 'Medida (m)', 'Chave', 'Esguicho', 'Próx. Teste', 'Status', 'Observações'];
    const hoseBody = (hoses || []).map(h => {
        const insp = h.inspections?.[h.inspections.length - 1];
        const status = insp?.status ?? 'N/A';
        const observationNotes = insp?.notes || '';
        let alert = '';
        if (status === 'N/C') alert = 'NÃO CONFORME';
        if (h.hydrostaticTestDate && isSameMonth(parseISO(h.hydrostaticTestDate), generationDate) && isSameYear(parseISO(h.hydrostaticTestDate), generationDate)) {
             alert = alert ? `${alert} / VENCE ESTE MÊS` : 'VENCE ESTE MÊS';
        }
        return [alert, h.id, h.location, h.quantity, 'Tipo ' + h.hoseType, h.diameter + '"', h.hoseLength, h.keyQuantity, h.nozzleQuantity, formatDate(h.hydrostaticTestDate), status, observationNotes];
    });
    const wsHose = XLSX.utils.aoa_to_sheet([hoseHeader, ...hoseBody]);
    if (wsHose['!ref']) wsHose['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: hoseHeader.length - 1, r: 0 } }) };
    XLSX.utils.book_append_sheet(wb, wsHose, 'Hidrantes');
    
    const fileName = `Relatorio_Inspecao_${client.name.replace(/ /g, '_')}_${building.name.replace(/ /g, '_')}.xlsx`;
    XLSX.writeFile(wb, fileName);
}
