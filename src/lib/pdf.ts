

'use client';

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format, parseISO, isSameMonth, isSameYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Extinguisher, Hydrant, Client, Building, ManualInspection, Inspection, ExtinguisherType } from '@/lib/types';

// Extend jsPDF with autoTable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDFWithAutoTable;
}

const NC_BG_COLOR = [252, 250, 152]; // #FCFA98
const EXPIRING_BG_COLOR = [255, 105, 97]; // #FF6969
const HEADER_BG_COLOR = [0, 128, 128]; // Teal
const LOGO_URL = 'https://i.imgur.com/4se4p12.png';

const EXTINGUISHER_INSPECTION_ITEMS = [
    "Pintura solo", "Sinalização", "Fixação", "Obstrução", "Lacre/Mangueira/Anel/manômetro"
];

const HOSE_INSPECTION_ITEMS = [
    "Chave", "Esguicho", "Mangueira", "Abrigo", "Pintura de solo", 
    "Acrílico", "Sinalização"
];

async function getLogoBase64(url: string): Promise<string> {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok.');
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Failed to fetch logo:', error);
        return ''; // Return an empty string or a default placeholder if the logo fails to load
    }
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
    return notes || 'OK';
}


async function addHeaderAndLogo(doc: jsPDF, client: Client, generationDate: Date, buildingName?: string) {
    const logoBase64 = await getLogoBase64(LOGO_URL);
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    
    if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', pageWidth - 54, 10, 40, 20, undefined, 'FAST');
    }

    let finalY = 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Empresa: ${client.name || ''}`, 14, finalY);
    finalY += 5;
    
    doc.setFont('helvetica', 'normal');
    if (client.fantasyName) {
        doc.text(`Nome Fantasia: ${client.fantasyName}`, 14, finalY);
        finalY += 5;
    }
    if (buildingName) {
         doc.text(`Local: ${buildingName}`, 14, finalY);
         finalY += 5;
    }
    doc.text(`Endereço: ${client.address || ''}`, 14, finalY);
    finalY += 5;
    doc.text(`Cidade: ${client.city || ''}  CEP: ${client.zipCode || ''}  Tel.: ${client.phone1 || ''}  Tel.: ${client.phone2 || ''}`, 14, finalY);
    finalY += 5;
    doc.text(`CNPJ: ${client.cnpj || ''}`, 14, finalY);
    finalY += 5;
    doc.text(`E-mail: ${client.email || ''}`, 14, finalY);
    finalY += 5;
    doc.text(`Contatos ADM: ${client.adminContact || ''}  Zelador: ${client.caretakerContact || ''}`, 14, finalY);
    finalY += 5;
    doc.text(`Data da realização Check list: ${format(generationDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`, 14, finalY);
    finalY += 8;
    return finalY;
}

async function addSummaryPage(doc: jsPDFWithAutoTable, extinguishers: Extinguisher[], client: Client, generationDate: Date) {
    if (extinguishers.length === 0) return;

    doc.addPage();
    let finalY = 0;
    finalY = await addHeaderAndLogo(doc, client, generationDate);
    
    doc.setFontSize(16);
    doc.text('Resumo de Extintores', 14, finalY);
    finalY += 10;
    
    const summary = extinguishers.reduce((acc, ext) => {
        const key = `${ext.type} ${ext.weight}kg`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const sortedSummary = Object.entries(summary).sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

    doc.autoTable({
        startY: finalY,
        head: [['Tipo de Extintor', 'Quantidade']],
        body: sortedSummary,
        theme: 'striped',
        headStyles: { fillColor: HEADER_BG_COLOR },
        styles: { halign: 'center' },
    });
    
    finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total de Extintores: ${extinguishers.length}`, 14, finalY);
    doc.setFont('helvetica', 'normal');
}


export async function generatePdfReport(client: Client, building: Building, extinguishers: Extinguisher[], hoses: Hydrant[]) {
    return new Promise<void>(async (resolve) => {
        const doc = new jsPDF({
            orientation: 'landscape',
        }) as jsPDFWithAutoTable;

        const generationDate = new Date();
        const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
        
        let finalY = await addHeaderAndLogo(doc, client, generationDate, building.name);
        
        doc.setFontSize(16);
        doc.text("Relatório de Inspeção", 14, finalY);
        finalY += 10;

        const tableStyles = {
            theme: 'striped',
            headStyles: { fillColor: HEADER_BG_COLOR },
            bodyStyles: { halign: 'center' },
            styles: { halign: 'center', fontSize: 7, cellPadding: 1.5 },
        };
        
        const manualEntryTableStyles = {
            ...tableStyles,
            headStyles: { fillColor: [255, 99, 71] }, // Tomato Red
        }

        if (extinguishers.length > 0) {
            const extHeader = ['ID', 'Local', 'Tipo', 'Carga', 'Recarga', 'Test. Hidro.', ...EXTINGUISHER_INSPECTION_ITEMS, 'Observações'];
            doc.autoTable({
                ...tableStyles,
                startY: finalY,
                head: [extHeader],
                body: extinguishers.map(e => {
                    const lastInsp = e.inspections?.[e.inspections.length - 1];
                    const inspectionStatus = EXTINGUISHER_INSPECTION_ITEMS.map(item => {
                        return lastInsp?.itemStatuses?.[item] || 'OK';
                    });
                    
                    return [
                        e.id, 
                        e.observations || '', 
                        e.type, 
                        e.weight + ' kg', 
                        formatDate(e.expiryDate), 
                        e.hydrostaticTestYear,
                        ...inspectionStatus,
                        getObservationNotes(lastInsp), 
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
        } else {
            doc.text("Nenhum extintor registrado.", 14, finalY);
            finalY += 10;
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
                     const observationNotes = getObservationNotes(lastInsp);

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
        } else {
             doc.text("Nenhum hidrante registrado.", 14, finalY);
             finalY += 10;
        }

        finalY += 10;

        if (finalY > pageHeight - 30) {
            doc.addPage();
            finalY = 20;
        }

        if (building.manualInspections && building.manualInspections.length > 0) {
            doc.setFontSize(14);
            doc.text("Registros Manuais e Falhas de Leitura", 14, finalY);
            finalY += 8;
            const manualHeader = ['ID Manual', 'Data', 'Observações'];
            doc.autoTable({
                ...manualEntryTableStyles,
                startY: finalY,
                head: [manualHeader],
                body: building.manualInspections.map(insp => {
                     const date = insp.date ? format(parseISO(insp.date), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A';
                     return [
                        (insp as ManualInspection).manualId,
                        date,
                        insp.notes,
                     ]
                })
            })
        }
        
        await addSummaryPage(doc, extinguishers, client, generationDate);
        
        const fileName = `Relatorio_Inspecao_${client.name.replace(/ /g, '_')}_${building.name.replace(/ /g, '_')}.pdf`;
        doc.save(fileName);
        resolve();
    });
}

export async function generateClientPdfReport(client: Client, buildings: (Building & { extinguishers: Extinguisher[], hoses: Hydrant[] })[]) {
    return new Promise<void>(async (resolve) => {
        const doc = new jsPDF({
            orientation: 'landscape',
        }) as jsPDFWithAutoTable;

        const generationDate = new Date();
        const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
        
        let finalY = await addHeaderAndLogo(doc, client, generationDate);

        doc.setFontSize(16);
        doc.text("Relatório Consolidado", 14, finalY);
        finalY += 10;
        
        const tableStyles = {
            theme: 'striped',
            headStyles: { fillColor: HEADER_BG_COLOR },
            bodyStyles: { halign: 'center' },
            styles: { halign: 'center', fontSize: 7, cellPadding: 1.5 },
        };

        const allExtinguishers = buildings.flatMap(building => 
            (building.extinguishers || []).map(ext => ({...ext, buildingName: building.name}))
        );

        if (allExtinguishers.length > 0) {
            doc.setFontSize(14);
            doc.text("Extintores", 14, finalY);
            finalY += 8;

            const extHeader = [
                'ID', 'Local', 'Prédio', 'Recarga', 'Tipo', 'Carga', 
                ...EXTINGUISHER_INSPECTION_ITEMS,
                'Observações'
            ];
            
            doc.autoTable({
                ...tableStyles,
                startY: finalY,
                head: [extHeader],
                body: allExtinguishers.map(e => {
                    const lastInsp = e.inspections?.[e.inspections.length - 1];
                    const inspectionStatus = EXTINGUISHER_INSPECTION_ITEMS.map(item => {
                        return lastInsp?.itemStatuses?.[item] || 'OK';
                    });
                    
                    return [
                        e.id, 
                        e.observations || '',
                        e.buildingName, 
                        formatDate(e.expiryDate), 
                        e.type, 
                        e.weight + ' kg',
                        ...inspectionStatus,
                        getObservationNotes(lastInsp),
                    ];
                }),
                didParseCell: (data) => {
                    if (data.row.section === 'body') {
                        const item = allExtinguishers[data.row.index];
                        if (!item) return;

                        if (!data.row.styles) {
                            data.row.styles = {};
                        }
                        
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
            finalY = await addHeaderAndLogo(doc, client, generationDate);
        }

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
                head: [['ID', 'Prédio', 'Local', 'Qtd', 'Tipo', 'Diâmetro', 'Medida', 'Chave', 'Esguicho', 'Próx. Teste', 'Status', 'Observações']],
                body: allHoses.map(h => {
                    const lastInsp = h.inspections?.[h.inspections.length - 1];
                    const status = lastInsp?.status || 'N/A';
                    const observationNotes = getObservationNotes(lastInsp);

                    return [
                        h.id, h.buildingName, h.location, h.quantity, 'Tipo ' + h.hoseType, h.diameter + '"',
                        h.hoseLength + 'm', h.keyQuantity, h.nozzleQuantity, formatDate(h.hydrostaticTestDate), status, observationNotes
                    ];
                }),
                didParseCell: (data) => {
                     if (data.row.section === 'body') {
                        const item = allHoses[data.row.index];
                        if (!item) return;
                        
                        if (!data.row.styles) {
                            data.row.styles = {};
                        }
                        
                        if (item.hydrostaticTestDate && isSameMonth(parseISO(item.hydrostaticTestDate), generationDate) && isSameYear(parseISO(item.hydrostaticTestDate), generationDate)) {
                           data.row.styles.fillColor = EXPIRING_BG_COLOR;
                        }

                        if (data.column.index === 10 && data.cell.text && data.cell.text[0] === 'N/C') {
                            data.cell.styles.fillColor = NC_BG_COLOR;
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                }
            });
            finalY = (doc as any).lastAutoTable.finalY;
        } else {
            doc.text("Nenhum hidrante registrado para este cliente.", 14, finalY);
            finalY += 10;
        }

        await addSummaryPage(doc, allExtinguishers, client, generationDate);
        
        const fileName = `Relatorio_Consolidado_${client.name.replace(/ /g, '_')}.pdf`;
        doc.save(fileName);
        resolve();
    });
}


export async function generateExpiryPdfReport(client: Client, buildings: Building[], month: number, year: number) {
    return new Promise<void>(async (resolve) => {
        const doc = new jsPDF({
            orientation: 'landscape',
        }) as jsPDFWithAutoTable;

        const generationDate = new Date();
        const targetMonthName = format(new Date(year, month), 'MMMM', { locale: ptBR });
        const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();

        let finalY = await addHeaderAndLogo(doc, client, generationDate);
        
        doc.setFontSize(16);
        doc.text(`Relatório de Vencimentos - ${targetMonthName.charAt(0).toUpperCase() + targetMonthName.slice(1)}/${year}`, 14, finalY);
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
                head: [['ID', 'Local', 'Prédio', 'Tipo', 'Carga (kg)', 'Data de Recarga', 'Ano Test. Hidro.']],
                body: expiringExtinguishers.map(e => [
                    e.id, e.observations || '', e.buildingName, e.type, e.weight,
                    formatDate(e.expiryDate), e.hydrostaticTestYear,
                ]),
            });
            finalY = (doc as any).lastAutoTable.finalY + 10;
        }

        const expiringHoses = buildings
            .flatMap(b => (b.hoses || []).map(h => ({ ...h, buildingName: b.name })))
            .filter(h => filterByMonthYear(h.hydrostaticTestDate));
        
        if (expiringHoses.length > 0) {
            if (finalY > pageHeight - 40) {
                doc.addPage();
                finalY = await addHeaderAndLogo(doc, client, generationDate);
            }
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
            finalY += 10;
        }

        await addSummaryPage(doc, expiringExtinguishers, client, generationDate);
        
        const fileName = `Relatorio_Vencimentos_${String(month + 1).padStart(2, '0')}-${year}_${client.name.replace(/ /g, '_')}.pdf`;
        doc.save(fileName);
        resolve();
    });
}

export async function generateHosesPdfReport(client: Client, buildingsWithHoses: (Building & { hoses: Hydrant[] })[]) {
    return new Promise<void>(async (resolve) => {
        const doc = new jsPDF({
            orientation: 'landscape',
        }) as jsPDFWithAutoTable;

        const generationDate = new Date();
        const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
        let finalY = await addHeaderAndLogo(doc, client, generationDate);

        doc.setFontSize(16);
        doc.text("Relatório de Mangueiras", 14, finalY);
        finalY += 10;
        
        const tableStyles = {
            theme: 'striped',
            headStyles: { fillColor: HEADER_BG_COLOR },
            bodyStyles: { halign: 'center' },
            styles: { halign: 'center', fontSize: 8, cellPadding: 1.5 },
        };
        
        const allHoses = buildingsWithHoses.flatMap(building => 
            (building.hoses || []).map(hose => ({...hose, buildingName: building.name}))
        );
        
        if (allHoses.length > 0) {
            doc.autoTable({
                ...tableStyles,
                startY: finalY,
                head: [['ID', 'Prédio', 'Local', 'Qtd', 'Tipo', 'Diâmetro', 'Medida', 'Chave', 'Esguicho', 'Próx. Teste', 'Status', 'Observações']],
                body: allHoses.map(h => {
                    const lastInsp = h.inspections?.[h.inspections.length - 1];
                    const status = lastInsp?.status || 'N/A';
                    const observationNotes = getObservationNotes(lastInsp);

                    return [
                        h.id, h.buildingName, h.location, h.quantity, 'Tipo ' + h.hoseType, h.diameter + '"',
                        h.hoseLength + 'm', h.keyQuantity, h.nozzleQuantity, formatDate(h.hydrostaticTestDate), status, observationNotes
                    ];
                }),
                didParseCell: (data) => {
                     if (data.row.section === 'body') {
                        const item = allHoses[data.row.index];
                        if (!item) return;
                        
                        if (!data.row.styles) {
                            data.row.styles = {};
                        }
                        
                        if (item.hydrostaticTestDate && isSameMonth(parseISO(item.hydrostaticTestDate), generationDate) && isSameYear(parseISO(item.hydrostaticTestDate), generationDate)) {
                           data.row.styles.fillColor = EXPIRING_BG_COLOR;
                        }

                        if (data.column.index === 10 && data.cell.text && data.cell.text[0] === 'N/C') {
                            data.cell.styles.fillColor = NC_BG_COLOR;
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                }
            });
            finalY = (doc as any).lastAutoTable.finalY;
        } else {
            doc.text("Nenhum hidrante/mangueira registrado para este cliente.", 14, finalY);
            finalY += 10;
        }
        
        const fileName = `Relatorio_Mangueiras_${client.name.replace(/ /g, '_')}.pdf`;
        doc.save(fileName);
        resolve();
    });
}

export async function generateExtinguishersPdfReport(client: Client, buildingsWithExtinguishers: (Building & { extinguishers: Extinguisher[] })[]) {
    return new Promise<void>(async (resolve) => {
        const doc = new jsPDF({
            orientation: 'landscape',
        }) as jsPDFWithAutoTable;

        const generationDate = new Date();
        let finalY = await addHeaderAndLogo(doc, client, generationDate);

        doc.setFontSize(16);
        doc.text("Relatório de Extintores", 14, finalY);
        finalY += 10;
        
        const tableStyles = {
            theme: 'striped',
            headStyles: { fillColor: HEADER_BG_COLOR },
            bodyStyles: { halign: 'center' },
            styles: { halign: 'center', fontSize: 7, cellPadding: 1.5 },
        };
        
        const allExtinguishers = buildingsWithExtinguishers.flatMap(building => 
            (building.extinguishers || []).map(ext => ({...ext, buildingName: building.name}))
        );

        if (allExtinguishers.length > 0) {
            const extHeader = [
                'ID', 'Local', 'Prédio', 'Recarga', 'Tipo', 'Carga', ...EXTINGUISHER_INSPECTION_ITEMS, 'Observações'
            ];
            
            doc.autoTable({
                ...tableStyles,
                startY: finalY,
                head: [extHeader],
                body: allExtinguishers.map(e => {
                    const lastInsp = e.inspections?.[e.inspections.length - 1];
                    const inspectionStatus = EXTINGUISHER_INSPECTION_ITEMS.map(item => {
                       return lastInsp?.itemStatuses?.[item] || 'OK';
                    });
                    
                    return [
                        e.id, 
                        e.observations || '',
                        e.buildingName, 
                        formatDate(e.expiryDate), 
                        e.type, 
                        e.weight + ' kg',
                        ...inspectionStatus,
                        getObservationNotes(lastInsp),
                    ];
                }),
                didParseCell: (data) => {
                    if (data.row.section === 'body') {
                        const item = allExtinguishers[data.row.index];
                        if (!item) return;

                        if (!data.row.styles) {
                            data.row.styles = {};
                        }
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
                }
            });
            finalY = (doc as any).lastAutoTable.finalY;
        } else {
            doc.text("Nenhum extintor registrado para este cliente.", 14, finalY);
            finalY += 10;
        }
        
        await addSummaryPage(doc, allExtinguishers, client, generationDate);

        const fileName = `Relatorio_Extintores_${client.name.replace(/ /g, '_')}.pdf`;
        doc.save(fileName);
        resolve();
    });
}

export async function generateDescriptivePdfReport(client: Client, buildings: (Building & { extinguishers: Extinguisher[], hoses: Hydrant[] })[]) {
    return new Promise<void>(async (resolve) => {
        const doc = new jsPDF({
            orientation: 'landscape',
        }) as jsPDFWithAutoTable;
        
        const generationDate = new Date();
        const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
        let finalY = await addHeaderAndLogo(doc, client, generationDate);

        doc.setFontSize(16);
        doc.text("Relatório Descritivo de Equipamentos", 14, finalY);
        finalY += 10;

        const tableStyles = {
            theme: 'striped',
            headStyles: { fillColor: HEADER_BG_COLOR },
            bodyStyles: { halign: 'center' },
            styles: { halign: 'center', fontSize: 8, cellPadding: 1.5 },
        };

        const allExtinguishers = buildings.flatMap(b => (b.extinguishers || []).map(e => ({ ...e, buildingName: b.name })));
        if (allExtinguishers.length > 0) {
            doc.setFontSize(14);
            doc.text("Extintores", 14, finalY);
            finalY += 8;

            doc.autoTable({
                ...tableStyles,
                startY: finalY,
                head: [['ID', 'Local', 'Prédio', 'Tipo', 'Carga', 'Recarga']],
                body: allExtinguishers.map(e => [
                    e.id,
                    e.observations || '',
                    e.buildingName,
                    e.type,
                    e.weight + ' kg',
                    formatDate(e.expiryDate),
                ]),
            });
            finalY = (doc as any).lastAutoTable.finalY + 10;
        }
        
        if (finalY > pageHeight - 40) {
            doc.addPage();
            finalY = await addHeaderAndLogo(doc, client, generationDate);
        }

        const allHoses = buildings.flatMap(b => (b.hoses || []).map(h => ({ ...h, buildingName: b.name })));
        if (allHoses.length > 0) {
            doc.setFontSize(14);
            doc.text("Hidrantes", 14, finalY);
            finalY += 8;

            doc.autoTable({
                ...tableStyles,
                startY: finalY,
                head: [['ID', 'Prédio', 'Local', 'Qtd', 'Tipo', 'Diâmetro', 'Medida', 'Chave', 'Esguicho', 'Próx. Test']],
                body: allHoses.map(h => [
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
                ]),
            });
        }
        
        await addSummaryPage(doc, allExtinguishers, client, generationDate);

        const fileName = `Relatorio_Descritivo_${client.name.replace(/ /g, '_')}.pdf`;
        doc.save(fileName);
        resolve();
    });
}
    
export async function generateNonConformityPdfReport(
    client: Client, 
    buildings: (Building & { extinguishers: Extinguisher[], hoses: Hydrant[] })[],
    type: 'consolidated' | 'extinguishers' | 'hoses'
) {
    return new Promise<void>(async (resolve) => {
        const doc = new jsPDF({
            orientation: 'landscape',
        }) as jsPDFWithAutoTable;
        
        const generationDate = new Date();
        const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
        let finalY = await addHeaderAndLogo(doc, client, generationDate);

        doc.setFontSize(16);
        doc.text("Relatório de Inconformidades (N/C)", 14, finalY);
        finalY += 10;

        const tableStyles = {
            theme: 'striped',
            headStyles: { fillColor: HEADER_BG_COLOR, textColor: [255, 255, 255] },
            bodyStyles: { halign: 'center' },
            styles: { halign: 'center', fontSize: 7, cellPadding: 1.5 },
        };

        const showExtinguishers = type === 'consolidated' || type === 'extinguishers';
        const showHoses = type === 'consolidated' || type === 'hoses';

        const ncExtinguishers = buildings.flatMap(b => (b.extinguishers || [])
            .map(e => ({ ...e, buildingName: b.name, lastNcInspection: e.inspections?.slice().reverse().find(i => i.status === 'N/C') }))
            .filter(e => e.lastNcInspection)
        );

        if (showExtinguishers && ncExtinguishers.length > 0) {
            doc.setFontSize(14);
            doc.text("Extintores Não Conformes", 14, finalY);
            finalY += 8;

            const extHeader = [
                'ID', 'Local', 'Prédio', 'Recarga', 'Tipo', 'Carga', 
                ...EXTINGUISHER_INSPECTION_ITEMS,
                'Observações'
            ];

            doc.autoTable({
                ...tableStyles,
                startY: finalY,
                head: [extHeader],
                body: ncExtinguishers.map(e => {
                    const ncInspection = e.lastNcInspection;
                    const inspectionStatus = EXTINGUISHER_INSPECTION_ITEMS.map(item => ncInspection?.itemStatuses?.[item] || 'OK');
                    return [
                        e.id,
                        e.observations || '',
                        e.buildingName,
                        formatDate(e.expiryDate),
                        e.type,
                        e.weight + ' kg',
                        ...inspectionStatus,
                        getObservationNotes(ncInspection)
                    ];
                }),
                didParseCell: (data) => {
                    if (data.row.section !== 'body') return;
                    const itemStatusStartIndex = 6; 
                    if (data.column.index >= itemStatusStartIndex && data.column.index < itemStatusStartIndex + EXTINGUISHER_INSPECTION_ITEMS.length) {
                         if (data.cell.text && data.cell.text[0] === 'N/C') {
                            data.cell.styles.fillColor = NC_BG_COLOR;
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                }
            });
            finalY = (doc as any).lastAutoTable.finalY + 10;
        }

        if (finalY > pageHeight - 40) {
            doc.addPage();
            finalY = await addHeaderAndLogo(doc, client, generationDate);
        }

        const ncHoses = buildings.flatMap(b => (b.hoses || [])
            .map(h => ({ ...h, buildingName: b.name, lastNcInspection: h.inspections?.slice().reverse().find(i => i.status === 'N/C') }))
            .filter(h => h.lastNcInspection)
        );

        if (showHoses && ncHoses.length > 0) {
            doc.setFontSize(14);
            doc.text("Hidrantes Não Conformes", 14, finalY);
            finalY += 8;
            
            const hoseHeader = ['ID', 'Prédio', 'Local', 'Qtd', 'Tipo', 'Diâmetro', 'Medida', 'Chave', 'Esguicho', 'Próx. Teste', 'Status', 'Observações'];

            doc.autoTable({
                ...tableStyles,
                startY: finalY,
                head: [hoseHeader],
                body: ncHoses.map(h => {
                    const ncInspection = h.lastNcInspection;
                    return [
                        h.id,
                        h.buildingName,
                        h.location,
                        h.quantity,
                        'Tipo ' + h.hoseType,
                        h.diameter + '"',
                        h.hoseLength + 'm',
                        h.keyQuantity,
                        h.nozzleQuantity,
                        formatDate(h.hydrostaticTestDate),
                        ncInspection?.status || 'N/A',
                        getObservationNotes(ncInspection)
                    ];
                }),
                didParseCell: (data) => {
                    if (data.row.section !== 'body') return;
                    if (data.column.index === 10) { // Status column
                        data.cell.styles.fillColor = NC_BG_COLOR;
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            });
        }
        
        if (ncExtinguishers.length === 0 && ncHoses.length === 0) {
             doc.text("Nenhuma inconformidade encontrada.", 14, finalY);
        }

        const fileName = `Relatorio_Inconformidades_${client.name.replace(/ /g, '_')}.pdf`;
        doc.save(fileName);
        resolve();
    });
}
    

    

    

    

