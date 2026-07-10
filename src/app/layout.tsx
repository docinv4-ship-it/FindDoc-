import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ConsentProvider from "@/components/ConsentProvider";
import PWAProvider from "@/components/PWAProvider";
import BottomNav from "@/components/BottomNav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DocFind - Find & Book Healthcare Appointments",
  description: "Find verified doctors, check real-time availability, and book appointments instantly. Quality healthcare access made simple.",
  manifest: "/manifest.json",
  themeColor: "#36d1cf",
  openGraph: {
    title: "DocFind - Find & Book Healthcare Appointments",
    description: "Find verified doctors, check real-time availability, and book appointments instantly. Quality healthcare access made simple.",
    url: "https://docfind.com",
    siteName: "DocFind",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "DocFind - Healthcare Booking Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DocFind - Find & Book Healthcare Appointments",
    description: "Find verified doctors, check real-time availability, and book appointments instantly.",
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DocFind",
  },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#36d1cf",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PWAProvider>
          {children}
          <BottomNav />
        </PWAProvider>
        <ConsentProvider />
      </body>
    </html>
  );
}
