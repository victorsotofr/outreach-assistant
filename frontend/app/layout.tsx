import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import ClientLayout from "./ClientLayout";
import { Toaster } from "sonner"; 

const geistSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Roboto_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UiForm – Outreach Assistant",
  description:
    "Take Your Outreach Further with UiForm",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-gray-900`}
      >
        <ClientLayout>{children}</ClientLayout>
        <Toaster richColors /> {/* Toast system mounted here */}
      </body>
    </html>
  );
}
