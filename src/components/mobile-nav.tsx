"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Flame, Droplets, ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();

  const menuItems = [
    { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
    { href: "/extinguishers", label: "Extintores", icon: Flame },
    { href: "/scan", label: "Escanear", icon: ScanLine },
    { href: "/hoses", label: "Mangueiras", icon: Droplets },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t z-50">
      <nav className="flex items-center justify-around h-full">
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.href) && (item.href === '/dashboard' ? pathname === item.href : true);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full text-sm font-medium",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-6 w-6 mb-1" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
