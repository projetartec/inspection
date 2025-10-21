
'use client';

import { format, parseISO, isSameMonth, isSameYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Extinguisher, Hydrant, Client, Building, ManualInspection } from '@/lib/types';
import * as XLSX from 'xlsx';

// --- HELPERS & STYLES ---

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

function applyAutoFilter(ws: XLSX.WorkSheet, cols: number) {
    if (!ws['!ref']) return;
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: cols - 1, r: 0 } }) };
}

// --- MAIN REPORT GENERATORS ---

export async function generateXlsxReport(client: Client, building: Building, extinguishers: Extinguisher[], hoses: Hydrant[]) {
    return new Promise<void>((resolve) => {
        const wb = XLSX.utils.book_new();
        const generationDate = new Date();

        // --- Extinguishers Sheet ---
        const extHeader = ['Alerta', 'ID', 'Local', 'Tipo', 'Capacidade (kg)', 'Recarga', 'Test. Hidrostático', 'Status', 'Data Últ. Insp.', 'GPS Últ. Insp.', 'Observações'];
        const extBody = (extinguishers || []).map(e => {
            const insp = formatLastInspectionForCsv(e.inspections?.[e.inspections.length - 1]);
            let alert = '';
            if (insp.status === 'N/C') alert = 'NÃO CONFORME';
            if (e.expiryDate && isSameMonth(parseISO(e.expiryDate), generationDate) && isSameYear(parseISO(e.expiryDate), generationDate)) {
                 alert = alert ? `${alert} / VENCE ESTE MÊS` : 'VENCE ESTE MÊS';
            }
            return [alert, e.id, e.observations, e.type, e.weight, formatDate(e.expiryDate), e.hydrostaticTestYear, insp.status, insp.date, insp.gps, insp.notes];
        });
        const wsExt = XLSX.utils.aoa_to_sheet([extHeader, ...extBody]);
        applyAutoFilter(wsExt, extHeader.length);
        XLSX.utils.book_append_sheet(wb, wsExt, 'Extintores');

        // --- Hoses Sheet ---
        const hoseHeader = ['Alerta', 'ID', 'Local', 'Qtd Mang.', 'Tipo', 'Diâmetro', 'Medida (m)', 'Chave', 'Esguicho', 'Próx. Teste', 'Status', 'Data Últ. Insp.', 'GPS Últ. Insp.', 'Observações'];
        const hoseBody = (hoses || []).map(h => {
            const insp = formatLastInspectionForCsv(h.inspections?.[h.inspections.length - 1]);
            let alert = '';
            if (insp.status === 'N/C') alert = 'NÃO CONFORME';
            if (h.hydrostaticTestDate && isSameMonth(parseISO(h.hydrostaticTestDate), generationDate) && isSameYear(parseISO(h.hydrostaticTestDate), generationDate)) {
                 alert = alert ? `${alert} / VENCE ESTE MÊS` : 'VENCE ESTE MÊS';
            }
            return [alert, h.id, h.location, h.quantity, 'Tipo ' + h.hoseType, h.diameter + '"', h.hoseLength, h.keyQuantity, h.nozzleQuantity, formatDate(h.hydrostaticTestDate), insp.status, insp.date, insp.gps, insp.notes];
        });
        const wsHose = XLSX.utils.aoa_to_sheet([hoseHeader, ...hoseBody]);
        applyAutoFilter(wsHose, hoseHeader.length);
        XLSX.utils.book_append_sheet(wb, wsHose, 'Hidrantes');
        
        // --- Manual Inspections Sheet ---
        if(building.manualInspections && building.manualInspections.length > 0) {
            const manualHeader = ['ID Manual', 'Data', 'GPS', 'Status', 'Observações'];
            const manualBody = building.manualInspections.map(insp => {
                 const formattedInsp = formatLastInspectionForCsv(insp);
                 return [ (insp as ManualInspection).manualId, formattedInsp.date, formattedInsp.gps, formattedInsp.status, formattedInsp.notes ];
            });
            const wsManual = XLSX.utils.aoa_to_sheet([manualHeader, ...manualBody]);
            applyAutoFilter(wsManual, manualHeader.length);
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
       
        // --- Extinguishers Section ---
        const extHeader = ['Alerta', 'ID', 'Prédio', 'Local', 'Tipo', 'Carga (kg)', 'Recarga', 'Test. Hidrostático', 'Status Últ. Insp.', 'Data Últ. Insp.', 'Observações Últ. Insp.'];
        const allExtinguishers = buildings.flatMap(b => (b.extinguishers || []).map(e => ({ ...e, buildingName: b.name })));
        const extBody = allExtinguishers.map(e => {
            const insp = formatLastInspectionForCsv(e.inspections?.[e.inspections.length - 1]);
            let alert = '';
            if (insp.status === 'N/C') alert = 'NÃO CONFORME';
            if (e.expiryDate && isSameMonth(parseISO(e.expiryDate), generationDate) && isSameYear(parseISO(e.expiryDate), generationDate)) {
                 alert = alert ? `${alert} / VENCE ESTE MÊS` : 'VENCE ESTE MÊS';
            }
            return [alert, e.id, e.buildingName, e.observations, e.type, e.weight, formatDate(e.expiryDate), e.hydrostaticTestYear, insp.status, insp.date, insp.notes];
        });
        const wsExt = XLSX.utils.aoa_to_sheet([extHeader, ...extBody]);
        applyAutoFilter(wsExt, extHeader.length);
        XLSX.utils.book_append_sheet(wb, wsExt, 'Extintores');

        // --- Hoses Section ---
        const hoseHeader = ['Alerta', 'ID', 'Prédio', 'Local', 'Qtd Mangueiras', 'Tipo', 'Diâmetro', 'Medida (m)', 'Qtd Chaves', 'Qtd Esguichos', 'Próx. Teste Hidr.', 'Status Últ. Insp.', 'Data Últ. Insp.', 'Observações Últ. Insp.'];
        const allHoses = buildings.flatMap(b => (b.hoses || []).map(h => ({ ...h, buildingName: b.name })));
        const hoseBody = allHoses.map(h => {
            const insp = formatLastInspectionForCsv(h.inspections?.[h.inspections.length - 1]);
             let alert = '';
            if (insp.status === 'N/C') alert = 'NÃO CONFORME';
            if (h.hydrostaticTestDate && isSameMonth(parseISO(h.hydrostaticTestDate), generationDate) && isSameYear(parseISO(h.hydrostaticTestDate), generationDate)) {
                 alert = alert ? `${alert} / VENCE ESTE MÊS` : 'VENCE ESTE MÊS';
            }
            return [ alert, h.id, h.buildingName, h.location, h.quantity, h.hoseType, h.diameter, h.hoseLength, h.keyQuantity, h.nozzleQuantity, formatDate(h.hydrostaticTestDate), insp.status, insp.date, insp.notes ];
        });
        const wsHose = XLSX.utils.aoa_to_sheet([hoseHeader, ...hoseBody]);
        applyAutoFilter(wsHose, hoseHeader.length);
        XLSX.utils.book_append_sheet(wb, wsHose, 'Hidrantes');
        
        const fileName = `Relatorio_Consolidado_${client.name.replace(/ /g, '_')}.xlsx`;
        XLSX.writeFile(wb, fileName);
        resolve();
    });
}


// --- EXPIRY REPORT GENERATORS ---

export async function generateExpiryXlsxReport(client: Client, buildings: Building[], month: number, year: number) {
    return new Promise<void>((resolve) => {
        const wb = XLSX.utils.book_new();

        const filterByMonthYear = (dateStr: string) => {
            if (!dateStr) return false;
            try {
                const date = parseISO(dateStr);
                return date.getMonth() === month && date.getFullYear() === year;
            } catch { return false; }
        };

        // --- Expiring Extinguishers ---
        const extHeader = ['ID', 'Prédio', 'Local', 'Tipo', 'Carga (kg)', 'Recarga', 'Test. Hidrostático'];
        const expiringExtinguishers = buildings
            .flatMap(b => (b.extinguishers || []).map(e => ({ ...e, buildingName: b.name })))
            .filter(e => filterByMonthYear(e.expiryDate));
        
        if (expiringExtinguishers.length > 0) {
            const extBody = expiringExtinguishers.map(e => [e.id, e.buildingName, e.observations, e.type, e.weight, formatDate(e.expiryDate), e.hydrostaticTestYear]);
            const wsExt = XLSX.utils.aoa_to_sheet([extHeader, ...extBody]);
            applyAutoFilter(wsExt, extHeader.length);
            XLSX.utils.book_append_sheet(wb, wsExt, 'Extintores a Vencer');
        }

        // --- Expiring Hoses ---
        const hoseHeader = ['ID', 'Prédio', 'Local', 'Qtd Mangueiras', 'Tipo', 'Diâmetro', 'Medida (m)', 'Próx. Teste Hidr.'];
        const expiringHoses = buildings
            .flatMap(b => (b.hoses || []).map(h => ({ ...h, buildingName: b.name })))
            .filter(h => filterByMonthYear(h.hydrostaticTestDate));
            
        if (expiringHoses.length > 0) {
            const hoseBody = expiringHoses.map(h => [h.id, h.buildingName, h.location, h.quantity, h.hoseType, h.diameter, h.hoseLength, formatDate(h.hydrostaticTestDate)]);
            const wsHose = XLSX.utils.aoa_to_sheet([hoseHeader, ...hoseBody]);
            applyAutoFilter(wsHose, hoseHeader.length);
            XLSX.utils.book_append_sheet(wb, wsHose, 'Hidrantes a Vencer');
        }
        
        if (expiringExtinguishers.length === 0 && expiringHoses.length === 0) {
             const wsEmpty = XLSX.utils.aoa_to_sheet([[`Nenhum item encontrado com vencimento em ${String(month + 1).padStart(2, '0')}/${year}`]]);
             XLSX.utils.book_append_sheet(wb, wsEmpty, 'Vencimentos');
        }

        const fileName = `Relatorio_Vencimentos_${String(month + 1).padStart(2, '0')}-${year}_${client.name.replace(/ /g, '_')}.xlsx`;
        XLSX.writeFile(wb, fileName);
        resolve();
    });
}

    