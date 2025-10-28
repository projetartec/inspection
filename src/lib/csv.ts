
'use client';

import { format, parseISO, isSameMonth, isSameYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Extinguisher, Hydrant, Client, Building, ManualInspection, Inspection } from '@/lib/types';
import * as XLSX from 'xlsx';

const EXTINGUISHER_INSPECTION_ITEMS = [
    "Pintura solo", "Sinalização", "Fixação", "Obstrução", "Lacre/Mangueira/Anel/manômetro"
];

const HOSE_INSPECTION_ITEMS = [
    "Chave", "Esguicho", "Mangueira", "Abrigo", "Pintura de solo", 
    "Acrílico", "Sinalização"
];


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

function applyAutoFilter(ws: XLSX.WorkSheet, cols: number) {
    if (!ws['!ref']) return;
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: cols - 1, r: 0 } }) };
}

function getObservationNotes(inspection: Inspection | undefined): string {
    if (!inspection) return '';
    
    const ncItems = Object.entries(inspection.itemStatuses || {})
        .filter(([, status]) => status === 'N/C')
        .map(([item]) => item);

    let notes = '';
    if (ncItems.length > 0) {
        notes += ncItems.join(', ');
    }
    if (inspection.notes) {
        notes += (notes ? ' - ' : '') + inspection.notes;
    }
    return notes;
}

// --- MAIN REPORT GENERATORS ---

export async function generateXlsxReport(client: Client, building: Building, extinguishers: Extinguisher[], hoses: Hydrant[]) {
    return new Promise<void>((resolve) => {
        const wb = XLSX.utils.book_new();
        const generationDate = new Date();

        // --- Extinguishers Sheet ---
        const extHeader = ['Alerta', 'ID', 'Local', 'Tipo', 'Carga (kg)', 'Recarga', 'Test. Hidrostático', ...EXTINGUISHER_INSPECTION_ITEMS, 'Observações'];
        const extBody = (extinguishers || []).map(e => {
            const lastInsp = e.inspections?.[e.inspections.length - 1];
            let alert = '';
            
            const inspectionStatus = EXTINGUISHER_INSPECTION_ITEMS.map(item => {
                return lastInsp?.itemStatuses?.[item] || 'OK';
            });
            
            if (inspectionStatus.includes('N/C')) {
                alert = 'NÃO CONFORME';
            }
            if (e.expiryDate && isSameMonth(parseISO(e.expiryDate), generationDate) && isSameYear(parseISO(e.expiryDate), generationDate)) {
                 alert = alert ? `${alert} / VENCE ESTE MÊS` : 'VENCE ESTE MÊS';
            }

            return [alert, e.id, e.observations, e.type, e.weight, formatDate(e.expiryDate), e.hydrostaticTestYear, ...inspectionStatus, lastInsp?.notes || ''];
        });
        const wsExt = XLSX.utils.aoa_to_sheet([extHeader, ...extBody]);
        applyAutoFilter(wsExt, extHeader.length);
        XLSX.utils.book_append_sheet(wb, wsExt, 'Extintores');

        // --- Hoses Sheet ---
        const hoseHeader = ['Alerta', 'ID', 'Local', 'Qtd Mang.', 'Tipo', 'Diâmetro', 'Medida (m)', 'Chave', 'Esguicho', 'Próx. Teste', 'Status', 'Observações'];
        const hoseBody = (hoses || []).map(h => {
            const insp = h.inspections?.[h.inspections.length - 1];
            const status = insp?.status ?? 'N/A';
            const observationNotes = getObservationNotes(insp);
            let alert = '';
            if (status === 'N/C') alert = 'NÃO CONFORME';
            if (h.hydrostaticTestDate && isSameMonth(parseISO(h.hydrostaticTestDate), generationDate) && isSameYear(parseISO(h.hydrostaticTestDate), generationDate)) {
                 alert = alert ? `${alert} / VENCE ESTE MÊS` : 'VENCE ESTE MÊS';
            }
            return [alert, h.id, h.location, h.quantity, 'Tipo ' + h.hoseType, h.diameter + '"', h.hoseLength, h.keyQuantity, h.nozzleQuantity, formatDate(h.hydrostaticTestDate), status, observationNotes];
        });
        const wsHose = XLSX.utils.aoa_to_sheet([hoseHeader, ...hoseBody]);
        applyAutoFilter(wsHose, hoseHeader.length);
        XLSX.utils.book_append_sheet(wb, wsHose, 'Hidrantes');
        
        // --- Manual Inspections Sheet ---
        if(building.manualInspections && building.manualInspections.length > 0) {
            const manualHeader = ['ID Manual', 'Data', 'Status', 'Observações'];
            const manualBody = building.manualInspections.map(insp => {
                 const date = insp.date ? format(parseISO(insp.date), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A';
                 return [ (insp as ManualInspection).manualId, date, insp.status, insp.notes ];
            });
            const wsManual = XLSX.utils.aoa_to_sheet([manualHeader, ...manualBody]);
            applyAutoFilter(wsManual, manualHeader.length);
            XLSX.utils.book_append_sheet(wb, wsManual, 'Falhas de Leitura');
        }

        const fileName = `Relatorio_Inspecao_${client.name.replace(/ /g, '_')}_${building.name.replace(/ /g, '_')}.xlsx`;
        XLSX.writeFile(wb, fileName);
        resolve();
    });
}

export async function generateClientXlsxReport(client: Client, buildings: (Building & { extinguishers: Extinguisher[], hoses: Hydrant[] })[]) {
    return new Promise<void>((resolve) => {
        const wb = XLSX.utils.book_new();
        const generationDate = new Date();
       
        // --- Extinguishers Section ---
        const extHeader = [
            'ID', 'Prédio', 'Recarga', 'Tipo', 'Carga',
            ...EXTINGUISHER_INSPECTION_ITEMS,
            'Observações'
        ];
        const allExtinguishers = buildings.flatMap(b => (b.extinguishers || []).map(e => ({ ...e, buildingName: b.name })));
        
        const extBody = allExtinguishers.map(e => {
            const lastInsp = e.inspections?.[e.inspections.length - 1];
            
            const inspectionStatus = EXTINGUISHER_INSPECTION_ITEMS.map(item => {
                return lastInsp?.itemStatuses?.[item] || 'OK';
            });
            
            return [
                e.id, 
                e.buildingName, 
                formatDate(e.expiryDate), 
                e.type, 
                e.weight,
                ...inspectionStatus,
                lastInsp?.notes || ''
            ];
        });

        const wsExt = XLSX.utils.aoa_to_sheet([extHeader, ...extBody]);
        applyAutoFilter(wsExt, extHeader.length);
        XLSX.utils.book_append_sheet(wb, wsExt, 'Extintores');

        // --- Hoses Section ---
        const hoseHeader = ['Alerta', 'ID', 'Prédio', 'Local', 'Qtd Mangueiras', 'Tipo', 'Diâmetro', 'Medida (m)', 'Qtd Chaves', 'Qtd Esguichos', 'Próx. Teste Hidr.', 'Status', 'Observações'];
        const allHoses = buildings.flatMap(b => (b.hoses || []).map(h => ({ ...h, buildingName: b.name })));
        const hoseBody = allHoses.map(h => {
            const insp = h.inspections?.[h.inspections.length - 1];
            const status = insp?.status ?? 'N/A';
            const observationNotes = getObservationNotes(insp);
             let alert = '';
            if (status === 'N/C') alert = 'NÃO CONFORME';
            if (h.hydrostaticTestDate && isSameMonth(parseISO(h.hydrostaticTestDate), generationDate) && isSameYear(parseISO(h.hydrostaticTestDate), generationDate)) {
                 alert = alert ? `${alert} / VENCE ESTE MÊS` : 'VENCE ESTE MÊS';
            }
            return [ alert, h.id, h.buildingName, h.location, h.quantity, h.hoseType, h.diameter, h.hoseLength, h.keyQuantity, h.nozzleQuantity, formatDate(h.hydrostaticTestDate), status, observationNotes];
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

// --- HOSES ONLY REPORT ---

export async function generateHosesXlsxReport(client: Client, buildingsWithHoses: (Building & { hoses: Hydrant[] })[]) {
    return new Promise<void>((resolve) => {
        const wb = XLSX.utils.book_new();
        const generationDate = new Date();
       
        // --- Hoses Section ---
        const hoseHeader = ['Alerta', 'ID', 'Prédio', 'Local', 'Qtd Mangueiras', 'Tipo', 'Diâmetro', 'Medida (m)', 'Qtd Chaves', 'Qtd Esguichos', 'Próx. Teste Hidr.', 'Status', 'Observações'];
        const allHoses = buildingsWithHoses.flatMap(b => (b.hoses || []).map(h => ({ ...h, buildingName: b.name })));
        const hoseBody = allHoses.map(h => {
            const insp = h.inspections?.[h.inspections.length - 1];
            const status = insp?.status ?? 'N/A';
            const observationNotes = getObservationNotes(insp);

             let alert = '';
            if (status === 'N/C') alert = 'NÃO CONFORME';
            if (h.hydrostaticTestDate && isSameMonth(parseISO(h.hydrostaticTestDate), generationDate) && isSameYear(parseISO(h.hydrostaticTestDate), generationDate)) {
                 alert = alert ? `${alert} / VENCE ESTE MÊS` : 'VENCE ESTE MÊS';
            }
            return [ alert, h.id, h.buildingName, h.location, h.quantity, h.hoseType, h.diameter, h.hoseLength, h.keyQuantity, h.nozzleQuantity, formatDate(h.hydrostaticTestDate), status, observationNotes ];
        });
        const wsHose = XLSX.utils.aoa_to_sheet([hoseHeader, ...hoseBody]);
        applyAutoFilter(wsHose, hoseHeader.length);
        XLSX.utils.book_append_sheet(wb, wsHose, 'Relatório de Mangueiras');
        
        const fileName = `Relatorio_Mangueiras_${client.name.replace(/ /g, '_')}.xlsx`;
        XLSX.writeFile(wb, fileName);
        resolve();
    });
}

// --- EXTINGUISHERS ONLY REPORT ---

export async function generateExtinguishersXlsxReport(client: Client, buildingsWithExtinguishers: (Building & { extinguishers: Extinguisher[] })[]) {
    return new Promise<void>((resolve) => {
        const wb = XLSX.utils.book_new();
       
        const extHeader = [
            'ID', 'Prédio', 'Recarga', 'Tipo', 'Carga',
            ...EXTINGUISHER_INSPECTION_ITEMS,
            'Observações'
        ];
        const allExtinguishers = buildingsWithExtinguishers.flatMap(b => (b.extinguishers || []).map(e => ({ ...e, buildingName: b.name })));
        
        const extBody = allExtinguishers.map(e => {
            const lastInsp = e.inspections?.[e.inspections.length - 1];
            
            const inspectionStatus = EXTINGUISHER_INSPECTION_ITEMS.map(item => {
                return lastInsp?.itemStatuses?.[item] || 'OK';
            });
            
            return [
                e.id, 
                e.buildingName, 
                formatDate(e.expiryDate), 
                e.type, 
                e.weight,
                ...inspectionStatus,
                lastInsp?.notes || ''
            ];
        });

        const wsExt = XLSX.utils.aoa_to_sheet([extHeader, ...extBody]);
        applyAutoFilter(wsExt, extHeader.length);
        XLSX.utils.book_append_sheet(wb, wsExt, 'Relatório de Extintores');
        
        const fileName = `Relatorio_Extintores_${client.name.replace(/ /g, '_')}.xlsx`;
        XLSX.writeFile(wb, fileName);
        resolve();
    });
}

// --- DESCRIPTIVE REPORT ---

export async function generateDescriptiveXlsxReport(client: Client, buildings: (Building & { extinguishers: Extinguisher[], hoses: Hydrant[] })[]) {
    return new Promise<void>((resolve) => {
        const wb = XLSX.utils.book_new();

        // --- Extinguishers Sheet ---
        const allExtinguishers = buildings.flatMap(b => (b.extinguishers || []).map(e => ({ ...e, buildingName: b.name })));
        if (allExtinguishers.length > 0) {
            const extHeader = ['ID', 'Prédio', 'Local', 'Tipo', 'Carga', 'Recarga'];
            const extBody = allExtinguishers.map(e => [
                e.id,
                e.buildingName,
                e.observations || '',
                e.type,
                e.weight + ' kg',
                formatDate(e.expiryDate)
            ]);
            const wsExt = XLSX.utils.aoa_to_sheet([extHeader, ...extBody]);
            applyAutoFilter(wsExt, extHeader.length);
            XLSX.utils.book_append_sheet(wb, wsExt, 'Extintores');
        }

        // --- Hoses Sheet ---
        const allHoses = buildings.flatMap(b => (b.hoses || []).map(h => ({ ...h, buildingName: b.name })));
        if (allHoses.length > 0) {
            const hoseHeader = ['ID', 'Prédio', 'Local', 'Qtd', 'Tipo', 'Diâmetro', 'Medida', 'Chave', 'Esguicho', 'Próx. Test'];
            const hoseBody = allHoses.map(h => [
                h.id,
                h.buildingName,
                h.location,
                h.quantity,
                'Tipo ' + h.hoseType,
                h.diameter + '"',
                h.hoseLength + 'm',
                h.keyQuantity,
                h.nozzleQuantity,
                formatDate(h.hydrostaticTestDate)
            ]);
            const wsHose = XLSX.utils.aoa_to_sheet([hoseHeader, ...hoseBody]);
            applyAutoFilter(wsHose, hoseHeader.length);
            XLSX.utils.book_append_sheet(wb, wsHose, 'Hidrantes');
        }
        
        const fileName = `Relatorio_Descritivo_${client.name.replace(/ /g, '_')}.xlsx`;
        XLSX.writeFile(wb, fileName);
        resolve();
    });
}
    
// --- NON-CONFORMITY REPORT ---
export async function generateNonConformityXlsxReport(
    client: Client, 
    buildings: (Building & { extinguishers: Extinguisher[], hoses: Hydrant[] })[],
    type: 'consolidated' | 'extinguishers' | 'hoses'
) {
    return new Promise<void>((resolve) => {
        const wb = XLSX.utils.book_new();
        const showExtinguishers = type === 'consolidated' || type === 'extinguishers';
        const showHoses = type === 'consolidated' || type === 'hoses';

        // --- Extinguishers Sheet ---
        const ncExtinguishers = buildings.flatMap(b => (b.extinguishers || [])
            .filter(e => e.inspections.some(i => i.status === 'N/C'))
            .map(e => ({ ...e, buildingName: b.name }))
        );

        if (showExtinguishers && ncExtinguishers.length > 0) {
            const extHeader = ['ID', 'Prédio', 'Local', 'Observações da Inspeção'];
            const extBody = ncExtinguishers.map(e => {
                const ncInspection = e.inspections.find(i => i.status === 'N/C');
                return [e.id, e.buildingName, e.observations || '', getObservationNotes(ncInspection)];
            });
            const wsExt = XLSX.utils.aoa_to_sheet([extHeader, ...extBody]);
            applyAutoFilter(wsExt, extHeader.length);
            XLSX.utils.book_append_sheet(wb, wsExt, 'Extintores NC');
        }

        // --- Hoses Sheet ---
        const ncHoses = buildings.flatMap(b => (b.hoses || [])
            .filter(h => h.inspections.some(i => i.status === 'N/C'))
            .map(h => ({ ...h, buildingName: b.name }))
        );

        if (showHoses && ncHoses.length > 0) {
            const hoseHeader = ['ID', 'Prédio', 'Local', 'Observações da Inspeção'];
            const hoseBody = ncHoses.map(h => {
                const ncInspection = h.inspections.find(i => i.status === 'N/C');
                return [h.id, h.buildingName, h.location, getObservationNotes(ncInspection)];
            });
            const wsHose = XLSX.utils.aoa_to_sheet([hoseHeader, ...hoseBody]);
            applyAutoFilter(wsHose, hoseHeader.length);
            XLSX.utils.book_append_sheet(wb, wsHose, 'Hidrantes NC');
        }

        if (ncExtinguishers.length === 0 && ncHoses.length === 0) {
            const wsEmpty = XLSX.utils.aoa_to_sheet([[`Nenhuma inconformidade encontrada.`]]);
            XLSX.utils.book_append_sheet(wb, wsEmpty, 'Inconformidades');
        }
        
        const fileName = `Relatorio_Inconformidades_${client.name.replace(/ /g, '_')}.xlsx`;
        XLSX.writeFile(wb, fileName);
        resolve();
    });
}
    

    

