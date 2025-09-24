
"use client";

import { useInspectionSession } from '@/hooks/use-inspection-session';
import { Button } from './ui/button';
import { Loader2, Flag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export function InspectionFooter() {
    const { session, endInspection } = useInspectionSession();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!session) {
        return null;
    }

    const handleEndInspection = async () => {
        setIsSubmitting(true);
        try {
            await endInspection();
            toast({
                title: 'Inspeção Finalizada',
                description: 'A sessão de inspeção foi salva com sucesso.',
            });
        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Erro ao Salvar',
                description: 'Não foi possível salvar a sessão de inspeção.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <footer className="fixed bottom-0 left-0 right-0 md:left-[var(--sidebar-width)] peer-data-[state=collapsed]:md:left-[var(--sidebar-width-icon)] peer-data-[collapsible=offcanvas]:md:left-0 transition-[left] ease-linear duration-200 z-40">
            <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between shadow-lg">
                <div className="font-semibold">
                    Inspeção em Andamento... ({session.inspectedItems.length} itens)
                </div>
                <Button 
                    variant="secondary" 
                    onClick={handleEndInspection}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                       <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                       <Flag className="mr-2 h-4 w-4" />
                    )}
                    Finalizar Inspeção
                </Button>
            </div>
        </footer>
    );
}
