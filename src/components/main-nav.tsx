
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
import Image from 'next/image';


export function MainNav({ consultationSummary }: { consultationSummary?: React.ReactNode }) {
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
                        <SidebarMenuButton asChild isActive={pathname === '/'} tooltip="Clientes">
                            <Link href="/">
                                <Users />
                                <span>Clientes</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarContent>
        </>
    );
  }
  
  if (clientId && !buildingId) {
      // Client Page - Building List OR Consultation Page
      const isConsultationPage = pathname.includes('/consultation');
      const isClientPage = pathname === `/clients/${clientId}`;

      return (
          <>
              <SidebarHeader>
                  <AppLogo />
                  <SidebarTrigger className="hidden md:flex" />
              </SidebarHeader>
              <SidebarContent>
                  <SidebarMenu>
                      <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip="Clientes">
                              <Link href="/">
                                  <ChevronLeft />
                                  <span>Clientes</span>
                              </Link>
                          </SidebarMenuButton>
                      </SidebarMenuItem>
                      {isConsultationPage && (
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="Prédios">
                                <Link href={`/clients/${clientId}`}>
                                    <ChevronLeft />
                                    <span>Prédios</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                      )}
                      <SidebarSeparator/>
                       <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Consulta" isActive={isConsultationPage}>
                            <Link href={`/clients/${clientId}/consultation`}>
                                <FileSearch />
                                <span>Consulta</span>
                            </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                  </SidebarMenu>
                  {isConsultationPage && consultationSummary && (
                    <>
                        <SidebarSeparator />
                        <div className="p-2 space-y-2">
                             <h4 className="px-2 text-xs font-medium text-sidebar-foreground/70">Resumo da Consulta</h4>
                             {consultationSummary}
                        </div>
                    </>
                  )}
              </SidebarContent>
               <SidebarFooter>
                 <ClientReportGenerator clientId={clientId} />
              </SidebarFooter>
          </>
      )
  }

  const buildingBasePath = `/clients/${clientId}/${buildingId}`;

  const menuItems = [
    { href: `${buildingBasePath}/dashboard`, label: "Painel do Prédio", icon: LayoutDashboard, iconUrl: null },
    { href: `${buildingBasePath}/extinguishers`, label: "Extintores", icon: null, iconUrl: 'https://i.imgur.com/acESc0O.png' },
    { href: `${buildingBasePath}/hoses`, label: "Mangueiras", icon: null, iconUrl: 'https://i.imgur.com/Fq1OHRb.png' },
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
            <SidebarMenuButton asChild tooltip="Clientes">
                <Link href={`/`}>
                    <Users />
                    <span>Clientes</span>
                </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Prédios">
                <Link href={`/clients/${clientId}`}>
                    <ChevronLeft />
                    <span>Prédios</span>
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
                  {item.iconUrl ? <Image src={item.iconUrl} alt={item.label} width={20} height={20} /> : item.icon && <item.icon />}
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
           <SidebarSeparator />
            <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Consulta" isActive={pathname.includes('/consultation')}>
                    <Link href={`/clients/${clientId}/consultation`}>
                        <FileSearch />
                        <span>Consulta</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
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
