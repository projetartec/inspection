import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { MainNav } from "@/components/main-nav";
import { MobileNav } from "@/components/mobile-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar>
        <MainNav />
      </Sidebar>
      <SidebarInset>
        <main className="p-4 sm:p-6 lg:p-8 pb-24 sm:pb-8">
            {children}
        </main>
      </SidebarInset>
      <MobileNav />
    </SidebarProvider>
  );
}
