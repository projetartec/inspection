
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Building, Calendar as CalendarIcon, Check, Filter } from 'lucide-react';
import type { Building as BuildingType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';

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

    const [buildingFilterOpen, setBuildingFilterOpen] = useState(false);
    const [dateFilterOpen, setDateFilterOpen] = useState(false);

    const handleBuildingSelect = (buildingId: string) => {
        const newSelectedIds = selectedBuildingIds.includes(buildingId)
            ? selectedBuildingIds.filter(id => id !== buildingId)
            : [...selectedBuildingIds, buildingId];
        onSelectedBuildingIdsChange(newSelectedIds);
    };

    const handleFutureDateSelect = (date: Date | undefined) => {
        if (date) {
            onExpiryFilterChange({ type: 'future', date });
            setDateFilterOpen(false);
        }
    }
    
    const handleThisMonthSelect = () => {
        onExpiryFilterChange({ type: 'this_month' });
        setDateFilterOpen(false);
    }
    
    const clearExpiryFilter = () => {
        onExpiryFilterChange({ type: 'none' });
        setDateFilterOpen(false);
    }

    const isAnyFilterActive = selectedBuildingIds.length > 0 || expiryFilter.type !== 'none';
    
    const getExpiryFilterLabel = () => {
        if (expiryFilter.type === 'this_month') return "Vencem este Mês";
        if (expiryFilter.type === 'future' && expiryFilter.date) return `Venc. em ${format(expiryFilter.date, 'dd/MM/yyyy')}`;
        return "Filtrar por data...";
    }

    return (
        <div className="flex gap-2">
            {/* Date Filter */}
            <Popover open={dateFilterOpen} onOpenChange={setDateFilterOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[180px] justify-start text-left font-normal", expiryFilter.type !== 'none' && "text-primary ring-2 ring-primary")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        <span className="truncate">{getExpiryFilterLabel()}</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-2">
                         <Button variant="ghost" className="w-full justify-start" onClick={handleThisMonthSelect}>
                            Vencem este Mês
                        </Button>
                    </div>
                    <Calendar
                        mode="single"
                        selected={expiryFilter.type === 'future' ? expiryFilter.date : undefined}
                        onSelect={handleFutureDateSelect}
                        initialFocus
                        locale={ptBR}
                        captionLayout="dropdown-nav"
                        fromYear={new Date().getFullYear()}
                        toYear={new Date().getFullYear() + 10}
                    />
                     <div className="p-2 border-t">
                        <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive" onClick={clearExpiryFilter}>
                            Limpar Filtro de Data
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>


            {/* Building Filter */}
            <Popover open={buildingFilterOpen} onOpenChange={setBuildingFilterOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={buildingFilterOpen} className={cn("w-[200px] justify-between", selectedBuildingIds.length > 0 && "text-primary ring-2 ring-primary")}>
                         <Building className="mr-2 h-4 w-4" />
                        <span className="truncate">
                           {selectedBuildingIds.length > 0 ? `${selectedBuildingIds.length} prédio(s) selecionado(s)` : "Filtrar por prédio..."}
                        </span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0" align="end">
                     <Command>
                        <CommandInput placeholder="Buscar prédio..." />
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
                         {selectedBuildingIds.length > 0 && (
                            <>
                                <CommandSeparator />
                                <CommandGroup>
                                    <CommandItem onSelect={() => onSelectedBuildingIdsChange([])} className="text-destructive">
                                        Limpar seleção
                                    </CommandItem>
                                </CommandGroup>
                            </>
                        )}
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    )
}
