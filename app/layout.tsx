import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar"; // 1. Import Navbar

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CompostMind - AI Composting Assistant",
  description: "Deteksi sampah organik dan pandu pengomposannya dengan AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={inter.className}>
        {/* 2. Pasang Navbar di sini */}
        <Navbar />
        
        {/* 3. Konten halaman akan dirender di bawah Navbar */}
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}