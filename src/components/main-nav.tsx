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
import { Button } from "./ui/button";

export function MainNav() {
  const pathname = usePathname();
  const params = useParams() as { clientId: string, buildingId: string };
  const { clientId, buildingId } = params;

  if (!clientId || !buildingId) {
    // If we are not in a building context, render a simpler nav,
    // maybe just the logo and a link to home.
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

  const buildingBasePath = `/clients/${clientId}/${buildingId}`;

  const menuItems = [
    { href: `${buildingBasePath}/dashboard`, label: "Painel do Prédio", icon: LayoutDashboard },
    { href: `${buildingBasePath}/extinguishers`, label: "Extintores", icon: Flame },
    { href: `${buildingBasePath}/hoses`, label: "Mangueiras", icon: Droplets },
  ];

  const isBuildingDashboard = pathname === `${buildingBasePath}/dashboard`;
  const isExtinguishersPage = pathname.startsWith(`${buildingBasePath}/extinguishers`);
  const isHosesPage = pathname.startsWith(`${buildingBasePath}/hoses`);

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
                <Link href={`/`}>
                    <Users />
                    <span>Todos os Clientes</span>
                </Link>
            </Button>
          </SidebarMenuItem>
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
                isActive={
                    (item.href === `${buildingBasePath}/dashboard` && isBuildingDashboard) ||
                    (item.href === `${buildingBasePath}/extinguishers` && isExtinguishersPage) ||
                    (item.href === `${buildingBasePath}/hoses` && isHosesPage)
                }
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
