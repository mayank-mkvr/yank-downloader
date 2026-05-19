"use client";

import { useState, useEffect } from "react";
import { Link as LinkIcon, Music, Search, SlidersHorizontal, Download } from "lucide-react";
import { playPop, playSuccess } from "@/utils/sfx";

export default function AudioDownloader() {
  const [url, setUrl] = useState("");
  const [quality, setQuality] = useState("320");
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioData, setAudioData] = useState<any>(null);

  // Debounced auto-extractor: triggers analysis instantly when an audio URL is pasted
  useEffect(() => {
    if (!url || isProcessing || (audioData && audioData.originalUrl === url)) return;

    const lowerUrl = url.toLowerCase().trim();
    const isHttp = lowerUrl.startsWith("http://") || lowerUrl.startsWith("https://");

    if (isHttp && lowerUrl.length > 12) {
      const delayDebounceFn = setTimeout(() => {
        handleProcessUrl();
      }, 500); // 500ms debounce
      return () => clearTimeout(delayDebounceFn);
    }
  }, [url, isProcessing, audioData]);

  const handleProcessUrl = async () => {
    if (!url) return;
    setIsProcessing(true);
    setAudioData(null);
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (response.ok) {
        playSuccess();
        setAudioData({ ...data, originalUrl: url });
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
    <div className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-white/5 border border-white/10 mb-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          <Music className="w-8 h-8 text-white" strokeWidth={1.5} />
        </div>
        <h1 className="text-4xl md:text-5xl font-orbitron font-bold text-white mb-4">
          Ultimate Audio <span className="text-brand-cyan">Extractor</span>
        </h1>
        <p className="text-gray-400 text-lg">Convert any video to high-fidelity MP3 in seconds.</p>
      </div>

      <div className="w-full glass-panel-glow p-8 rounded-3xl relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-20 pointer-events-none flex items-center justify-center gap-2">
          {[...Array(20)].map((_, i) => (
            <div 
              key={i} 
              className="w-2 bg-gradient-primary rounded-full animate-pulse"
              style={{ 
                height: `${Math.random() * 100 + 20}px`,
                animationDelay: `${Math.random() * 1}s`,
                animationDuration: `${Math.random() * 1 + 0.5}s`
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col gap-6">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <LinkIcon className="h-5 w-5 text-gray-400 group-focus-within:text-white transition-colors" strokeWidth={1.5} />
            </div>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="block w-full pl-12 pr-4 py-5 bg-black/60 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-purple focus:border-transparent transition-all outline-none backdrop-blur-sm"
              placeholder="Paste video link here..."
            />
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <SlidersHorizontal className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
              <div className="flex p-1 bg-black/40 rounded-xl border border-white/5 w-full md:w-auto">
                {["128", "192", "320"].map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setQuality(q);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ease-apple active:scale-95 flex-1 md:flex-none ${
                      quality === q 
                        ? "bg-white/20 text-white shadow-[0_4px_12px_rgba(0,0,0,0.2)] border border-white/20 backdrop-blur-md" 
                        : "text-gray-400 hover:text-white hover:bg-white/10 border border-transparent"
                    }`}
                  >
                    {q} kbps
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                playPop();
                handleProcessUrl();
              }}
              disabled={isProcessing || !url}
              className="w-full md:w-auto px-8 py-3.5 bg-gradient-primary text-black font-bold rounded-xl hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all duration-300 ease-apple hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-brand-darker/30 border-t-brand-darker rounded-full animate-spin" />
              ) : (
                <>
                  <Search className="w-5 h-5" strokeWidth={1.5} />
                  <span>Extract Audio</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Result Card */}
      {audioData && (
        <div className="w-full mt-8 glass-panel p-6 rounded-3xl animate-in fade-in slide-in-from-bottom-4 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-40 shrink-0 aspect-[16/9] rounded-2xl overflow-hidden relative shadow-[0_0_15px_rgba(0,0,0,0.5)] bg-black/50 border border-white/10">
            <img src={`/api/image-proxy?url=${encodeURIComponent(audioData.thumbnail)}`} alt={audioData.title} className="w-full h-full object-contain" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
              <Music className="w-8 h-8 text-white/80 drop-shadow-md" strokeWidth={1.5} />
            </div>
          </div>
          <div className="flex-1 text-center sm:text-left min-w-0">
            <h3 className="text-xl font-bold text-white mb-1.5 line-clamp-2 leading-tight">{audioData.title}</h3>
            <p className="text-gray-400 text-sm flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="line-clamp-1">{audioData.author}</span>
              <span className="w-1 h-1 rounded-full bg-white/30 shrink-0"></span>
              <span className="shrink-0">{audioData.duration}</span>
              <span className="w-1 h-1 rounded-full bg-white/30 shrink-0"></span>
              <span className="text-brand-purple font-semibold shrink-0">~{(parseFloat(audioData.size) * 0.1).toFixed(1)} MB</span>
            </p>
          </div>
          <button 
            onClick={() => {
              playPop();
              window.location.href = `/api/download?url=${encodeURIComponent(url)}&formatId=bestaudio&title=${encodeURIComponent(audioData.title)}`;
            }}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-primary text-black font-bold hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all duration-300 ease-apple hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" strokeWidth={1.5} />
            <span>Download {quality}kbps</span>
          </button>
        </div>
      )}
    </div>
  );
}
