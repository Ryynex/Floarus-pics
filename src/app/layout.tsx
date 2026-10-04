import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Florus.pics | AI Fashion Studio for Brands",
  description: "Professional AI fashion photography for Indian ethnic wear brands. Turn fabric flat-lays into studio-grade model catalog images.",
  keywords: ["AI Fashion", "B2B SaaS", "Digital Luxury", "Generative AI", "Fashion Modeling", "Florus"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable}`}>
      <body className="bg-void text-ink antialiased min-h-screen selection:bg-clay-soft selection:text-ink">
        {children}
      </body>
    </html>
  );
}
