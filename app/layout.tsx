import type { Metadata } from "next";
import { Geist, Geist_Mono, Fugaz_One } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/menu/page";
import AuthHeader from './components/auth';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fugaz_one = Fugaz_One({
  subsets: ['latin'],
  weight: ['400'],
});

export const metadata: Metadata = {
  title: "BalanCard",
  description: "Learning effortlessly",
  icons: {
    icon: '/favicon.ico',
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
        className={`${geistSans.variable} ${geistMono.variable} ${fugaz_one.className} font-sans antialiased`}
      >
        <AuthHeader/>
        {children}
        <Sidebar/>
      </body>
    </html>
  );
}
