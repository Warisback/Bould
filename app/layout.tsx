import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import JoinGate from "@/components/JoinGate";
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
  title: "Beta Review",
  description: "Film your climb. Get a move-by-move review. Climb the gym leaderboard.",
  appleWebApp: { capable: true, title: "Beta Review", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-bg text-ink">
        {/* viewportFit "cover" + a translucent status bar: keep content out from under the notch. */}
        <main className="mx-auto w-full max-w-md pt-[env(safe-area-inset-top)] pb-nav">{children}</main>
        <BottomNav />
        <JoinGate />
      </body>
    </html>
  );
}
