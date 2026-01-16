
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { UnloadPrompt } from '@/components/unload-prompt';
import { GlobalInspectionProvider } from '@/hooks/use-inspection-session.tsx';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  title: 'FireGuard Inspector',
  description: 'Aplicativo de inspeção para extintores e mangueiras de incêndio',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="https://i.imgur.com/4se4p12.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased bg-background text-foreground">
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <GlobalInspectionProvider>
                <UnloadPrompt />
                {children}
                <Toaster />
            </GlobalInspectionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
