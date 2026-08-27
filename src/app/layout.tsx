import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Agro AI",
  description: "Clima confiable para tu parcela exacta",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="es" className={`${fraunces.variable} ${sourceSans.variable}`}>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
