
"use client";

import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Extinguisher, Hose, Client, Building } from '@/lib/types';

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

function formatInspectionDate(inspection: any): string {
    if (!inspection?.date) return 'N/A';
    const date = parseISO(inspection.date);
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
}

function formatInspectionTime(inspection: any): string {
    if (!inspection?.date) return 'N/A';
    const date = parseISO(inspection.date);
    return format(date, 'HH:mm:ss', { locale: ptBR });
}

function formatInspectionLocation(inspection: any): string {
    if (!inspection?.location) return 'N/A';
    return `${inspection.location.latitude}, ${inspection.location.longitude}`;
}


export function generateCsvReport(client: Client, building: Building, extinguishers: Extinguisher[], hoses: Hose[]) {
    let csvContent = '';

    csvContent += `"Relatório de Inspeção"\n`;
    csvContent += `Cliente:,${escapeCsvCell(client.name)}\n`;
    csvContent += `Local:,${escapeCsvCell(building.name)}\n`;
    csvContent += `Gerado em:,${escapeCsvCell(format(new Date(), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR }))}\n\n`;

    csvContent += `"Extintores"\n`;
    const extHeader = ['ID', 'Tipo', 'Capacidade (kg)', 'Recarga', 'Test. Hidrostático', 'Localização', 'Data Últ. Inspeção', 'Hora Últ. Inspeção', 'GPS Últ. Inspeção'];
    csvContent += extHeader.join(',') + '\n';
    extinguishers.forEach(e => {
        const lastInspection = e.inspections?.[e.inspections.length - 1];
        const row = [
            escapeCsvCell(e.id),
            escapeCsvCell(e.type),
            escapeCsvCell(e.weight),
            escapeCsvCell(formatDate(e.expiryDate)),
            escapeCsvCell(e.hydrostaticTestYear),
            escapeCsvCell(e.observations),
            escapeCsvCell(formatInspectionDate(lastInspection)),
            escapeCsvCell(formatInspectionTime(lastInspection)),
            escapeCsvCell(formatInspectionLocation(lastInspection)),
        ];
        csvContent += row.join(',') + '\n';
    });
    
    csvContent += '\n';

    csvContent += `"Sistemas de Mangueira"\n`;
    const hoseHeader = ['ID', 'Qtd', 'Tipo', 'Chaves', 'Bicos', 'Validade', 'Observações', 'Data Últ. Inspeção', 'Hora Últ. Inspeção', 'GPS Últ. Inspeção'];
    csvContent += hoseHeader.join(',') + '\n';
    hoses.forEach(h => {
        const lastInspection = h.inspections?.[h.inspections.length - 1];
        const row = [
            escapeCsvCell(h.id),
            escapeCsvCell(h.quantity),
            escapeCsvCell(h.hoseType),
            escapeCsvCell(h.keyQuantity),
            escapeCsvCell(h.nozzleQuantity),
            escapeCsvCell(formatDate(h.expiryDate)),
            escapeCsvCell(h.observations),
            escapeCsvCell(formatInspectionDate(lastInspection)),
            escapeCsvCell(formatInspectionTime(lastInspection)),
            escapeCsvCell(formatInspectionLocation(lastInspection)),
        ];
        csvContent += row.join(',') + '\n';
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
