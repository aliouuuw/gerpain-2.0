import type { Metadata } from "next";
import "./globals.css";
import { ReactQueryProvider } from "@/components/ReactQueryProvider";
import { ThemeProvider } from "next-themes";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  metadataBase: new URL("https://gerpain.com"),
  title: {
    default: "Gerpain ERP",
    template: "%s | Gerpain ERP"
  },
  description: "Système de gestion pour chaînes de boulangeries - Planning, production, ventes et équipe",
  keywords: ["ERP", "Boulangerie", "Gestion", "Production", "Ventes", "Planning"],
  authors: [
    {
      name: "Gerpain",
      url: "https://gerpain.com",
    },
  ],
  creator: "Gerpain",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://gerpain.com",
    title: "Gerpain ERP",
    description: "Système de gestion pour chaînes de boulangeries",
    siteName: "Gerpain ERP",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full" suppressHydrationWarning>
      <body className="h-full antialiased bg-[var(--background)]">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <ToastProvider>
            <ReactQueryProvider>{children}</ReactQueryProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
