"use client";

import { useState } from "react";
import { PlaySquare, Camera, Share2, Link as LinkIcon, Download, Music, ShieldCheck, Activity, Search } from "lucide-react";
import Image from "next/image";
import { playPop, playSuccess } from "@/utils/sfx";

export default function DownloaderApp() {
  const [activeTab, setActiveTab] = useState("youtube");
  const [url, setUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [videoData, setVideoData] = useState<any>(null);

  const tabs = [
    { id: "youtube", name: "YouTube", color: "text-red-500", hoverBg: "hover:bg-red-500/10" },
    { id: "instagram", name: "Instagram", color: "text-pink-500", hoverBg: "hover:bg-pink-500/10" },
    { id: "facebook", name: "Facebook", color: "text-blue-500", hoverBg: "hover:bg-blue-500/10" },
  ];

  const handleProcessUrl = async () => {
    if (!url) return;

    const lowerUrl = url.toLowerCase();
    if (activeTab === 'youtube' && !lowerUrl.includes('youtube.com') && !lowerUrl.includes('youtu.be')) {
      alert("Invalid link! Please enter a valid YouTube URL for the YouTube Downloader.");
      return;
    }
    if (activeTab === 'instagram' && !lowerUrl.includes('instagram.com')) {
      alert("Invalid link! Please enter a valid Instagram URL for the Instagram Downloader.");
      return;
    }
    if (activeTab === 'facebook' && !lowerUrl.includes('facebook.com') && !lowerUrl.includes('fb.watch') && !lowerUrl.includes('fb.gg')) {
      alert("Invalid link! Please enter a valid Facebook URL for the Facebook Downloader.");
      return;
    }

    setIsProcessing(true);
    setVideoData(null); // Reset previous data
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (response.ok) {
        playSuccess();
        setVideoData(data);
      } else {
        alert(data.error || 'Failed to fetch video data');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while connecting to the backend.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8 gap-4 lg:gap-8">
      {/* Sidebar Navigation / Mobile Tabs */}
      <div className="w-full lg:w-64 shrink-0 flex flex-col gap-4">
        <div className="glass-panel p-2 lg:p-4 rounded-2xl overflow-x-auto custom-scrollbar">
          <h2 className="font-orbitron font-bold text-lg mb-4 text-white hidden lg:block px-2">Platforms</h2>
          <nav className="flex lg:flex-col gap-2 min-w-max lg:min-w-0 pb-1 lg:pb-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  playPop();
                  setActiveTab(tab.id);
                }}
                className={`flex items-center gap-2 lg:gap-3 px-4 py-2.5 lg:py-3 rounded-xl transition-all duration-300 ease-apple hover:scale-[1.02] active:scale-[0.98] ${
                  activeTab === tab.id 
                    ? "bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/20" 
                    : `hover:bg-white/5 border border-transparent ${tab.hoverBg}`
                }`}
              >
                <span className={`font-semibold text-sm lg:text-base transition-colors ${activeTab === tab.id ? tab.color : "text-gray-400"}`}>
                  {tab.name}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="glass-panel p-4 rounded-2xl hidden lg:flex flex-1 flex-col justify-end opacity-60 hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <ShieldCheck className="w-4 h-4 text-white" strokeWidth={1.5} />
            <span>Secure connection</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Activity className="w-4 h-4 text-white" strokeWidth={1.5} />
            <span>MCP Online</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-8 w-full max-w-full min-w-0">
        {/* Input Section */}
        <div className="glass-panel-glow p-6 sm:p-8 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-cyan/10 blur-[80px] rounded-full pointer-events-none" />
          
          <h2 className="text-2xl sm:text-3xl font-orbitron font-bold text-white mb-2">
            {tabs.find(t => t.id === activeTab)?.name} Downloader
          </h2>
          <p className="text-gray-400 mb-6 sm:mb-8 text-sm sm:text-base">Paste your link below to extract media in the highest quality.</p>

          <div className="flex flex-col sm:flex-row gap-4 relative z-10 w-full">
            <div className="relative w-full group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <LinkIcon className="h-5 w-5 text-gray-400 group-focus-within:text-white transition-colors" strokeWidth={1.5} />
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="block w-full pl-12 pr-4 py-4 sm:py-5 bg-black/40 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all outline-none text-sm sm:text-base"
                placeholder="https://..."
              />
            </div>
            
            <button
              onClick={() => {
                playPop();
                handleProcessUrl();
              }}
              disabled={isProcessing || !url}
              className="w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-3 bg-gradient-primary text-black font-bold rounded-2xl hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all duration-300 ease-apple hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 shrink-0"
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-brand-darker/30 border-t-brand-darker rounded-full animate-spin" />
              ) : (
                <>
                  <Search className="w-5 h-5" strokeWidth={1.5} />
                  <span className="text-base sm:text-lg">Analyze</span>
                </>
              )}
            </button>
          </div>
        </div>

        {videoData && (
          <div className="glass-panel p-6 sm:p-8 rounded-3xl animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
            {videoData.ffmpegAvailable === false && videoData.ffmpegRequiredForHighRes && (
              <div className="mb-6 rounded-3xl border border-yellow-400/30 bg-yellow-500/10 p-4 text-yellow-100">
                <p className="font-semibold">Install ffmpeg for 4K and high-resolution downloads.</p>
                <p className="text-sm text-yellow-200 mt-1">
                  Install ffmpeg on the server/system to enable video-only + audio merging for 1080p, 2K, and 4K downloads.
                </p>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
              <div className="rounded-2xl overflow-hidden relative border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)] bg-black/50">
                <img src={`/api/image-proxy?url=${encodeURIComponent(videoData.thumbnail)}`} alt="Video thumbnail" className="absolute inset-0 w-full h-full object-cover blur-xl opacity-40 scale-110" />
                <img src={`/api/image-proxy?url=${encodeURIComponent(videoData.thumbnail)}`} alt={videoData.title} className="relative w-full h-full object-contain" />
                <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-sm font-mono font-bold text-white shadow-lg">
                  {videoData.duration}
                </div>
              </div>

              <div className="flex flex-col gap-5">
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-white leading-tight line-clamp-2">{videoData.title}</h3>
                  <p className="text-gray-400 text-sm sm:text-base">{videoData.author}</p>
                  <p className="text-brand-cyan font-semibold">Approx. {videoData.size} MB</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Select Quality</label>
                    <select
                      id="quality-select"
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-blue outline-none appearance-none"
                      defaultValue={videoData.qualities[0]?.formatId}
                    >
                      {videoData.qualities.map((q: any) => (
                        <option key={q.formatId} value={q.formatId} className="bg-gray-900 text-white">
                          {q.quality} MP4 ({q.sizeMB} MB)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      onClick={() => {
                        playPop();
                        const select = document.getElementById('quality-select') as HTMLSelectElement;
                        const formatId = select ? select.value : videoData.qualities[0]?.formatId;
                        window.location.href = `/api/download?url=${encodeURIComponent(url)}&formatId=${encodeURIComponent(formatId)}&title=${encodeURIComponent(videoData.title)}`;
                      }}
                      className="w-full px-5 py-4 rounded-2xl bg-white text-black font-bold hover:bg-white/90 transition"
                    >
                      <Download className="w-5 h-5 inline-block mr-2" strokeWidth={1.5} />
                      Download Video
                    </button>

                    <button
                      onClick={() => {
                        playPop();
                        window.location.href = `/api/download?url=${encodeURIComponent(url)}&formatId=${encodeURIComponent('bestaudio')}&title=${encodeURIComponent(videoData.title)}`;
                      }}
                      className="w-full px-5 py-4 rounded-2xl border border-white/10 bg-black/60 text-white font-semibold hover:bg-white/10 transition"
                    >
                      <Music className="w-5 h-5 inline-block mr-2" strokeWidth={1.5} />
                      Extract Audio (MP3)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
