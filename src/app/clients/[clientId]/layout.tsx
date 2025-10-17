
import { Sidebar, SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { MainNav } from "@/components/main-nav";
import { MobileNav } from "@/components/mobile-nav";
import { InspectionProvider } from "@/hooks/use-inspection-session.tsx";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <InspectionProvider>
      <SidebarProvider>
        <Sidebar>
          <MainNav />
        </Sidebar>
        <SidebarInset>
          <main className="p-4 sm:p-6 lg:p-8 pb-24">
            {children}
          </main>
          <div className="h-16 md:hidden" /> {/* Spacer for mobile nav */}
          <MobileNav />
        </SidebarInset>
      </SidebarProvider>
    </InspectionProvider>
  );
}
