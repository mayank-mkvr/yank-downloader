"use client";

import Link from "next/link";
import { ArrowRight, Video, Music, HardDrive, Zap, PlaySquare, Camera, Share2 } from "lucide-react";
import { playPop } from "@/utils/sfx";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden flex-1 flex flex-col justify-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-sm text-gray-300 mb-8 border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <Zap className="w-4 h-4 text-white" strokeWidth={1.5} />
            <span>Powered by InsForge MCP</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 drop-shadow-2xl">
            Download Videos in <br />
            <span className="text-gradient">Highest Quality.</span>
          </h1>
          
          <p className="mt-4 max-w-2xl text-lg md:text-xl text-gray-400 mx-auto mb-12">
            Fast, Clean & Unlimited Downloads from YouTube, Instagram & Facebook. No ads, no popups. Just pure cinematic downloading.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/app"
              onClick={playPop}
              className="relative group px-8 py-4 rounded-full bg-gradient-primary text-black font-bold text-lg overflow-hidden shadow-[0_15px_35px_rgba(255,255,255,0.3)] transition-all duration-300 ease-apple hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
              <div className="relative flex items-center gap-2">
                <Video className="w-5 h-5" strokeWidth={1.5} />
                <span>Download Video</span>
              </div>
            </Link>

            <Link 
              href="/audio"
              onClick={playPop}
              className="relative group px-8 py-4 rounded-full glass-panel border-white/20 text-white font-bold text-lg hover:bg-white/10 transition-all duration-300 ease-apple hover:scale-[1.02] active:scale-[0.98] shadow-[0_15px_35px_rgba(0,0,0,0.5)]"
            >
              <div className="relative flex items-center gap-2">
                <Music className="w-5 h-5" strokeWidth={1.5} />
                <span>Extract Audio</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { 
                svg: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z" />
                    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
                  </svg>
                ),
                title: "YouTube", desc: "Up to 4K resolution with 60fps support.", color: "text-red-500" 
              },
              { 
                svg: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                ),
                title: "Instagram", desc: "Download high-quality reels and stories.", color: "text-pink-500" 
              },
              { 
                svg: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                ),
                title: "Facebook", desc: "Extract private and public FB videos.", color: "text-blue-500" 
              },
              { 
                svg: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                ),
                title: "Audio Only", desc: "Convert any video to 320kbps MP3.", color: "text-white" 
              },
            ].map((feature, i) => (
              <div key={i} className="glass-panel p-8 rounded-[24px] hover:glass-panel-glow transition-all duration-500 group cursor-pointer shadow-[0_20px_40px_-10px_rgba(0,0,0,0.6)]">
                <div className={`w-14 h-14 rounded-[16px] bg-white/5 flex items-center justify-center mb-6 border border-white/10 group-hover:scale-110 transition-transform duration-500 shadow-[0_10px_20px_rgba(0,0,0,0.3)] ${feature.color}`}>
                  {feature.svg}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="w-full py-8 text-center border-t border-white/5 relative z-10">
        <p className="text-gray-500 font-medium text-sm">
          made by <span className="text-white font-bold tracking-wider">Yank.</span>
        </p>
      </footer>
    </div>
  );
}

