import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IP-SAKTI Sahayak — Explainable IP & AYUSH Risk Radar",
  description:
    "Explainable compliance digital twin for Indian IP law and AYUSH regulatory guidance. Every risk is evidence-backed, confidence-scored, and paired with an actionable mitigation plan.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
