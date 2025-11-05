

import { Sidebar, SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { MainNav } from "@/components/main-nav";
import { MobileNav } from "@/components/mobile-nav";

export default function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { clientId: string };
}) {
  return (
      <SidebarProvider>
        <Sidebar>
          <MainNav />
        </Sidebar>
        <SidebarInset>
          <main className="p-4 sm:p-6 lg:p-8 pb-24">
            {children}
          </main>
          {/* <div className="h-16 md:hidden" /> Spacer for mobile nav */}
          <MobileNav />
        </SidebarInset>
      </SidebarProvider>
  );
}
