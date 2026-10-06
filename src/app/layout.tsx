import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Florus AI | Luxury AI Fashion Studio for Brands",
  description: "Professional Florus AI fashion photography for Indian ethnic wear brands. Turn fabric flat-lays into studio-grade model catalog images.",
  keywords: ["Florus AI", "Fashion Modeling", "Digital Luxury", "Ethnic Wear Lookbooks", "AI Studio"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${playfairDisplay.variable}`}>
      <body className="bg-void text-ink font-sans antialiased min-h-screen selection:bg-clay-soft selection:text-ink">
        {children}
      </body>
    </html>
  );
}
