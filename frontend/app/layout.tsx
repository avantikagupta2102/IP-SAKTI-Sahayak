import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IP-SAKTI Sahayak — Indian IP & AYUSH Regulatory Guidance",
  description:
    "Grounded decision-support tool for Indian Intellectual Property law and AYUSH regulatory guidance. Every answer is cited, confidence-scored, and accompanied by actionable next steps.",
  keywords: [
    "IP India",
    "patent",
    "trademark",
    "AYUSH",
    "regulatory guidance",
    "intellectual property",
    "India",
    "AI assistant",
  ],
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="relative z-10">
        {/* Skip to main content for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg"
        >
          Skip to main content
        </a>

        <main id="main-content" className="min-h-dvh flex flex-col">
          {children}
        </main>

        {/* Persistent disclaimer footer */}
        <footer className="fixed bottom-0 inset-x-0 z-50 flex justify-center pointer-events-none">
          <div className="pointer-events-auto mx-auto mb-2 px-4 py-1.5 rounded-full text-[11px] text-slate-500 text-center max-w-2xl glass border-slate-800">
            ⚠️ IP-SAKTI Sahayak provides informational guidance based on referenced official sources.
            It is{" "}
            <strong className="text-slate-400">
              not a substitute for professional legal advice
            </strong>{" "}
            or official government decisions. Verify deadlines and conclusions against the latest
            official source.
          </div>
        </footer>
      </body>
    </html>
  );
}
