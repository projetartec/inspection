
'use client';

import { format, parseISO, isSameMonth, isSameYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Extinguisher, Hydrant, Client, Building, ManualInspection } from '@/lib/types';
import * as XLSX from 'xlsx';

// --- STYLES ---
const headerStyle = {
    font: { bold: true },
    fill: { fgColor: { rgb: "D0CECE" } },
    alignment: { horizontal: "center", vertical: "center" }
};
const centerStyle = {
    alignment: { horizontal: "center", vertical: "center", wrapText: true }
};
const expiringStyle = {
    ...centerStyle,
    fill: { fgColor: { rgb: "FF6969" } }
};
const ncRowStyle = {
    ...centerStyle,
    font: { bold: true },
};
const ncNotesStyle = {
    ...ncRowStyle,
    fill: { fgColor: { rgb: "FCFA98" } }
};

function formatDate(dateInput: string | null | undefined): string {
    if (!dateInput) return 'N/A';
    try {
        const date = parseISO(dateInput);
        return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
        return 'Data Inválida';
    }
}

function formatLastInspectionForCsv(inspection: any) {
    if (!inspection?.date) return { date: 'N/A', time: 'N/A', gps: 'N/A', status: 'N/A', notes: '' };
    const date = parseISO(inspection.date);
    return {
        date: format(date, 'dd/MM/yyyy', { locale: ptBR }),
        time: format(date, 'HH:mm', { locale: ptBR }),
        gps: inspection.location ? `${inspection.location.latitude}, ${inspection.location.longitude}` : 'N/A',
        status: inspection.status || 'N/A',
        notes: inspection.notes || '',
    };
}

function applyStylesAndAutoFilter(ws: XLSX.WorkSheet, headerRows: number, dataRows: number, cols: number) {
    if (!ws['!ref']) return;
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    // AutoFilter
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: cols - 1, r: 0 } }) };

    // Column widths
    const colWidths = Array(cols).fill({ wch: 15 });
    ws['!cols'] = colWidths;
    
    // Apply header style
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_address = XLSX.utils.encode_cell({ c: C, r: 0 });
        if (ws[cell_address]) {
            ws[cell_address].s = headerStyle;
        }
    }
}

export async function generateXlsxReport(client: Client, building: Building, extinguishers: Extinguisher[], hoses: Hydrant[]) {
    return new Promise<void>((resolve) => {
        const wb = XLSX.utils.book_new();
        const generationDate = new Date();

        const isExpiring = (dateStr: string) => {
            if (!dateStr) return false;
            try {
                const date = parseISO(dateStr);
                return isSameMonth(date, generationDate) && isSameYear(date, generationDate);
            } catch { return false; }
        };

        // --- Extinguishers Sheet ---
        const extHeader = ['ID', 'Local', 'Tipo', 'Capacidade (kg)', 'Recarga', 'Test. Hidrostático', 'Status', 'Data Últ. Insp.', 'Hora Últ. Insp.', 'GPS Últ. Insp.', 'Observações'];
        const extBody = (extinguishers || []).map(e => {
            const insp = formatLastInspectionForCsv(e.inspections?.[e.inspections.length - 1]);
            return {
                data: [e.id, e.observations, e.type, e.weight, formatDate(e.expiryDate), e.hydrostaticTestYear, insp.status, insp.date, insp.time, insp.gps, insp.notes],
                isNc: insp.status === 'N/C',
                isExpiring: isExpiring(e.expiryDate)
            };
        });
        const wsExt = XLSX.utils.aoa_to_sheet([extHeader]);
        extBody.forEach((row, rowIndex) => {
            XLSX.utils.sheet_add_aoa(wsExt, [row.data], { origin: -1 });
            const r = rowIndex + 1;
            for (let c = 0; c < row.data.length; c++) {
                const cell_address = XLSX.utils.encode_cell({ c, r });
                if (!wsExt[cell_address]) continue;

                let style = { ...centerStyle };
                if (row.isExpiring) style = { ...expiringStyle };
                if (row.isNc) {
                    style = { ...ncRowStyle };
                    if (c === 10) { // 'Observações' column
                        style = { ...ncNotesStyle };
                    }
                }
                wsExt[cell_address].s = style;
            }
        });
        applyStylesAndAutoFilter(wsExt, 1, extBody.length, extHeader.length);
        XLSX.utils.book_append_sheet(wb, wsExt, 'Extintores');

        // --- Hoses Sheet ---
        const hoseHeader = ['ID', 'Local', 'Qtd Mang.', 'Tipo', 'Diâmetro', 'Medida (m)', 'Chave', 'Esguicho', 'Próx. Teste', 'Status', 'Data Últ. Insp.', 'Hora Últ. Insp.', 'GPS Últ. Insp.', 'Observações'];
        const hoseBody = (hoses || []).map(h => {
            const insp = formatLastInspectionForCsv(h.inspections?.[h.inspections.length - 1]);
            return {
                data: [h.id, h.location, h.quantity, 'Tipo ' + h.hoseType, h.diameter + '"', h.hoseLength, h.keyQuantity, h.nozzleQuantity, formatDate(h.hydrostaticTestDate), insp.status, insp.date, insp.time, insp.gps, insp.notes],
                isNc: insp.status === 'N/C',
                isExpiring: isExpiring(h.hydrostaticTestDate)
            };
        });
        const wsHose = XLSX.utils.aoa_to_sheet([hoseHeader]);
        hoseBody.forEach((row, rowIndex) => {
            XLSX.utils.sheet_add_aoa(wsHose, [row.data], { origin: -1 });
            const r = rowIndex + 1;
            for (let c = 0; c < row.data.length; c++) {
                const cell_address = XLSX.utils.encode_cell({ c, r });
                if (!wsHose[cell_address]) continue;

                let style = { ...centerStyle };
                if (row.isExpiring) style = { ...expiringStyle };
                if (row.isNc) {
                    style = { ...ncRowStyle };
                    if (c === 13) { // 'Observações' column
                        style = { ...ncNotesStyle };
                    }
                }
                wsHose[cell_address].s = style;
            }
        });
        applyStylesAndAutoFilter(wsHose, 1, hoseBody.length, hoseHeader.length);
        XLSX.utils.book_append_sheet(wb, wsHose, 'Hidrantes');
        
        // --- Manual Inspections Sheet ---
        if(building.manualInspections && building.manualInspections.length > 0) {
            const manualHeader = ['ID Manual', 'Data', 'Hora', 'GPS', 'Status', 'Observações'];
            const manualBody = building.manualInspections.map(insp => {
                 const formattedInsp = formatLastInspectionForCsv(insp);
                 return [ (insp as ManualInspection).manualId, formattedInsp.date, formattedInsp.time, formattedInsp.gps, formattedInsp.status, formattedInsp.notes ];
            });
            const wsManual = XLSX.utils.aoa_to_sheet([manualHeader, ...manualBody]);
            applyStylesAndAutoFilter(wsManual, 1, manualBody.length, manualHeader.length);
            XLSX.utils.book_append_sheet(wb, wsManual, 'Falhas de Leitura');
        }

        const fileName = `Relatorio_${client.name.replace(/ /g, '_')}_${building.name.replace(/ /g, '_')}.xlsx`;
        XLSX.writeFile(wb, fileName);
        resolve();
    });
}

export async function generateClientXlsxReport(client: Client, buildings: Building[]) {
    return new Promise<void>((resolve) => {
        const wb = XLSX.utils.book_new();
        const generationDate = new Date();

        const isExpiring = (dateStr: string) => {
            if (!dateStr) return false;
            try {
                const date = parseISO(dateStr);
                return isSameMonth(date, generationDate) && isSameYear(date, generationDate);
            } catch { return false; }
        };

        // --- Extinguishers Section ---
        const extHeader = ['ID', 'Prédio', 'Local', 'Tipo', 'Carga (kg)', 'Recarga', 'Test. Hidrostático', 'Status Últ. Insp.', 'Data Últ. Insp.', 'Observações Últ. Insp.'];
        const allExtinguishers = buildings.flatMap(b => (b.extinguishers || []).map(e => ({ ...e, buildingName: b.name })));
        const extBody = allExtinguishers.map(e => {
            const insp = formatLastInspectionForCsv(e.inspections?.[e.inspections.length - 1]);
            return {
                data: [e.id, e.buildingName, e.observations, e.type, e.weight, formatDate(e.expiryDate), e.hydrostaticTestYear, insp.status, insp.date, insp.notes],
                isNc: insp.status === 'N/C',
                isExpiring: isExpiring(e.expiryDate)
            };
        });
        const wsExt = XLSX.utils.aoa_to_sheet([extHeader]);
        extBody.forEach((row, rowIndex) => {
            XLSX.utils.sheet_add_aoa(wsExt, [row.data], { origin: -1 });
            const r = rowIndex + 1;
            for (let c = 0; c < row.data.length; c++) {
                const cell_address = XLSX.utils.encode_cell({ c, r });
                if (!wsExt[cell_address]) continue;

                let style = { ...centerStyle };
                if (row.isExpiring) style = { ...expiringStyle };
                if (row.isNc) {
                    style = { ...ncRowStyle };
                     if (c === 9) { // 'Observações' column
                        style = { ...ncNotesStyle };
                    }
                }
                wsExt[cell_address].s = style;
            }
        });
        applyStylesAndAutoFilter(wsExt, 1, extBody.length, extHeader.length);
        XLSX.utils.book_append_sheet(wb, wsExt, 'Extintores');

        // --- Hoses Section ---
        const hoseHeader = ['ID', 'Prédio', 'Local', 'Qtd Mangueiras', 'Tipo', 'Diâmetro', 'Medida (m)', 'Qtd Chaves', 'Qtd Esguichos', 'Próx. Teste Hidr.', 'Status Últ. Insp.', 'Data Últ. Insp.', 'Observações Últ. Insp.'];
        const allHoses = buildings.flatMap(b => (b.hoses || []).map(h => ({ ...h, buildingName: b.name })));
        const hoseBody = allHoses.map(h => {
            const insp = formatLastInspectionForCsv(h.inspections?.[h.inspections.length - 1]);
            return {
                data: [ h.id, h.buildingName, h.location, h.quantity, h.hoseType, h.diameter, h.hoseLength, h.keyQuantity, h.nozzleQuantity, formatDate(h.hydrostaticTestDate), insp.status, insp.date, insp.notes ],
                isNc: insp.status === 'N/C',
                isExpiring: isExpiring(h.hydrostaticTestDate)
            };
        });
        const wsHose = XLSX.utils.aoa_to_sheet([hoseHeader]);
        hoseBody.forEach((row, rowIndex) => {
            XLSX.utils.sheet_add_aoa(wsHose, [row.data], { origin: -1 });
            const r = rowIndex + 1;
            for (let c = 0; c < row.data.length; c++) {
                const cell_address = XLSX.utils.encode_cell({ c, r });
                if (!wsHose[cell_address]) continue;

                let style = { ...centerStyle };
                if (row.isExpiring) style = { ...expiringStyle };
                if (row.isNc) {
                    style = { ...ncRowStyle };
                    if (c === 12) { // 'Observações' column
                        style = { ...ncNotesStyle };
                    }
                }
                wsHose[cell_address].s = style;
            }
        });
        applyStylesAndAutoFilter(wsHose, 1, hoseBody.length, hoseHeader.length);
        XLSX.utils.book_append_sheet(wb, wsHose, 'Hidrantes');
        
        const fileName = `Relatorio_Consolidado_${client.name.replace(/ /g, '_')}.xlsx`;
        XLSX.writeFile(wb, fileName);
        resolve();
    });
}
