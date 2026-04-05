import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TechPulse - AI-Powered Automotive Diagnostics",
  description: "Complete automotive diagnostics in seconds using A.I.",
};

const themeScript = `(function(){try{var t=localStorage.getItem('tp-theme')||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
