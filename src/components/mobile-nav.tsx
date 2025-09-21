"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { LayoutDashboard, Flame, Droplets, ScanLine, Users, ChevronLeft, Building } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();
  const params = useParams() as { clientId?: string, buildingId?: string };
  const { clientId, buildingId } = params;

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
    { href: `${buildingBasePath}/dashboard`, label: "Painel", icon: LayoutDashboard },
    { href: `${buildingBasePath}/extinguishers`, label: "Extintores", icon: Flame },
    { href: `${buildingBasePath}/scan`, label: "Escanear", icon: ScanLine },
    { href: `${buildingBasePath}/hoses`, label: "Mangueiras", icon: Droplets },
    { href: `/clients/${clientId}`, label: "Prédios", icon: Building },
    { href: `/`, label: "Clientes", icon: Users },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t z-50">
      <nav className="grid grid-cols-6 items-center justify-around h-full">
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
              <span className="sr-only">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
