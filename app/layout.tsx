import type { Metadata } from "next";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { LucyChatbot } from "@/components/LucyChatbot";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vibe With Tribe — More Fun. Less Stress.",
  description: "Your little corner of the internet for friends, fun, and a softer scroll.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Vibe With Tribe — More Fun. Less Stress.",
    description: "Your little corner of the internet for friends, fun, and a softer scroll.",
    siteName: "Vibe With Tribe",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Vibe With Tribe — More Fun. Less Stress.",
    description: "Your little corner of the internet for friends, fun, and a softer scroll.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
        <LucyChatbot />
      </body>
    </html>
  );
}