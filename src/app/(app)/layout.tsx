export default function AppLayout({
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
    return (
        <main className="p-4 sm:p-6 lg:p-8">
            {children}
        </main>
    );
  }
