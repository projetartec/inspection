
"use client";

import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import { LayoutDashboard, Flame, Droplets, ScanLine, Users, ChevronLeft, Building, Flag, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInspectionSession } from "@/hooks/use-inspection-session.tsx";
import { Button } from "./ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function MobileNav() {
  const pathname = usePathname();
  const params = useParams() as { clientId?: string, buildingId?: string };
  const { clientId, buildingId } = params;
  const { session, endInspection } = useInspectionSession();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleEndInspection = async () => {
    if (!session) return;
    setIsSubmitting(true);
    try {
        await endInspection();
        toast({
            title: 'Inspeção Finalizada',
            description: 'A sessão de inspeção foi salva com sucesso.',
        });
        router.push(`/clients/${session.clientId}/${session.buildingId}/dashboard`);
        router.refresh();
    } catch (error: any) {
        console.error(error);
        toast({
            variant: 'destructive',
            title: 'Erro ao Salvar',
            description: error.message || 'Não foi possível salvar a sessão de inspeção.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const isInspectionActive = session && session.buildingId === buildingId;

  if (!clientId) {
    // Root page (client list)
    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t z-50">
            <nav className="flex items-center justify-around h-full">
                <Link href="/" className={cn("flex flex-col items-center justify-center w-full h-full text-sm font-medium", pathname === '/' ? "text-primary" : "text-muted-foreground")}>
                    <Users className="h-6 w-6" />
                </Link>
            </nav>
        </div>
    )
  }

  if (clientId && !buildingId) {
    // Building list page for a client
     return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t z-50">
            <nav className="flex items-center justify-around h-full">
                 <Link href="/" className={cn("flex flex-col items-center justify-center w-full h-full text-sm font-medium", "text-muted-foreground")}>
                    <ChevronLeft className="h-6 w-6" />
                </Link>
                <Link href={`/clients/${clientId}`} className={cn("flex flex-col items-center justify-center w-full h-full text-sm font-medium", pathname === `/clients/${clientId}` ? "text-primary" : "text-muted-foreground")}>
                    <Building className="h-6 w-6" />
                </Link>
            </nav>
        </div>
    )
  }


  const buildingBasePath = `/clients/${clientId}/${buildingId}`;

  const menuItems = [
    { href: `${buildingBasePath}/dashboard`, icon: LayoutDashboard },
    { href: `${buildingBasePath}/extinguishers`, icon: Flame },
    { href: `${buildingBasePath}/hoses`, icon: Droplets },
    { href: `${buildingBasePath}/scan`, icon: ScanLine },
    { href: `/clients/${clientId}`, icon: Building },
  ];

  const gridColsClass = isInspectionActive ? 'grid-cols-6' : 'grid-cols-5';

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t z-50">
      <nav className={cn("grid items-center justify-around h-full", gridColsClass)}>
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.href) && item.href.length > (buildingBasePath.length - 2);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full text-xs font-medium text-center",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-6 w-6" />
            </Link>
          );
        })}
        {isInspectionActive && (
            <Button
                variant="ghost"
                className="flex flex-col items-center justify-center w-full h-full text-xs font-medium text-center text-primary p-0"
                onClick={handleEndInspection}
                disabled={isSubmitting}
            >
                {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <Flag className="h-6 w-6" />}
            </Button>
        )}
      </nav>
    </div>
  );
}
