import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TapeWire — news for the tape",
  description:
    "Personalized market news terminal for day traders: raw headlines first, filtered to your watchlist.",
};

export const viewport: Viewport = {
  themeColor: "#0a0e13",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
