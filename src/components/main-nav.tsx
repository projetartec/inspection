"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { LayoutDashboard, Flame, Droplets, ScanLine, PanelLeft, Building, ChevronLeft } from "lucide-react";
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
import { Button } from "./ui/button";

export function MainNav() {
  const pathname = usePathname();
  const params = useParams() as { clientId: string, buildingId: string };
  const { clientId, buildingId } = params;

  if (!clientId || !buildingId) {
    return null; // Don't render nav if we are not in a building context
  }

  const basePath = `/clients/${clientId}/${buildingId}`;

  const menuItems = [
    { href: `${basePath}/dashboard`, label: "Painel", icon: LayoutDashboard },
    { href: `${basePath}/extinguishers`, label: "Extintores", icon: Flame },
    { href: `${basePath}/hoses`, label: "Mangueiras", icon: Droplets },
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
            <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href={`/clients/${clientId}`}>
                    <ChevronLeft />
                    <span>Todos os Prédios</span>
                </Link>
            </Button>
          </SidebarMenuItem>
          <SidebarSeparator />
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href) && (item.href === `${basePath}/dashboard` ? pathname === item.href : true)}
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
