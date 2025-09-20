"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { LayoutDashboard, Flame, Droplets, Users, ChevronLeft } from "lucide-react";
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

export function MainNav() {
  const pathname = usePathname();
  const params = useParams() as { clientId?: string, buildingId?: string };
  const { clientId, buildingId } = params;

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
                  </SidebarMenu>
              </SidebarContent>
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
      <SidebarFooter>
        <ReportGenerator clientId={clientId} buildingId={buildingId} />
      </SidebarFooter>
    </>
  );
}
