import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Florus.pics | High-End B2B AI Fashion Platform",
  description: "The premier digital luxury fashion generative AI platform. Transform fashion designs, generate studio-grade model photoshoots, and power B2B digital catalogs with AI.",
  keywords: ["AI Fashion", "B2B SaaS", "Digital Luxury", "Generative AI", "Fashion Modeling", "Florus"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} dark`}>
      <body className="bg-void text-white antialiased min-h-screen selection:bg-fuchsia-accent selection:text-white">
        {children}
      </body>
    </html>
  );
}
