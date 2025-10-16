
"use client";

import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Extinguisher, Hydrant, Client, Building, ManualInspection } from '@/lib/types';

function escapeCsvCell(cell: string | number | null | undefined): string {
    const cellStr = String(cell ?? '');
    if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
    }
    return cellStr;
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


export function generateCsvReport(client: Client, building: Building, extinguishers: Extinguisher[], hoses: Hydrant[]) {
    let csvContent = '';

    csvContent += `"Relatório de Inspeção"\n`;
    csvContent += `Cliente:,${escapeCsvCell(client.name)}\n`;
    csvContent += `Local:,${escapeCsvCell(building.name)}\n`;
    csvContent += `Gerado em:,${escapeCsvCell(format(new Date(), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR }))}\n\n`;

    csvContent += `"Extintores"\n`;
    const extHeader = ['ID', 'Local', 'Tipo', 'Capacidade (kg)', 'Recarga', 'Test. Hidrostático', 'Status', 'Data Últ. Insp.', 'Hora Últ. Insp.', 'GPS Últ. Insp.', 'Observações'];
    csvContent += extHeader.map(escapeCsvCell).join(',') + '\n';
    extinguishers.forEach(e => {
        const insp = formatLastInspectionForCsv(e.inspections?.[e.inspections.length - 1]);
        const row = [
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
        csvContent += row.map(escapeCsvCell).join(',') + '\n';
    });
    
    csvContent += '\n';

    csvContent += `"Hidrantes"\n`;
    const hoseHeader = ['ID', 'Local', 'Qtd Mang.', 'Tipo', 'Diâmetro', 'Medida (m)', 'Chave', 'Esguicho', 'Próx. Teste', 'Status', 'Data Últ. Insp.', 'Hora Últ. Insp.', 'GPS Últ. Insp.', 'Observações'];
    csvContent += hoseHeader.map(escapeCsvCell).join(',') + '\n';
    hoses.forEach(h => {
        const insp = formatLastInspectionForCsv(h.inspections?.[h.inspections.length - 1]);
        const row = [
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
        csvContent += row.map(escapeCsvCell).join(',') + '\n';
    });

    csvContent += '\n';

    if(building.manualInspections && building.manualInspections.length > 0) {
        csvContent += `"Registros Manuais e Falhas de Leitura"\n`;
        const manualHeader = ['ID Manual', 'Data', 'Hora', 'GPS', 'Status', 'Observações'];
        csvContent += manualHeader.map(escapeCsvCell).join(',') + '\n';
        building.manualInspections.forEach(insp => {
             const formattedInsp = formatLastInspectionForCsv(insp);
             const row = [
                (insp as ManualInspection).manualId,
                formattedInsp.date,
                formattedInsp.time,
                formattedInsp.gps,
                formattedInsp.status,
                formattedInsp.notes,
             ];
             csvContent += row.map(escapeCsvCell).join(',') + '\n';
        });
    }

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const fileName = `Relatorio_${client.name.replace(/ /g, '_')}_${building.name.replace(/ /g, '_')}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
