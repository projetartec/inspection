
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, ChevronDown, FileText, Loader2 } from 'lucide-react';
import { Extinguisher, Hydrant, Inspection, extinguisherTypes, extinguisherWeights, hydrantDiameters, hydrantHoseLengths, hydrantKeyQuantities, hydrantNozzleQuantities, hydrantQuantities, hydrantTypes } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { saveLastInspectionAction } from '@/lib/actions';
import { generatePdfReport, generateXlsxReport } from '@/lib/client-actions';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


type EditableInspection = {
    notes: string;
    itemStatuses: { [key: string]: 'OK' | 'N/C' };
};

const EXTINGUISHER_INSPECTION_ITEMS = [
    "Pintura solo", "Sinalização", "Fixação", "Obstrução", "Lacre/Mangueira/Anel/manômetro"
];

const HOSE_INSPECTION_ITEMS = [
    "Chave", "Esguicho", "Mangueira", "Abrigo", "Pintura de solo", 
    "Acrílico", "Sinalização"
];

interface LastInspectionEditorProps {
    clientId: string;
    buildingId: string;
    initialExtinguishers: Extinguisher[];
    initialHoses: Hydrant[];
}

export function LastInspectionEditor({ clientId, buildingId, initialExtinguishers, initialHoses }: LastInspectionEditorProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [extinguisherInspections, setExtinguisherInspections] = useState<Record<string, EditableInspection>>(() => {
        const initialState: Record<string, EditableInspection> = {};
        initialExtinguishers.forEach(ext => {
            const lastInsp = ext.inspections?.[ext.inspections.length - 1];
            initialState[ext.id] = {
                notes: lastInsp?.notes || '',
                itemStatuses: lastInsp?.itemStatuses || {},
            };
        });
        return initialState;
    });

    const [hoseInspections, setHoseInspections] = useState<Record<string, EditableInspection>>(() => {
        const initialState: Record<string, EditableInspection> = {};
        initialHoses.forEach(hose => {
            const lastInsp = hose.inspections?.[hose.inspections.length - 1];
            initialState[hose.id] = {
                notes: lastInsp?.notes || '',
                itemStatuses: lastInsp?.itemStatuses || {},
            };
        });
        return initialState;
    });

    const handleNotesChange = (id: string, notes: string, type: 'extinguisher' | 'hose') => {
        const updater = type === 'extinguisher' ? setExtinguisherInspections : setHoseInspections;
        updater(prev => ({
            ...prev,
            [id]: { ...prev[id], notes }
        }));
    };
    
    const handleStatusChange = (id: string, item: string, status: 'OK' | 'N/C', type: 'extinguisher' | 'hose') => {
        const updater = type === 'extinguisher' ? setExtinguisherInspections : setHoseInspections;
        updater(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                itemStatuses: { ...prev[id].itemStatuses, [item]: status }
            }
        }));
    };

    const handleSelectAllOk = (id: string, type: 'extinguisher' | 'hose') => {
        const items = type === 'extinguisher' ? EXTINGUISHER_INSPECTION_ITEMS : HOSE_INSPECTION_ITEMS;
        const updater = type === 'extinguisher' ? setExtinguisherInspections : setHoseInspections;
        const allOk = items.reduce((acc, item) => ({ ...acc, [item]: 'OK' }), {});

        updater(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                itemStatuses: allOk
            }
        }));
    };

    const handleSave = async () => {
        setIsSubmitting(true);
        try {
            await saveLastInspectionAction(clientId, buildingId, extinguisherInspections, hoseInspections);
            toast({
                title: 'Sucesso!',
                description: 'Inspeção atualizada com sucesso. Novos registros de inspeção foram criados.',
            });
            router.push(`/clients/${clientId}`);
        } catch (error: any) {
            console.error("Falha ao salvar inspeção:", error);
            toast({
                variant: 'destructive',
                title: 'Erro ao Salvar',
                description: error.message || 'Não foi possível salvar as alterações.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleGenerateReport = async (format: 'pdf' | 'xlsx') => {
        toast({ title: 'Gerando Relatório', description: `Seu relatório em ${format.toUpperCase()} está sendo preparado...` });

        // Remap inspections to match the structure expected by report generators
        const extinguishersWithEditedInspection = initialExtinguishers.map(ext => ({
            ...ext,
            inspections: [...(ext.inspections || []).slice(0, -1), { id: 'edited', date: new Date().toISOString(), ...extinguisherInspections[ext.id] } as Inspection]
        }));
        const hosesWithEditedInspection = initialHoses.map(h => ({
            ...h,
            inspections: [...(h.inspections || []).slice(0, -1), { id: 'edited', date: new Date().toISOString(), ...hoseInspections[h.id] } as Inspection]
        }));
        
        try {
            if (format === 'pdf') {
                await generatePdfReport(clientId, buildingId, extinguishersWithEditedInspection, hosesWithEditedInspection);
            } else {
                await generateXlsxReport(clientId, buildingId, extinguishersWithEditedInspection, hosesWithEditedInspection);
            }
        } catch (error) {
             toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao gerar o relatório.' });
        }
    };


    const renderInspectionItem = (
        item: Extinguisher | Hydrant, 
        inspection: EditableInspection, 
        type: 'extinguisher' | 'hose'
    ) => {
        const checklistItems = type === 'extinguisher' ? EXTINGUISHER_INSPECTION_ITEMS : HOSE_INSPECTION_ITEMS;
        return (
            <Card key={item.id} className="mb-4">
                <CardHeader>
                    <CardTitle className="text-lg">{type === 'extinguisher' ? 'Extintor' : 'Hidrante'}: {item.id}</CardTitle>
                    <CardDescription>
                        {type === 'extinguisher' ? (item as Extinguisher).observations : (item as Hydrant).location}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="mb-4">
                       <AccordionItem value="checklist">
                            <AccordionTrigger>Checklist da Inspeção</AccordionTrigger>
                            <AccordionContent className="space-y-3 pt-2">
                                <div className="text-right">
                                    <Button variant="outline" size="sm" onClick={() => handleSelectAllOk(item.id, type)}>
                                        <Check className="mr-2 h-4 w-4" />
                                        OK em Todos
                                    </Button>
                                </div>
                                {checklistItems.map(checklistItem => (
                                    <div key={checklistItem} className="flex items-center justify-between">
                                        <Label htmlFor={`item-${item.id}-${checklistItem}`} className="text-sm font-normal">
                                            {checklistItem}
                                        </Label>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant={inspection.itemStatuses[checklistItem] === 'OK' ? 'default' : 'outline'}
                                                onClick={() => handleStatusChange(item.id, checklistItem, 'OK', type)}
                                                className={cn("w-16", inspection.itemStatuses[checklistItem] === 'OK' && "bg-green-600 hover:bg-green-700")}
                                            >
                                                OK
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant={inspection.itemStatuses[checklistItem] === 'N/C' ? 'destructive' : 'outline'}
                                                onClick={() => handleStatusChange(item.id, checklistItem, 'N/C', type)}
                                                className="w-16"
                                            >
                                                N/C
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                    <div className="space-y-2">
                        <Label htmlFor={`notes-${item.id}`}>Observações</Label>
                        <Textarea
                            id={`notes-${item.id}`}
                            value={inspection.notes}
                            onChange={(e) => handleNotesChange(item.id, e.target.value, type)}
                            placeholder="Adicionar observações..."
                        />
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <>
            <Tabs defaultValue="extinguishers" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="extinguishers">Extintores ({initialExtinguishers.length})</TabsTrigger>
                    <TabsTrigger value="hoses">Hidrantes ({initialHoses.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="extinguishers" className="mt-6">
                    {initialExtinguishers.map(ext => renderInspectionItem(ext, extinguisherInspections[ext.id], 'extinguisher'))}
                </TabsContent>
                <TabsContent value="hoses" className="mt-6">
                    {initialHoses.map(hose => renderInspectionItem(hose, hoseInspections[hose.id], 'hose'))}
                </TabsContent>
            </Tabs>
            <div className="flex justify-end gap-2 mt-8">
                 <Button variant="outline" onClick={() => router.push(`/clients/${clientId}`)}>
                    Voltar
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="secondary">
                            <FileText className="mr-2" />
                            Relatório
                            <ChevronDown className="ml-2" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleGenerateReport('pdf')}>Gerar PDF</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleGenerateReport('xlsx')}>Gerar Excel (XLSX)</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Button onClick={handleSave} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 animate-spin" />}
                    Salvar Alterações
                </Button>
            </div>
        </>
    );
}

