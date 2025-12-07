import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Juragan Suplai - Platform Logistik B2B Berbasis AI",
  description: "Platform logistik B2B modern yang menghubungkan pembeli, supplier, dan kurir melalui WhatsApp dengan orkestrasi agen AI cerdas.",
  keywords: ["logistik", "B2B", "supplier", "kurir", "WhatsApp", "AI", "rantai pasok"],
  authors: [{ name: "Juragan Suplai Team" }],
  creator: "Juragan Suplai",
  publisher: "Juragan Suplai",
  openGraph: {
    title: "Juragan Suplai - Platform Logistik B2B Berbasis AI",
    description: "Platform logistik B2B modern yang menghubungkan pembeli, supplier, dan kurir melalui WhatsApp dengan orkestrasi agen AI cerdas.",
    type: "website",
    locale: "id_ID",
  },
  twitter: {
    card: "summary_large_image",
    title: "Juragan Suplai - Platform Logistik B2B Berbasis AI",
    description: "Platform logistik B2B modern yang menghubungkan pembeli, supplier, dan kurir melalui WhatsApp dengan orkestrasi agen AI cerdas.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
