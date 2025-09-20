import { Sidebar, SidebarContent, SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { MainNav } from "@/components/main-nav";
import { MobileNav } from "@/components/mobile-nav";

export default function AppLayout({
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
    return (
        <SidebarProvider>
            <Sidebar>
                <MainNav />
            </Sidebar>
            <SidebarInset>
                <main className="p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
                <div className="h-16 md:hidden" />
                <MobileNav />
            </SidebarInset>
        </SidebarProvider>
    );
  }
