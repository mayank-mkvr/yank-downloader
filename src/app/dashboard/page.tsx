"use client";

import { useState, useEffect, useRef } from "react";
import { 
  FolderHeart, History, LayoutDashboard, Settings, Film, Music, 
  Trash2, Play, KeyRound, CheckCircle2, AlertTriangle, Upload, 
  FileText, Trash, RefreshCw, Info, HelpCircle, Monitor, Smartphone
} from "lucide-react";
import { playPop, playSuccess } from "@/utils/sfx";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [overviewMode, setOverviewMode] = useState<"laptop" | "mobile">("laptop");
  const [cookieStatus, setCookieStatus] = useState<any>({
    youtube: { configured: false, count: 0, valid: false },
    instagram: { configured: false, count: 0, valid: false },
    facebook: { configured: false, count: 0, valid: false },
    onedrive: { configured: false, count: 0, valid: false },
    telegram: { configured: false, count: 0, valid: false }
  });
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  
  // Cookie Upload States
  const [selectedPlatform, setSelectedPlatform] = useState<string>("youtube");
  const [pasteData, setPasteData] = useState<string>("");
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | '', message: string }>({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sidebarItems = [
    { id: "overview", name: "Overview", icon: LayoutDashboard },
    { id: "cookies", name: "Session Cookies", icon: KeyRound },
    { id: "history", name: "Download History", icon: History },
  ];

  const mockHistory = [
    { id: 1, title: "Next.js 15 Full Course 2024", type: "video", platform: "YouTube", date: "2 hours ago", size: "450 MB", img: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&q=80" },
    { id: 2, title: "Lofi Hip Hop Radio - Beats to Relax", type: "audio", platform: "YouTube", date: "5 hours ago", size: "120 MB", img: "https://images.unsplash.com/photo-1516280440502-864b9b663b65?w=400&q=80" },
    { id: 3, title: "Cinematic Reel 4K", type: "video", platform: "Instagram", date: "Yesterday", size: "45 MB", img: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&q=80" },
  ];

  // Fetch cookie status from Python backend (via Next.js route proxy)
  const fetchCookieStatus = async () => {
    setLoadingStatus(true);
    try {
      const response = await fetch('/api/cookies');
      if (response.ok) {
        const data = await response.json();
        setCookieStatus(data);
      }
    } catch (error) {
      console.error("Failed to fetch cookie status:", error);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchCookieStatus();
    
    // Auto-detect screen width to set correct initial guide mode
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 768) {
        setOverviewMode('mobile');
      }
    }
    
    // Load download history dynamically
    const localHist = localStorage.getItem("savex_download_history");
    if (localHist) {
      try {
        setHistory(JSON.parse(localHist));
      } catch (e) {
        setHistory([]);
      }
    } else {
      setHistory(mockHistory);
    }
  }, []);

  const handleUploadCookies = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteData.trim()) return;

    setIsSubmitting(true);
    setUploadStatus({ type: '', message: '' });
    playPop();

    try {
      const response = await fetch('/api/cookies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload',
          platform: selectedPlatform,
          cookieData: pasteData
        })
      });

      const data = await response.json();

      if (response.ok) {
        playSuccess();
        setUploadStatus({
          type: 'success',
          message: data.message || `Successfully imported cookies for ${selectedPlatform.toUpperCase()}`
        });
        setPasteData("");
        fetchCookieStatus();
      } else {
        setUploadStatus({
          type: 'error',
          message: data.error || "Failed to upload cookies. Check the format and try again."
        });
      }
    } catch (error: any) {
      setUploadStatus({
        type: 'error',
        message: "Failed to connect to the session engine. Make sure python/app.py is running."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSubmitting(true);
    setUploadStatus({ type: '', message: '' });
    playPop();

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      try {
        const response = await fetch('/api/cookies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'upload',
            platform: selectedPlatform,
            cookieData: content
          })
        });

        const data = await response.json();

        if (response.ok) {
          playSuccess();
          setUploadStatus({
            type: 'success',
            message: `Successfully imported cookies from file for ${selectedPlatform.toUpperCase()}`
          });
          fetchCookieStatus();
        } else {
          setUploadStatus({
            type: 'error',
            message: data.error || "Malformed cookies file format."
          });
        }
      } catch (error) {
        setUploadStatus({
          type: 'error',
          message: "Failed to upload. Check backend status."
        });
      } finally {
        setIsSubmitting(false);
      }
    };
    reader.readAsText(file);
  };

  const handleClearCookies = async (platform: string) => {
    if (!confirm(`Are you sure you want to clear stored cookies for ${platform.toUpperCase()}?`)) return;

    playPop();
    try {
      const response = await fetch('/api/cookies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clear',
          platform
        })
      });

      if (response.ok) {
        playSuccess();
        fetchCookieStatus();
        setUploadStatus({ type: 'success', message: `Cleared cookies for ${platform.toUpperCase()}` });
      }
    } catch (error) {
      console.error("Failed to clear cookies:", error);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 gap-6 md:gap-8">
      {/* Mobile Inline Navigation Tabs */}
      <div className="md:hidden flex bg-white/5 border border-white/10 rounded-2xl p-1.5 gap-1.5 w-full">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
            }}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 px-2 rounded-xl transition-all border ${
              activeTab === item.id 
                ? "bg-brand-blue/15 text-brand-blue border-brand-blue/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]" 
                : "text-gray-400 hover:text-white border-transparent hover:bg-white/5"
            }`}
          >
            <item.icon className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-orbitron font-bold tracking-wide uppercase">{item.name}</span>
          </button>
        ))}
      </div>

      {/* Floating Sidebar */}
      <div className="w-64 shrink-0 hidden md:block">
        <div className="sticky top-28 glass-panel p-4 rounded-2xl flex flex-col gap-2">
          <div className="px-4 py-2 mb-2">
            <h2 className="font-orbitron font-bold text-xl text-white">Dashboard</h2>
            <p className="text-xs text-gray-400">SaveX Premium Panel</p>
          </div>
          
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-left ${
                activeTab === item.id 
                  ? "bg-brand-blue/10 text-brand-blue shadow-[0_0_15px_rgba(158,186,255,0.1)] border border-brand-blue/20" 
                  : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? "text-brand-blue" : "text-gray-400"}`} />
              <span className="font-medium">{item.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Analytics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { 
              label: "Total Downloads", 
              value: history.length.toString(), 
              prefix: "", 
              color: "text-brand-cyan" 
            },
            { 
              label: "Data Saved", 
              value: (() => {
                const totalMB = (history || []).reduce((sum, item) => {
                  if (!item || typeof item !== 'object') return sum;
                  const match = item.size?.match(/(\d+(\.\d+)?)\s*MB/);
                  return sum + (match ? parseFloat(match[1]) : 0);
                }, 0);
                return totalMB > 1024 ? (totalMB / 1024).toFixed(1) : totalMB.toFixed(0);
              })(), 
              prefix: (history || []).reduce((sum, item) => {
                if (!item || typeof item !== 'object') return sum;
                const match = item.size?.match(/(\d+(\.\d+)?)\s*MB/);
                return sum + (match ? parseFloat(match[1]) : 0);
              }, 0) > 1024 ? "GB" : "MB", 
              color: "text-emerald-400" 
            },
            { 
              label: "Secure Sessions", 
              value: Object.values(cookieStatus || {}).filter((p: any) => p && typeof p === 'object' && p.configured && p.valid).length.toString(), 
              prefix: "/ 5 active", 
              color: "text-brand-blue" 
            },
          ].map((stat, i) => (
            <div key={i} className="glass-panel p-6 rounded-2xl relative overflow-hidden group border border-white/5 hover:border-white/10 transition-all duration-300">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
              <p className="text-gray-400 text-sm font-medium mb-2">{stat.label}</p>
              <h3 className={`text-3xl font-orbitron font-bold ${stat.color}`}>
                {stat.value} <span className="text-lg text-gray-500">{stat.prefix}</span>
              </h3>
            </div>
          ))}
        </div>

        {/* Dynamic Content based on active tab */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl min-h-[500px] border border-white/5">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-orbitron font-bold text-white capitalize">{activeTab.replace('-', ' ')}</h2>
            {activeTab === 'history' && (
              <button 
                onClick={() => {
                  if (confirm("Are you sure you want to clear your download history?")) {
                    localStorage.removeItem("savex_download_history");
                    setHistory([]);
                    playPop();
                  }
                }}
                className="text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg"
              >
                <Trash2 className="w-4 h-4" /> Clear All
              </button>
            )}
            {activeTab === 'cookies' && (
              <button 
                onClick={fetchCookieStatus}
                disabled={loadingStatus}
                className="text-sm text-brand-cyan hover:text-brand-cyan/80 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10"
              >
                <RefreshCw className={`w-4 h-4 ${loadingStatus ? 'animate-spin' : ''}`} />
                {loadingStatus ? 'Checking...' : 'Refresh Status'}
              </button>
            )}
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Premium Welcome Box */}
              <div className="relative p-6 sm:p-8 rounded-3xl overflow-hidden bg-gradient-to-r from-brand-blue/20 to-brand-cyan/10 border border-brand-blue/30">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-cyan/10 blur-[80px] rounded-full pointer-events-none" />
                <h3 className="text-xl sm:text-2xl font-orbitron font-bold text-white mb-2">Welcome to SaveX Ultimate Panel</h3>
                <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
                  Follow our clean step-by-step guides to extract high-fidelity 4K media and unlock unrestricted download bandwidth.
                </p>
              </div>

              {/* CRITICAL COOKIES NOTICE BOX - NO EMOJIS, HIGHLY STYLED */}
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.05)] relative overflow-hidden group">
                <div className="absolute -right-12 -top-12 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h5 className="font-orbitron font-bold text-amber-400 uppercase tracking-wider text-xs sm:text-sm mb-1">
                      Critical Requirement: Session Cookies (Cookies Highly Important)
                    </h5>
                    <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
                      To download Private Reels, Member-Only Videos, or Age-Restricted Content from YouTube, Instagram, and Facebook, you must import active session cookies in the Session Cookies tab. Without cookies, network firewalls will block requests. Stored cookies are fully encrypted locally.
                    </p>
                  </div>
                </div>
              </div>

              {/* Responsive Instructions Grid */}
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-4">
                  <h4 className="text-base sm:text-lg font-orbitron font-bold text-white uppercase tracking-wider">
                    How to Use SaveX
                  </h4>
                  
                  {/* Premium Slider Switcher - No Emojis */}
                  <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 gap-1 self-start sm:self-auto">
                    <button
                      onClick={() => {
                        playPop();
                        setOverviewMode('laptop');
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all duration-300 ${
                        overviewMode === 'laptop'
                          ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.15)] scale-105'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      Laptop Guide
                    </button>
                    <button
                      onClick={() => {
                        playPop();
                        setOverviewMode('mobile');
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all duration-300 ${
                        overviewMode === 'mobile'
                          ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.15)] scale-105'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      Mobile Guide
                    </button>
                  </div>
                </div>

                {/* Extremely Clean, Actionable, Short steps */}
                <div className="grid gap-4">
                  {overviewMode === 'laptop' ? (
                    [
                      { step: "1", title: "Copy Desktop Video Link", desc: "Browse YouTube, Facebook, Instagram, OneDrive, or Telegram on your computer and copy the video URL from the browser's address bar." },
                      { step: "2", title: "Export Netscape Cookies (Important)", desc: "Use a secure browser extension (like 'Get cookies.txt LOCALLY') to export cookies for the active platform." },
                      { step: "3", title: "Authenticate Stored Session", desc: "Go to the 'Session Cookies' tab, paste the cookie text or upload the file, and confirm the status displays as active." },
                      { step: "4", title: "Extract & Download with Audio", desc: "Paste the URL on the Downloader, click extract, select your quality resolution (up to 4K), and save the file with perfect sound." }
                    ].map((item) => (
                      <div key={item.step} className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-brand-blue/20 hover:bg-brand-blue/[0.02] transition-all duration-300">
                        <div className="w-9 h-9 rounded-xl bg-brand-blue/10 border border-brand-blue/30 text-brand-blue flex items-center justify-center font-bold font-orbitron text-sm shrink-0">
                          {item.step}
                        </div>
                        <div>
                          <h5 className="font-bold text-white text-sm mb-1">{item.title}</h5>
                          <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    [
                      { step: "1", title: "Copy Sharing Link", desc: "Open the YouTube, Instagram, or Facebook app on your phone, tap Share, and select 'Copy Link'." },
                      { step: "2", title: "Sync Cookies (Important)", desc: "Export cookies on your computer once and sync them to bypass firewalls and download restricted content on your mobile phone." },
                      { step: "3", title: "Confirm Secure Session", desc: "Head to the 'Session Cookies' tab on your mobile browser to verify the connection status shows as authenticated." },
                      { step: "4", title: "Save Video to Storage", desc: "Paste your link in the SaveX Downloader, click extract, select format, and download the media directly to your device storage." }
                    ].map((item) => (
                      <div key={item.step} className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-brand-purple/20 hover:bg-brand-purple/[0.02] transition-all duration-300">
                        <div className="w-9 h-9 rounded-xl bg-brand-purple/10 border border-brand-purple/30 text-brand-purple flex items-center justify-center font-bold font-orbitron text-sm shrink-0">
                          {item.step}
                        </div>
                        <div>
                          <h5 className="font-bold text-white text-sm mb-1">{item.title}</h5>
                          <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Support Section */}
              <div className="p-6 rounded-2xl bg-brand-purple/15 border border-brand-purple/30 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="space-y-1 text-center sm:text-left">
                  <h4 className="font-bold text-white flex items-center gap-2 justify-center sm:justify-start">
                    <HelpCircle className="w-5 h-5 text-brand-purple" />
                    Need Technical Assistance?
                  </h4>
                  <p className="text-xs text-gray-400">Our dedicated support channel is available 24/7 to resolve extraction and cookie configuration queries.</p>
                </div>
                <a 
                  href="mailto:mayankmkvr.01@gmail.com"
                  className="px-6 py-2.5 rounded-xl bg-brand-purple text-white font-bold hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-wider"
                >
                  Email Support
                </a>
              </div>
            </div>
          )}

          {activeTab === 'cookies' && (
            <div className="flex flex-col gap-8">
              {/* Info alert */}
              <div className="flex gap-3 bg-white/5 border border-white/10 rounded-2xl p-4 text-gray-300 text-sm leading-relaxed">
                <Info className="w-5 h-5 text-brand-cyan shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-white">Why authenticate cookies?</p>
                  <p>Many media networks block public anonymous requests (like age-restricted videos, private reels, or member-only feeds). By securely storing your session cookies, downloads are routed using your login state. Stored cookies are fully encrypted and never print in system logs.</p>
                </div>
              </div>

              {/* Platform overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { id: "youtube", name: "YouTube", domain: ".youtube.com" },
                  { id: "instagram", name: "Instagram", domain: ".instagram.com" },
                  { id: "facebook", name: "Facebook", domain: ".facebook.com" },
                  { id: "onedrive", name: "OneDrive", domain: "onedrive.live.com" },
                  { id: "telegram", name: "Telegram", domain: "t.me" }
                ].map((platform) => {
                  const status = (cookieStatus && typeof cookieStatus === 'object' && platform.id in cookieStatus) 
                    ? cookieStatus[platform.id] 
                    : { configured: false, count: 0, valid: false };
                  return (
                    <div 
                      key={platform.id} 
                      onClick={() => {
                        playPop();
                        setSelectedPlatform(platform.id);
                      }}
                      className={`relative flex flex-col p-6 rounded-2xl border transition-all cursor-pointer ${
                        selectedPlatform === platform.id 
                          ? 'bg-white/10 border-brand-cyan shadow-[0_0_20px_rgba(34,211,238,0.15)] scale-[1.02]' 
                          : 'bg-white/5 border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-bold text-lg text-white">{platform.name}</span>
                        {status.configured ? (
                          status.valid ? (
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-yellow-500" />
                          )
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-white/10" />
                        )}
                      </div>

                      <div className="text-sm space-y-2 mt-auto">
                        <div className="flex justify-between text-gray-400">
                          <span>Status:</span>
                          <span className={status.configured ? (status.valid ? 'text-green-400 font-medium' : 'text-yellow-500 font-medium') : 'text-gray-500'}>
                            {status.configured ? (status.valid ? 'Authenticated' : 'Expired/Invalid') : 'Not Configured'}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-400">
                          <span>Stored Cookies:</span>
                          <span className="text-white font-mono">{status.count}</span>
                        </div>
                      </div>

                      {status.configured && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClearCookies(platform.id);
                          }}
                          className="mt-4 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 text-xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Trash className="w-3.5 h-3.5" /> Clear Cookies
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Upload Panel */}
              <div className="bg-white/5 border border-white/5 p-6 sm:p-8 rounded-2xl space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Import Session for {selectedPlatform.toUpperCase()}</h3>
                  <p className="text-gray-400 text-sm">Upload a Netscape format <code className="text-brand-cyan">cookies.txt</code> file exported from extensions like "Get Cookies.txt" or paste a raw Cookie string from your browser console.</p>
                </div>

                {uploadStatus.message && (
                  <div className={`p-4 rounded-xl border flex gap-3 text-sm items-start ${
                    uploadStatus.type === 'success' 
                      ? 'bg-green-500/10 border-green-500/30 text-green-300' 
                      : 'bg-red-500/10 border-red-500/30 text-red-300'
                  }`}>
                    {uploadStatus.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />}
                    <span>{uploadStatus.message}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                  {/* File Upload Box */}
                  <div className="border-2 border-dashed border-white/10 hover:border-brand-cyan/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group relative"
                       onClick={() => fileInputRef.current?.click()}>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept=".txt,.json"
                      onChange={handleFileUpload}
                      disabled={isSubmitting}
                    />
                    <Upload className="w-10 h-10 text-gray-500 group-hover:text-brand-cyan mb-4 transition-colors" />
                    <span className="font-bold text-white text-sm mb-1">Click to Upload File</span>
                    <span className="text-xs text-gray-400">Supports .txt (Netscape) and .json formats</span>
                  </div>

                  {/* Textarea Paste */}
                  <form onSubmit={handleUploadCookies} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Paste Cookie Data</label>
                      <textarea
                        value={pasteData}
                        onChange={(e) => setPasteData(e.target.value)}
                        placeholder={`Paste 'Cookie' request header values or full EditThisCookie JSON content here...`}
                        className="w-full h-32 bg-black/50 border border-white/10 rounded-xl p-4 text-white focus:ring-2 focus:ring-brand-blue outline-none text-sm font-mono"
                        disabled={isSubmitting}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || !pasteData.trim()}
                      className="w-full py-3.5 bg-gradient-primary text-black font-bold rounded-xl hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-brand-darker/30 border-t-brand-darker rounded-full animate-spin" />
                      ) : (
                        <>
                          <FileText className="w-4 h-4" />
                          <span>Import Cookie Session</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="flex flex-col gap-4">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <History className="w-12 h-12 mb-4 opacity-20" />
                  <p>No downloads recorded yet.</p>
                </div>
              ) : (
                history.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group">
                    <div className="w-24 h-16 rounded-xl overflow-hidden relative shrink-0">
                      <img src={item.img} alt={item.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium truncate mb-1">{item.title}</h4>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          {item.type === 'video' ? <Film className="w-3 h-3" /> : <Music className="w-3 h-3" />}
                          {item.type}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{item.platform}</span>
                        <span>•</span>
                        <span>{item.date}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm text-gray-300 font-medium">{item.size}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
