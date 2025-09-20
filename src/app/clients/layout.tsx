import { Sidebar, SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { MainNav } from "@/components/main-nav";
import { MobileNav } from "@/components/mobile-nav";

export default function ClientsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <Sidebar>
        <MainNav />
      </Sidebar>
      <SidebarInset>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <div className="h-16 md:hidden" /> {/* Spacer for mobile nav */}
        <MobileNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
