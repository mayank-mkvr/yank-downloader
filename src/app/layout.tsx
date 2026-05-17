import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SaveX - 4K Video Downloader for YouTube, Instagram, Facebook",
  description: "Free, fast, and unlimited high-quality video and audio downloader for YouTube, Instagram Reels, and Facebook. Download 4K, 1080p, and MP3 instantly with SaveX.",
  keywords: "youtube downloader, instagram reels downloader, facebook video downloader, 4k video download, free video downloader, youtube to mp3",
  openGraph: {
    title: "SaveX - The Ultimate 4K Media Downloader",
    description: "Download stunning 4K videos from YouTube, Instagram, and Facebook in seconds.",
    url: "https://savex.app",
    siteName: "SaveX",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col relative overflow-x-hidden" suppressHydrationWarning>
        {/* Global 3D Animated Background Blobs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#000000]">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/15 rounded-full mix-blend-screen filter blur-[100px] opacity-60 animate-blob" />
          <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-purple-600/15 rounded-full mix-blend-screen filter blur-[100px] opacity-60 animate-blob animation-delay-2000" />
          <div className="absolute bottom-1/4 left-1/3 w-[500px] h-[500px] bg-indigo-600/15 rounded-full mix-blend-screen filter blur-[100px] opacity-60 animate-blob animation-delay-4000" />
        </div>
        
        <Navbar />
        <main className="flex-1 relative z-10 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
