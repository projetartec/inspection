
"use client";

import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import { LayoutDashboard, Flame, Droplets, Users, ChevronLeft, Flag, Loader2, FileSearch } from "lucide-react";
import { AppLogo } from "@/components/app-logo";
import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { ReportGenerator } from "@/components/report-generator";
import { useInspectionSession } from '@/hooks/use-inspection-session.tsx';
import { Button } from "./ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ClientReportGenerator } from "./client-report-generator";

export function MainNav() {
  const pathname = usePathname();
  const params = useParams() as { clientId?: string, buildingId?: string };
  const { clientId, buildingId } = params;
  const { session, endInspection } = useInspectionSession();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isInspectionActive = !!session && session.buildingId === buildingId;

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

  if (!clientId) {
    // Root page - Client List
    return (
        <>
            <SidebarHeader>
                <AppLogo />
                <SidebarTrigger className="hidden md:flex" />
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname === '/'} tooltip="Todos os Clientes">
                            <Link href="/">
                                <Users />
                                <span>Todos os Clientes</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarContent>
        </>
    );
  }
  
  if (pathname.endsWith('/consultation')) {
     return (
          <>
              <SidebarHeader>
                  <AppLogo />
                  <SidebarTrigger className="hidden md:flex" />
              </SidebarHeader>
              <SidebarContent>
                  <SidebarMenu>
                      <SidebarMenuItem>
                           <SidebarMenuButton asChild tooltip="Voltar para Prédios">
                                <Link href={`/clients/${clientId}`}>
                                    <ChevronLeft />
                                    <span>Voltar para Prédios</span>
                                </Link>
                           </SidebarMenuButton>
                      </SidebarMenuItem>
                  </SidebarMenu>
              </SidebarContent>
          </>
      )
  }

  if (clientId && !buildingId) {
      // Client Page - Building List
      return (
          <>
              <SidebarHeader>
                  <AppLogo />
                  <SidebarTrigger className="hidden md:flex" />
              </SidebarHeader>
              <SidebarContent>
                  <SidebarMenu>
                      <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip="Todos os Clientes">
                              <Link href="/">
                                  <ChevronLeft />
                                  <span>Todos os Clientes</span>
                              </Link>
                          </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Consulta" isActive={pathname.includes('/consultation')}>
                            <Link href={`/clients/${clientId}/consultation`}>
                                <FileSearch />
                                <span>Consulta</span>
                            </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarSeparator/>
                  </SidebarMenu>
              </SidebarContent>
               <SidebarFooter>
                {clientId && <ClientReportGenerator clientId={clientId} />}
              </SidebarFooter>
          </>
      )
  }

  const buildingBasePath = `/clients/${clientId}/${buildingId}`;

  const menuItems = [
    { href: `${buildingBasePath}/dashboard`, label: "Painel do Prédio", icon: LayoutDashboard },
    { href: `${buildingBasePath}/extinguishers`, label: "Extintores", icon: Flame },
    { href: `${buildingBasePath}/hoses`, label: "Mangueiras", icon: Droplets },
  ];

  return (
    <>
      <SidebarHeader className="flex items-center justify-between">
        <AppLogo />
        <SidebarTrigger className="hidden md:flex" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Todos os Clientes">
                <Link href={`/`}>
                    <Users />
                    <span>Todos os Clientes</span>
                </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Todos os Prédios">
                <Link href={`/clients/${clientId}`}>
                    <ChevronLeft />
                    <span>Todos os Prédios</span>
                </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarSeparator />
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href)}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="flex flex-col gap-2">
        {isInspectionActive && (
            <Button
              variant="destructive"
              className="w-full justify-center group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:p-0"
              onClick={handleEndInspection}
              disabled={isSubmitting}
              >
              {isSubmitting ? <Loader2 className="animate-spin" /> : <Flag />}
              <span className="group-data-[collapsible=icon]:hidden ml-2">Finalizar Inspeção</span>
            </Button>
        )}
        {buildingId && <ReportGenerator clientId={clientId} buildingId={buildingId} />}
      </SidebarFooter>
    </>
  );
}
