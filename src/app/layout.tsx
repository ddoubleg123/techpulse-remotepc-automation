import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TechPulse - AI-Powered Automotive Diagnostics",
  description: "Your AI partner for smarter repairs. TechPulse combines AI assistance, expert support, and a community of mechanics to help you diagnose faster and fix better.",
  keywords: ["automotive", "diagnostics", "AI", "mechanics", "repair", "car repair", "auto repair"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
