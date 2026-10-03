import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "TriviaPay — Answer trivia, earn on M-Pesa",
  description:
    "TriviaPay web: answer Kenyan trivia, earn real money on M-Pesa. Same account database as the TriviaPay app.",
};

export const viewport: Viewport = {
  themeColor: "#00A859",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-full bg-slate-50 text-slate-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
