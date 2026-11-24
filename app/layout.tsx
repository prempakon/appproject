import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "LRU Portfolio — แพลตฟอร์มอาชีพสำหรับทุกคน",
    template: "%s · LRU Portfolio",
  },
  description:
    "แพลตฟอร์มพัฒนาอาชีพสำหรับทุกคน: วิเคราะห์ทักษะด้วย AI จับคู่งาน สร้างเรซูเม่พร้อม QR Code และดูเส้นทางอาชีพ — ฟรี ไม่มีระบบชำระเงิน",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
