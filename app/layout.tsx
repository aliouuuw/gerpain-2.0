import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="fr" className="h-full light" suppressHydrationWarning>
      <body className="h-full antialiased bg-stone-50">
        {children}
      </body>
    </html>
  );
}
