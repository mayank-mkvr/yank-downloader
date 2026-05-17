"use client";

import { useState, useEffect } from "react";
import { PlaySquare, Camera, Share2, Link as LinkIcon, Download, Music, ShieldCheck, Activity, Search, Video, Zap, Info } from "lucide-react";
import Image from "next/image";
import { playPop, playSuccess } from "@/utils/sfx";

export default function DownloaderApp() {
  const [activeTab, setActiveTab] = useState("youtube");
  const [url, setUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [videoData, setVideoData] = useState<any>(null);
  const [alwaysAllow, setAlwaysAllow] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("alwaysAllowSession");
    if (saved === "true") setAlwaysAllow(true);
  }, []);

  const toggleAlwaysAllow = () => {
    const newVal = !alwaysAllow;
    setAlwaysAllow(newVal);
    localStorage.setItem("alwaysAllowSession", newVal.toString());
    playPop();
  };

  const tabs = [
    { id: "youtube", name: "YouTube", color: "text-red-500", hoverBg: "hover:bg-red-500/10" },
    { id: "instagram", name: "Instagram", color: "text-pink-500", hoverBg: "hover:bg-pink-500/10" },
    { id: "facebook", name: "Facebook", color: "text-blue-500", hoverBg: "hover:bg-blue-500/10" },
    { id: "onedrive", name: "OneDrive", color: "text-blue-400", hoverBg: "hover:bg-blue-400/10" },
    { id: "telegram", name: "Telegram", color: "text-sky-400", hoverBg: "hover:bg-sky-400/10" },
  ];

  const handleProcessUrl = async () => {
    if (!url) return;

    const lowerUrl = url.toLowerCase();
    
    // Strict Platform Enforcement
    if (activeTab === 'youtube' && !lowerUrl.includes('youtube.com') && !lowerUrl.includes('youtu.be')) {
      alert("⚠️ Restricted: You are in YouTube mode. Please provide a valid YouTube link.");
      return;
    }
    if (activeTab === 'instagram' && !lowerUrl.includes('instagram.com')) {
      alert("⚠️ Restricted: You are in Instagram mode. Please provide a valid Instagram link.");
      return;
    }
    if (activeTab === 'facebook' && !lowerUrl.includes('facebook.com') && !lowerUrl.includes('fb.watch') && !lowerUrl.includes('fb.gg')) {
      alert("⚠️ Restricted: You are in Facebook mode. Please provide a valid Facebook link.");
      return;
    }
    if (activeTab === 'onedrive' && !lowerUrl.includes('onedrive.live.com') && !lowerUrl.includes('onedrive') && !lowerUrl.includes('sharepoint.com')) {
      alert("⚠️ Restricted: You are in OneDrive mode. Please provide a valid OneDrive link.");
      return;
    }
    if (activeTab === 'telegram' && !lowerUrl.includes('t.me') && !lowerUrl.includes('telegram.me')) {
      alert("⚠️ Restricted: You are in Telegram mode. Please provide a valid Telegram link.");
      return;
    }

    setIsProcessing(true);
    setVideoData(null);
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, platform: activeTab }),
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

  const handleDownload = (formatId: string, directUrl?: string) => {
    playPop();
    
    // Save to download history
    if (videoData) {
      try {
        const historyItem = {
          id: Date.now(),
          title: videoData.title,
          type: formatId === 'bestaudio' ? 'audio' : 'video',
          platform: videoData.source || activeTab,
          date: 'Just now',
          size: videoData.qualities?.find((q: any) => q.formatId === formatId)?.sizeMB 
            ? `${videoData.qualities.find((q: any) => q.formatId === formatId).sizeMB} MB` 
            : 'Pending',
          img: videoData.thumbnail || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&q=80'
        };
        const existingHistory = localStorage.getItem("savex_download_history");
        let historyArray = [];
        if (existingHistory) {
          historyArray = JSON.parse(existingHistory);
        }
        // Add new item to front of the history array
        historyArray.unshift(historyItem);
        // Limit to most recent 20 downloads
        historyArray = historyArray.slice(0, 20);
        localStorage.setItem("savex_download_history", JSON.stringify(historyArray));
      } catch (historyErr) {
        console.error("Failed to append to download history:", historyErr);
      }
    }

    if (directUrl) {
      window.open(directUrl, '_blank');
    } else {
      window.location.href = `/api/download?url=${encodeURIComponent(url)}&formatId=${encodeURIComponent(formatId)}&title=${encodeURIComponent(videoData.title)}`;
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
                  setActiveTab(tab.id);
                  setVideoData(null);
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
            <span>Ultra Weapon Active</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Activity className="w-4 h-4 text-white" strokeWidth={1.5} />
            <span>Beast Mode: ON</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-8 w-full max-w-full min-w-0">
        {/* Input Section */}
        <div className="glass-panel-glow p-6 sm:p-8 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-cyan/10 blur-[80px] rounded-full pointer-events-none" />
          
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-2xl sm:text-3xl font-orbitron font-bold text-white">
              {tabs.find(t => t.id === activeTab)?.name} <span className="text-gradient">Ultimate</span>
            </h2>
            <button 
              onClick={toggleAlwaysAllow}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-bold border transition-all ${
                alwaysAllow ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-white/5 text-gray-500 border-white/10"
              }`}
            >
              {alwaysAllow ? "Session: Always Allow" : "Allow Session"}
            </button>
          </div>
          <p className="text-gray-400 mb-6 sm:mb-8 text-sm sm:text-base">Enter a {tabs.find(t => t.id === activeTab)?.name} URL for highest quality extraction.</p>

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
                placeholder={`Paste ${tabs.find(t => t.id === activeTab)?.name} link here...`}
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
                  <Zap className="w-5 h-5" strokeWidth={1.5} />
                  <span className="text-base sm:text-lg">Ultra Extract</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-widest bg-black/20 p-2 rounded-lg inline-flex">
            <Info className="w-3 h-3" />
            <span>Tip: Always allow downloads in browser for a seamless experience.</span>
          </div>
        </div>

        {videoData && (
          <div className="glass-panel p-6 sm:p-8 rounded-3xl animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
            <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
              <div className="rounded-2xl overflow-hidden relative border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)] bg-black/50 aspect-video">
                {videoData.thumbnail ? (
                  <>
                    <img src={`/api/image-proxy?url=${encodeURIComponent(videoData.thumbnail)}`} alt="Video thumbnail" className="absolute inset-0 w-full h-full object-cover blur-xl opacity-40 scale-110" />
                    <img src={`/api/image-proxy?url=${encodeURIComponent(videoData.thumbnail)}`} alt={videoData.title} className="relative w-full h-full object-contain" />
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white/5">
                    <Video className="w-12 h-12 text-gray-600" />
                  </div>
                )}
                <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-sm font-mono font-bold text-white shadow-lg border border-white/10">
                  {videoData.duration}
                </div>
              </div>

              <div className="flex flex-col gap-5">
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-white leading-tight line-clamp-2">{videoData.title}</h3>
                  <p className="text-gray-400 text-sm sm:text-base">{videoData.author}</p>
                  <p className="text-brand-cyan font-semibold px-3 py-1 bg-brand-cyan/10 rounded-full inline-block text-xs border border-brand-cyan/20 uppercase tracking-widest">Source: {videoData.source}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Select Quality</label>
                    <select
                      id="quality-select"
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-blue outline-none appearance-none"
                    >
                      {videoData.qualities.map((q: any, index: number) => (
                        <option key={`${q.formatId}-${q.ext}-${index}`} value={q.formatId} className="bg-gray-900 text-white">
                          {q.quality} {q.ext ? `(${q.ext})` : ''} {q.sizeMB && q.sizeMB !== '??' ? `- ${q.sizeMB} MB` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      onClick={() => {
                        const select = document.getElementById('quality-select') as HTMLSelectElement;
                        const formatId = select ? select.value : videoData.qualities[0]?.formatId;
                        const qualityObj = videoData.qualities.find((q: any) => q.formatId === formatId);
                        handleDownload(formatId, qualityObj?.directUrl);
                      }}
                      className="w-full px-5 py-4 rounded-2xl bg-gradient-primary text-black font-bold hover:shadow-[0_10px_25px_rgba(255,255,255,0.2)] transition-all duration-300"
                    >
                      <Download className="w-5 h-5 inline-block mr-2" strokeWidth={1.5} />
                      Download Video
                    </button>

                    <button
                      onClick={() => handleDownload('bestaudio')}
                      className="w-full px-5 py-4 rounded-2xl border border-white/10 bg-black/60 text-white font-semibold hover:bg-white/10 transition-all duration-300"
                    >
                      <Music className="w-5 h-5 inline-block mr-2" strokeWidth={1.5} />
                      Extract MP3
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
