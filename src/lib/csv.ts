"use client";

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Extinguisher, Hose, Client, Building } from '@/lib/types';

function escapeCsvCell(cell: string | number): string {
    const cellStr = String(cell ?? '');
    if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
    }
    return cellStr;
}

function formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return 'Data Inválida';
        }
        return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch (e) {
        return 'Data Inválida';
    }
}

export function generateCsvReport(client: Client, building: Building, extinguishers: Extinguisher[], hoses: Hose[]) {
    let csvContent = '';

    // --- Header ---
    csvContent += `"Relatório de Inspeção"\n`;
    csvContent += `Cliente:,${escapeCsvCell(client.name)}\n`;
    csvContent += `Local:,${escapeCsvCell(building.name)}\n`;
    csvContent += `Gerado em:,${format(new Date(), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}\n\n`;

    // --- Extinguishers ---
    csvContent += `"Extintores"\n`;
    const extHeader = ['ID', 'Tipo', 'Peso (kg)', 'Validade', 'Observações'];
    csvContent += extHeader.join(',') + '\n';
    extinguishers.forEach(e => {
        const row = [
            escapeCsvCell(e.id),
            escapeCsvCell(e.type),
            escapeCsvCell(e.weight),
            escapeCsvCell(formatDate(e.expiryDate)),
            escapeCsvCell(e.observations),
        ];
        csvContent += row.join(',') + '\n';
    });
    
    csvContent += '\n'; // Spacer

    // --- Hoses ---
    csvContent += `"Sistemas de Mangueira"\n`;
    const hoseHeader = ['ID', 'Qtd', 'Tipo', 'Chaves', 'Bicos', 'Validade', 'Observações'];
    csvContent += hoseHeader.join(',') + '\n';
    hoses.forEach(h => {
        const row = [
            escapeCsvCell(h.id),
            escapeCsvCell(h.quantity),
            escapeCsvCell(h.hoseType),
            escapeCsvCell(h.keyQuantity),
            escapeCsvCell(h.nozzleQuantity),
            escapeCsvCell(formatDate(h.expiryDate)),
            escapeCsvCell(h.observations),
        ];
        csvContent += row.join(',') + '\n';
    });

    // --- Download ---
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const fileName = `Relatorio_${client.name.replace(/ /g, '_')}_${building.name.replace(/ /g, '_')}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
