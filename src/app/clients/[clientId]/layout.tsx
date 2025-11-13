

'use client';

import { Sidebar, SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { MainNav } from "@/components/main-nav";
import { MobileNav } from "@/components/mobile-nav";
import React, { useState, createContext } from "react";

export const ConsultationSummaryContext = createContext<{
  summary: React.ReactNode | null;
  setSummary: (summary: React.ReactNode | null) => void;
}>({
  summary: null,
  setSummary: () => {},
});


export default function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { clientId: string };
}) {
  const [summary, setSummary] = useState<React.ReactNode | null>(null);

  return (
    <ConsultationSummaryContext.Provider value={{ summary, setSummary }}>
      <SidebarProvider>
        <Sidebar>
          <MainNav consultationSummary={summary} />
        </Sidebar>
        <SidebarInset>
          <main className="p-4 sm:p-6 lg:p-8 pb-24">
            {children}
          </main>
          {/* <div className="h-16 md:hidden" /> Spacer for mobile nav */}
          <MobileNav />
        </SidebarInset>
      </SidebarProvider>
    </ConsultationSummaryContext.Provider>
  );
}
