"use client";
import Link from "next/link";
import { DownloadCloud, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full glass-panel border-b border-white/5 bg-[#000000]/85 md:bg-[#000000]/70 backdrop-blur-3xl md:backdrop-blur-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[14px] bg-gradient-primary flex items-center justify-center shadow-[0_10px_20px_rgba(255,255,255,0.15),inset_0_1px_1px_rgba(255,255,255,0.5)]">
                {/* Premium Isometric Box Logo */}
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-black">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </div>
              <span className="font-bold text-2xl tracking-tight text-white drop-shadow-md flex items-baseline">
                Save<span className="text-gray-300 text-[1.3em] leading-none ml-[1px]">X</span>
              </span>
            </Link>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <Link href="/" className="text-gray-300 hover:text-white transition-colors duration-300">Home</Link>
              <Link href="/app" className="text-gray-300 hover:text-white transition-colors duration-300">Downloader</Link>
              <Link href="/audio" className="text-gray-300 hover:text-white transition-colors duration-300">Audio Only</Link>
              <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors duration-300">Dashboard</Link>
            </div>
          </div>

          <div className="hidden md:flex">
            <Link 
              href="/app" 
              className="relative group px-6 py-2.5 rounded-full bg-white/5 border border-white/10 hover:border-white/30 transition-all duration-300 ease-apple hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
              <span className="relative text-sm font-semibold text-white tracking-wide">
                Get Started
              </span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="-mr-2 flex md:hidden">
            <button 
              onClick={() => {
                setIsOpen(!isOpen);
              }}
              type="button" 
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-white/5 focus:outline-none transition-all duration-300 ease-apple active:scale-95"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? <X className="block h-6 w-6" aria-hidden="true" /> : <Menu className="block h-6 w-6" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      {/* Full Screen Blurred Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 top-20 z-40 bg-black/60 backdrop-blur-md md:hidden animate-in fade-in duration-300"
        />
      )}

      {/* Mobile Menu Panel */}
      {isOpen && (
        <div className="md:hidden border-b border-white/10 bg-black/95 backdrop-blur-[40px] saturate-[180%] animate-in slide-in-from-top-4 duration-300 ease-apple absolute w-full left-0 z-50 shadow-2xl">
          <div className="px-6 pt-4 pb-8 space-y-3 flex flex-col">
            <Link onClick={() => { setIsOpen(false); }} href="/" className="text-gray-300 hover:text-white hover:bg-white/10 block px-4 py-3 rounded-xl text-base font-medium transition-all active:scale-[0.98]">Home</Link>
            <Link onClick={() => { setIsOpen(false); }} href="/app" className="text-gray-300 hover:text-white hover:bg-white/10 block px-4 py-3 rounded-xl text-base font-medium transition-all active:scale-[0.98]">Downloader</Link>
            <Link onClick={() => { setIsOpen(false); }} href="/audio" className="text-gray-300 hover:text-white hover:bg-white/10 block px-4 py-3 rounded-xl text-base font-medium transition-all active:scale-[0.98]">Audio Only</Link>
            <Link onClick={() => { setIsOpen(false); }} href="/dashboard" className="text-gray-300 hover:text-white hover:bg-white/10 block px-4 py-3 rounded-xl text-base font-medium transition-all active:scale-[0.98]">Dashboard</Link>
            <Link onClick={() => { setIsOpen(false); }} href="/app" className="mt-4 text-center block px-4 py-3 rounded-xl bg-gradient-primary text-black font-bold text-base shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all active:scale-[0.98]">
              Get Started
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
