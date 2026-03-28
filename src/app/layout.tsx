import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LocaleProvider } from "@/lib/i18n/locale-provider";
import { SWRProvider } from "@/lib/swr/swr-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FireQA - QA 자동화 플랫폼",
  description:
    "기획 문서를 기반으로 QA 테스트케이스와 와이어프레임을 자동 생성합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SWRProvider>
          <LocaleProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </LocaleProvider>
        </SWRProvider>
        <Toaster />
      </body>
    </html>
  );
}
