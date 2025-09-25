
"use client";

import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Extinguisher, Hydrant, Client, Building } from '@/lib/types';

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
    if (!inspection?.date) return { date: 'N/A', time: 'N/A', gps: 'N/A', status: 'N/A' };
    const date = parseISO(inspection.date);
    return {
        date: format(date, 'dd/MM/yyyy', { locale: ptBR }),
        time: format(date, 'HH:mm', { locale: ptBR }),
        gps: inspection.location ? `${inspection.location.latitude}, ${inspection.location.longitude}` : 'N/A',
        status: inspection.status || 'N/A',
    };
}


export function generateCsvReport(client: Client, building: Building, extinguishers: Extinguisher[], hoses: Hydrant[]) {
    let csvContent = '';

    csvContent += `"Relatório de Inspeção"\n`;
    csvContent += `Cliente:,${escapeCsvCell(client.name)}\n`;
    csvContent += `Local:,${escapeCsvCell(building.name)}\n`;
    csvContent += `Gerado em:,${escapeCsvCell(format(new Date(), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR }))}\n\n`;

    csvContent += `"Extintores"\n`;
    const extHeader = ['ID', 'Tipo', 'Capacidade (kg)', 'Recarga', 'Test. Hidrostático', 'Localização', 'Status Últ. Insp.', 'Data Últ. Insp.', 'Hora Últ. Insp.', 'GPS Últ. Insp.'];
    csvContent += extHeader.map(escapeCsvCell).join(',') + '\n';
    extinguishers.forEach(e => {
        const insp = formatLastInspectionForCsv(e.inspections?.[e.inspections.length - 1]);
        const row = [
            e.id,
            e.type,
            e.weight,
            formatDate(e.expiryDate),
            e.hydrostaticTestYear,
            e.observations,
            insp.status,
            insp.date,
            insp.time,
            insp.gps,
        ];
        csvContent += row.map(escapeCsvCell).join(',') + '\n';
    });
    
    csvContent += '\n';

    csvContent += `"Hidrantes"\n`;
    const hoseHeader = ['ID', 'Local', 'Qtd Mang.', 'Tipo', 'Diâmetro', 'Chave', 'Esguicho', 'Próx. Teste', 'Status Últ. Insp.', 'Data Últ. Insp.', 'Hora Últ. Insp.', 'GPS Últ. Insp.'];
    csvContent += hoseHeader.map(escapeCsvCell).join(',') + '\n';
    hoses.forEach(h => {
        const insp = formatLastInspectionForCsv(h.inspections?.[h.inspections.length - 1]);
        const row = [
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
        csvContent += row.map(escapeCsvCell).join(',') + '\n';
    });

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
