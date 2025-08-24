import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NextAuthProvider from "@/components/NextAuthProvider";
import WalletProvider from "@/components/WalletProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Pixey by VibeGame',
  description: 'Create pixel art on VibeGame powered by Solana',
  icons: {
    icon: '/img.svg',
    shortcut: '/img.svg',
    apple: '/img.svg',
  },
  openGraph: {
    title: 'Pixey by VibeGame',
    description: 'Create pixel art on VibeGame powered by Solana',
    images: [
      {
        url: '/og1.png',
        width: 1200,
        height: 630,
        alt: 'Pixey - Pixel Art Game',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pixey by VibeGame',
    description: 'Create pixel art on VibeGame powered by Solana',
    images: ['/og1.png'],
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextAuthProvider>
          <WalletProvider>
            {children}
          </WalletProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
