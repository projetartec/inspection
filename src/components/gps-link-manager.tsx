
"use client";

import { useState } from "react";
import { MapPin, Loader2, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { updateBuildingAction } from "@/lib/actions";
import type { Building } from "@/lib/types";

interface GpsLinkManagerProps {
  clientId: string;
  building: Building;
  onUpdate: (buildingId: string, newLink: string | undefined) => void;
}

export function GpsLinkManager({ clientId, building, onUpdate }: GpsLinkManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newLink, setNewLink] = useState(building.gpsLink || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleOpenLink = () => {
    if (building.gpsLink) {
      window.open(building.gpsLink, "_blank", "noopener,noreferrer");
    } else {
      setIsOpen(true);
    }
  };

  const handleSave = async () => {
    if (newLink && !URL.canParse(newLink)) {
        toast({
            variant: "destructive",
            title: "Link Inválido",
            description: "Por favor, insira um link válido (ex: https://maps.app.goo.gl/...)"
        });
        return;
    }

    setIsSubmitting(true);
    try {
        const formData = new FormData();
        formData.append('name', building.name);
        formData.append('gpsLink', newLink);
        
        await updateBuildingAction(clientId, building.id, formData);
        
        onUpdate(building.id, newLink);
        toast({
            title: "Sucesso!",
            description: "Link de GPS salvo com sucesso."
        });
        setIsOpen(false);
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Erro ao Salvar",
            description: error.message || "Não foi possível salvar o link."
        });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleClear = async () => {
    setIsSubmitting(true);
    try {
        const formData = new FormData();
        formData.append('name', building.name);
        formData.append('gpsLink', ''); // Send empty string to clear

        await updateBuildingAction(clientId, building.id, formData);

        onUpdate(building.id, undefined);
        setNewLink('');
        toast({
            title: "Link Removido",
            description: "O link de GPS foi removido."
        });
        setIsOpen(false);
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Erro ao Remover",
            description: error.message || "Não foi possível remover o link."
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button variant="ghost" size="icon" onClick={handleOpenLink} title="Abrir/Gerenciar Link de GPS">
        <MapPin className={`h-5 w-5 ${building.gpsLink ? "text-primary" : ""}`} />
        <span className="sr-only">Gerenciar Link GPS</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar Link de GPS para "{building.name}"</DialogTitle>
            <DialogDescription>
              Insira ou edite o link do Google Maps para este local. Este link será usado para abrir a localização no GPS.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="gps-link">Link do Google Maps</Label>
            <Input
              id="gps-link"
              value={newLink}
              onChange={(e) => setNewLink(e.target.value)}
              placeholder="https://maps.app.goo.gl/..."
            />
          </div>
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={handleClear} disabled={isSubmitting || !building.gpsLink}>
              {isSubmitting && building.gpsLink ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash className="mr-2"/>}
              Limpar Link
            </Button>
            <div className="flex gap-2">
                <DialogClose asChild>
                    <Button type="button" variant="secondary">
                        Cancelar
                    </Button>
                </DialogClose>
                <Button onClick={handleSave} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
                </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
