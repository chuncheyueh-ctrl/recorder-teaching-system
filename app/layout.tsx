import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AppStateProvider } from "@/state/app-state-provider";
import { Toast } from "@/components/ui/toast";

const openhuninn = localFont({
  src: "./fonts/jf-openhuninn-2.1.woff2",
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "中正國小直笛團｜教師工作台",
  description: "V22.1 Fast Save 教師工作台",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets the page paint under the notch/home-indicator safe areas instead of
  // being letterboxed by them — combined with env(safe-area-inset-*) on the
  // fixed tab bar/FAB/toast below so nothing sits under the home indicator.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant" className={`${openhuninn.variable} h-full`}>
      <body className="min-h-full">
        <AppStateProvider>
          {children}
          <Toast />
        </AppStateProvider>
      </body>
    </html>
  );
}
