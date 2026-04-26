import type { Metadata } from "next";
import { ClientShell } from "@/components/ClientShell";
import "./globals.css";

const themeScript = `
  try {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
`;

export const metadata: Metadata = {
  title: "SorobanLoyalty",
  description: "On-chain loyalty platform built on Stellar",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
