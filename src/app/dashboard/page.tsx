"use client";

import { useState } from "react";
import { FolderHeart, History, LayoutDashboard, Settings, Film, Music, Trash2, Play } from "lucide-react";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("history");

  const sidebarItems = [
    { id: "overview", name: "Overview", icon: LayoutDashboard },
    { id: "history", name: "Download History", icon: History },
    { id: "saved", name: "Saved Media", icon: FolderHeart },
    { id: "settings", name: "Settings", icon: Settings },
  ];

  const mockHistory = [
    { id: 1, title: "Next.js 15 Full Course 2024", type: "video", platform: "YouTube", date: "2 hours ago", size: "450 MB", img: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&q=80" },
    { id: 2, title: "Lofi Hip Hop Radio - Beats to Relax", type: "audio", platform: "YouTube", date: "5 hours ago", size: "120 MB", img: "https://images.unsplash.com/photo-1516280440502-864b9b663b65?w=400&q=80" },
    { id: 3, title: "Cinematic Reel 4K", type: "video", platform: "Instagram", date: "Yesterday", size: "45 MB", img: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&q=80" },
  ];

  return (
    <div className="flex-1 flex w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 gap-8">
      {/* Floating Sidebar */}
      <div className="w-64 shrink-0 hidden md:block">
        <div className="sticky top-28 glass-panel p-4 rounded-2xl flex flex-col gap-2">
          <div className="px-4 py-2 mb-2">
            <h2 className="font-orbitron font-bold text-xl text-white">Dashboard</h2>
            <p className="text-xs text-gray-400">InsForge Connected</p>
          </div>
          
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
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
            { label: "Total Downloads", value: "142", prefix: "", color: "text-brand-cyan" },
            { label: "Data Saved", value: "12.4", prefix: "GB", color: "text-brand-purple" },
            { label: "Active Plan", value: "Premium", prefix: "", color: "text-brand-blue" },
          ].map((stat, i) => (
            <div key={i} className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-700" />
              <p className="text-gray-400 text-sm font-medium mb-2">{stat.label}</p>
              <h3 className={`text-3xl font-orbitron font-bold ${stat.color}`}>
                {stat.value} <span className="text-lg text-gray-500">{stat.prefix}</span>
              </h3>
            </div>
          ))}
        </div>

        {/* Dynamic Content based on active tab */}
        <div className="glass-panel p-6 rounded-3xl min-h-[500px]">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-orbitron font-bold text-white capitalize">{activeTab.replace('-', ' ')}</h2>
            {activeTab === 'history' && (
              <button className="text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-1">
                <Trash2 className="w-4 h-4" /> Clear All
              </button>
            )}
          </div>

          {activeTab === 'history' ? (
            <div className="flex flex-col gap-4">
              {mockHistory.map((item) => (
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
                      <span>{item.platform}</span>
                      <span>•</span>
                      <span>{item.date}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm text-gray-300 font-medium">{item.size}</div>
                    <button className="text-brand-blue hover:text-brand-cyan text-xs mt-1 transition-colors">
                      Redownload
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <FolderHeart className="w-12 h-12 mb-4 opacity-20" />
              <p>Nothing here yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
