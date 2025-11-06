
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Building, Calendar as CalendarIcon, Check, ChevronsUpDown, Filter } from 'lucide-react';
import type { Building as BuildingType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';

export type ExpiryFilter = {
    type: 'none' | 'this_month' | 'future';
    date?: Date;
}

interface ConsultationFiltersProps {
    buildings: BuildingType[];
    selectedBuildingIds: string[];
    onSelectedBuildingIdsChange: (ids: string[]) => void;
    expiryFilter: ExpiryFilter;
    onExpiryFilterChange: (filter: ExpiryFilter) => void;
}

export function ConsultationFilters({
    buildings,
    selectedBuildingIds,
    onSelectedBuildingIdsChange,
    expiryFilter,
    onExpiryFilterChange
}: ConsultationFiltersProps) {

    const handleBuildingSelect = (buildingId: string) => {
        const newSelectedIds = selectedBuildingIds.includes(buildingId)
            ? selectedBuildingIds.filter(id => id !== buildingId)
            : [...selectedBuildingIds, buildingId];
        onSelectedBuildingIdsChange(newSelectedIds);
    };

    const handleFutureDateSelect = (date: Date | undefined) => {
        if (date) {
            onExpiryFilterChange({ type: 'future', date });
        }
    }
    
    const clearExpiryFilter = () => {
        onExpiryFilterChange({ type: 'none' });
    }

    const isAnyFilterActive = selectedBuildingIds.length > 0 || expiryFilter.type !== 'none';

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className={cn(isAnyFilterActive && "ring-2 ring-primary")}>
                    <Filter className="mr-2 h-4 w-4" />
                    Filtros
                    {isAnyFilterActive && <span className="ml-2 h-2 w-2 rounded-full bg-primary" />}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="end">
                <DropdownMenuLabel>Filtrar Por Vencimento</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => onExpiryFilterChange({ type: 'this_month' })}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span>Vencem este Mês</span>
                </DropdownMenuItem>
                <Popover>
                    <PopoverTrigger asChild>
                        <button
                          className={cn(
                            "w-full relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                          )}
                          onClick={(e) => e.preventDefault()}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            Vencimentos Futuros
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={expiryFilter.type === 'future' ? expiryFilter.date : undefined}
                            onSelect={handleFutureDateSelect}
                            initialFocus
                            locale={ptBR}
                        />
                    </PopoverContent>
                </Popover>
                 {(expiryFilter.type !== 'none') && (
                    <DropdownMenuItem onSelect={clearExpiryFilter} className="text-destructive focus:text-destructive">
                       Limpar Filtro de Data
                    </DropdownMenuItem>
                )}


                <DropdownMenuSeparator />
                
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <Building className="mr-2 h-4 w-4" />
                        <span>Prédio</span>
                        {selectedBuildingIds.length > 0 && <span className="ml-auto text-xs">{selectedBuildingIds.length}</span>}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="p-0">
                        <Command>
                            <CommandInput placeholder="Buscar prédio..." autoFocus />
                            <CommandList>
                                <CommandEmpty>Nenhum prédio encontrado.</CommandEmpty>
                                <CommandGroup>
                                    {buildings.map((building) => (
                                        <CommandItem
                                            key={building.id}
                                            value={building.name}
                                            onSelect={() => handleBuildingSelect(building.id)}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    selectedBuildingIds.includes(building.id) ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {building.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
                {selectedBuildingIds.length > 0 && (
                     <DropdownMenuItem onSelect={() => onSelectedBuildingIdsChange([])} className="text-destructive focus:text-destructive">
                       Limpar Filtro de Prédios
                    </DropdownMenuItem>
                )}

            </DropdownMenuContent>
        </DropdownMenu>
    )
}
