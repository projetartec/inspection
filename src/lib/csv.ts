
'use client';

import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Extinguisher, Hydrant, Client, Building, ManualInspection } from '@/lib/types';
import * as XLSX from 'xlsx';


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


export async function generateXlsxReport(client: Client, building: Building, extinguishers: Extinguisher[], hoses: Hydrant[]) {
    // Wrap in promise to make it async and unblock UI thread
    return new Promise<void>((resolve) => {
        const wb = XLSX.utils.book_new();

        // --- Extinguishers Sheet ---
        const extHeader = ['ID', 'Local', 'Tipo', 'Capacidade (kg)', 'Recarga', 'Test. Hidrostático', 'Status', 'Data Últ. Insp.', 'Hora Últ. Insp.', 'GPS Últ. Insp.', 'Observações'];
        const extBody = (extinguishers || []).map(e => {
            const insp = formatLastInspectionForCsv(e.inspections?.[e.inspections.length - 1]);
            return [
                e.id,
                e.observations,
                e.type,
                e.weight,
                formatDate(e.expiryDate),
                e.hydrostaticTestYear,
                insp.status,
                insp.date,
                insp.time,
                insp.gps,
                insp.notes,
            ];
        });
        const wsExt = XLSX.utils.aoa_to_sheet([extHeader, ...extBody]);
        XLSX.utils.book_append_sheet(wb, wsExt, 'Extintores');

        // --- Hoses Sheet ---
        const hoseHeader = ['ID', 'Local', 'Qtd Mang.', 'Tipo', 'Diâmetro', 'Medida (m)', 'Chave', 'Esguicho', 'Próx. Teste', 'Status', 'Data Últ. Insp.', 'Hora Últ. Insp.', 'GPS Últ. Insp.', 'Observações'];
        const hoseBody = (hoses || []).map(h => {
            const insp = formatLastInspectionForCsv(h.inspections?.[h.inspections.length - 1]);
            return [
                h.id,
                h.location,
                h.quantity,
                'Tipo ' + h.hoseType,
                h.diameter + '"',
                h.hoseLength,
                h.keyQuantity,
                h.nozzleQuantity,
                formatDate(h.hydrostaticTestDate),
                insp.status,
                insp.date,
                insp.time,
                insp.gps,
                insp.notes,
            ];
        });
        const wsHose = XLSX.utils.aoa_to_sheet([hoseHeader, ...hoseBody]);
        XLSX.utils.book_append_sheet(wb, wsHose, 'Hidrantes');
        
        // --- Manual Inspections Sheet ---
        if(building.manualInspections && building.manualInspections.length > 0) {
            const manualHeader = ['ID Manual', 'Data', 'Hora', 'GPS', 'Status', 'Observações'];
            const manualBody = building.manualInspections.map(insp => {
                 const formattedInsp = formatLastInspectionForCsv(insp);
                 return [
                    (insp as ManualInspection).manualId,
                    formattedInsp.date,
                    formattedInsp.time,
                    formattedInsp.gps,
                    formattedInsp.status,
                    formattedInsp.notes,
                 ];
            });
            const wsManual = XLSX.utils.aoa_to_sheet([manualHeader, ...manualBody]);
            XLSX.utils.book_append_sheet(wb, wsManual, 'Falhas de Leitura');
        }

        const fileName = `Relatorio_${client.name.replace(/ /g, '_')}_${building.name.replace(/ /g, '_')}.xlsx`;
        XLSX.writeFile(wb, fileName);
        resolve();
    });
}

export async function generateClientXlsxReport(client: Client, buildings: Building[]) {
    // Wrap in promise to make it async and unblock UI thread
    return new Promise<void>((resolve) => {
        const wb = XLSX.utils.book_new();

        // --- Extinguishers Section ---
        const extHeader = ['ID', 'Prédio', 'Local', 'Tipo', 'Carga (kg)', 'Recarga', 'Test. Hidrostático', 'Status Últ. Insp.', 'Data Últ. Insp.', 'Observações Últ. Insp.'];
        const allExtinguishers = buildings.flatMap(b => (b.extinguishers || []).map(e => ({ ...e, buildingName: b.name })));
        const extBody = allExtinguishers.map(e => {
            const insp = formatLastInspectionForCsv(e.inspections?.[e.inspections.length - 1]);
            return [
                e.id, e.buildingName, e.observations, e.type, e.weight,
                formatDate(e.expiryDate), e.hydrostaticTestYear, insp.status, insp.date, insp.notes,
            ];
        });
        const wsExt = XLSX.utils.aoa_to_sheet([extHeader, ...extBody]);
        XLSX.utils.book_append_sheet(wb, wsExt, 'Extintores');


        // --- Hoses Section ---
        const hoseHeader = ['ID', 'Prédio', 'Local', 'Qtd Mangueiras', 'Tipo', 'Diâmetro', 'Medida (m)', 'Qtd Chaves', 'Qtd Esguichos', 'Próx. Teste Hidr.', 'Status Últ. Insp.', 'Data Últ. Insp.', 'Observações Últ. Insp.'];
        const allHoses = buildings.flatMap(b => (b.hoses || []).map(h => ({ ...h, buildingName: b.name })));
        const hoseBody = allHoses.map(h => {
            const insp = formatLastInspectionForCsv(h.inspections?.[h.inspections.length - 1]);
            return [
                h.id, h.buildingName, h.location, h.quantity, h.hoseType, h.diameter, h.hoseLength,
                h.keyQuantity, h.nozzleQuantity, formatDate(h.hydrostaticTestDate),
                insp.status, insp.date, insp.notes,
            ];
        });
        const wsHose = XLSX.utils.aoa_to_sheet([hoseHeader, ...hoseBody]);
        XLSX.utils.book_append_sheet(wb, wsHose, 'Hidrantes');
        
        const fileName = `Relatorio_Consolidado_${client.name.replace(/ /g, '_')}.xlsx`;
        XLSX.writeFile(wb, fileName);
        resolve();
    });
}
