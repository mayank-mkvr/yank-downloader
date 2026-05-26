import { NextRequest, NextResponse } from 'next/server';
import ytdl from '@/lib/ytdlp';
import path from 'path';
import fs from 'fs';
import { getRandomProxy } from '@/lib/proxy';
import { ensurePythonEngineRunning } from '@/lib/pythonEngine';
import { generateNetscapeCookieFile, getCookiesForPlatform } from '@/lib/cookieManager';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';

interface CacheEntry {
  timestamp: number;
  data: any;
}

const nodeAnalyzeCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 600 * 1000; // 10 minutes cache TTL

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    const proxy = getRandomProxy();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing URL' }, { status: 400 });
    }

    const trimmedUrl = url.trim();

    // Check memory cache first
    const now = Date.now();
    if (nodeAnalyzeCache.has(trimmedUrl)) {
      const entry = nodeAnalyzeCache.get(trimmedUrl)!;
      if (now - entry.timestamp < CACHE_TTL_MS) {
        console.log(`[Node Cache] Instant hit for: ${trimmedUrl}`);
        return NextResponse.json(entry.data);
      }
    }

    // 1. Try to delegate to Python Secure Session Engine first
    try {
      await ensurePythonEngineRunning();
      console.log(`Routing analysis for ${url} to Python Secure Session Engine...`);
      const pyResponse = await fetch(`${PYTHON_API_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (pyResponse.ok) {
        const pyData = await pyResponse.json();
        console.log(`Python Session Engine successfully analyzed: ${pyData.title}`);
        const result = {
          id: pyData.id,
          title: pyData.title,
          author: pyData.author,
          thumbnail: pyData.thumbnail,
          duration: `${Math.floor(pyData.duration / 60)}:${(pyData.duration % 60).toString().padStart(2, '0')}`,
          qualities: pyData.formats.map((f: any) => ({
            formatId: f.formatId,
            quality: f.quality,
            ext: f.ext,
            sizeMB: f.filesize ? (f.filesize / (1024 * 1024)).toFixed(1) : '??'
          })),
          size: 'Varies',
          source: pyData.source
        };
        
        // Cache result
        nodeAnalyzeCache.set(trimmedUrl, { timestamp: now, data: result });
        return NextResponse.json(result);
      } else {
        const errDetail = await pyResponse.json();
        console.warn('Python Session Engine returned error, falling back to standard extraction:', errDetail.detail);
      }
    } catch (e: any) {
      console.warn('Python Session Engine is offline or failed. Falling back to local node extraction...', e.message);
    }

    // 2. Standard Fallback local extraction
    let cookiePath = path.resolve(process.cwd(), 'cookies.txt');
    let generatedCookieFile: string | null = null;
    let responseData: any = null;

    // Direct high-speed Cobalt API scraper helper for serverless environment
    const analyzeWithCobalt = async (videoUrl: string): Promise<any> => {
      const cobaltInstances = [
        'https://api.cobalt.tools/',
        'https://cobalt.api.ryzetech.live/',
        'https://co.wuk.sh/',
        'https://cobalt.instavids.workers.dev/'
      ];

      for (const instance of cobaltInstances) {
        try {
          console.log(`[Cobalt] Attempting extraction with: ${instance}`);
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), 6000); // 6s timeout per instance

          const res = await fetch(instance, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            body: JSON.stringify({
              url: videoUrl,
              videoQuality: '720',
              downloadMode: 'auto',
              filenameStyle: 'basic'
            }),
            signal: controller.signal
          });
          clearTimeout(id);

          if (!res.ok) continue;

          const data = await res.json();
          if (data.status === 'error') continue;

          if (data.status === 'stream' || data.status === 'redirect') {
            console.log(`[Cobalt] Extraction SUCCESS using: ${instance}`);
            return {
              id: Buffer.from(videoUrl).toString('base64').substring(0, 10),
              title: 'Extracted Media File',
              author: 'Social Platform',
              thumbnail: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=320&auto=format&fit=crop&q=60',
              duration: '00:00',
              qualities: [
                {
                  formatId: 'cobalt',
                  quality: 'Direct High-Speed Download',
                  ext: 'mp4',
                  sizeMB: 'Varies',
                  height: 1080
                }
              ],
              size: 'Varies',
              source: 'cobalt'
            };
          }
        } catch (err: any) {
          console.warn(`[Cobalt] Instance ${instance} failed:`, err.message);
        }
      }
      return null;
    };

    try {
      const plat = url.includes('youtube.com') || url.includes('youtu.be') ? 'youtube' :
                   url.includes('instagram.com') ? 'instagram' :
                   url.includes('facebook.com') || url.includes('fb.watch') ? 'facebook' : null;

      if (plat) {
        generatedCookieFile = generateNetscapeCookieFile(plat);
        if (generatedCookieFile) {
          cookiePath = generatedCookieFile;
          console.log(`Generated native Netscape cookie file for fallback extraction: ${cookiePath}`);
        }
      }

      // Try youtubei.js first for YouTube
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        try {
          console.log(`[Analyze Route] Using Innertube (youtubei.js) to extract info...`);
          const { Innertube, Platform } = require('youtubei.js');
          
          Platform.shim.eval = (code: any) => {
            const codeStr = typeof code === 'string' ? code : (code.code || code.output || code.toString());
            return new Function(codeStr)();
          };

          const cookies = getCookiesForPlatform('youtube');
          let cookieString = '';
          if (cookies && cookies.length > 0) {
            cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
            console.log(`[Innertube] Loaded ${cookies.length} YouTube cookies from secure storage`);
          }

          const yt = await Innertube.create({
            cookie: cookieString || undefined,
            client_type: 'ANDROID_VR'
          });

          // Resolve YouTube video ID
          const getYouTubeId = (urlStr: string) => {
            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
            const match = urlStr.match(regExp);
            return (match && match[2].length === 11) ? match[2] : null;
          };
          
          const videoId = getYouTubeId(url);
          if (!videoId) {
            throw new Error('Could not parse YouTube video ID');
          }

          const info = await yt.getBasicInfo(videoId);
          
          if (info.playability_status && info.playability_status.status !== 'OK') {
            throw new Error(`YouTube playability status is not OK: ${info.playability_status.reason || info.playability_status.status}`);
          }

          const rawFormats = [
            ...(info.streaming_data?.formats || []),
            ...(info.streaming_data?.adaptive_formats || [])
          ];

          const qualitiesList = rawFormats
            .filter((f: any) => f.mime_type?.startsWith('video/') || f.height > 0)
            .map((f: any) => {
              const height = f.height || (f.quality_label ? parseInt(f.quality_label) : 0);
              const container = f.mime_type?.split(';')[0]?.split('/')[1] || 'mp4';
              const rawSize = f.content_length || f.filesize;
              return {
                formatId: f.itag?.toString() || f.format_id,
                quality: f.quality_label || (height ? `${height}p` : '720p'),
                ext: container,
                sizeMB: rawSize ? (parseInt(rawSize) / (1024 * 1024)).toFixed(1) : '??',
                height: height
              };
            })
            .sort((a: any, b: any) => b.height - a.height);

          // Remove duplicates
          const seen = new Set<string>();
          const uniqueQualities = qualitiesList.filter((q: any) => {
            const key = `${q.quality}-${q.ext}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          if (uniqueQualities.length === 0) {
            throw new Error('No downloadable formats extracted via youtubei.js (possibly restricted on this IP)');
          }

          const dur = info.basic_info.duration || 0;
          responseData = {
            id: info.basic_info.id,
            title: info.basic_info.title,
            author: info.basic_info.author || 'Unknown',
            thumbnail: info.basic_info.thumbnail?.[0]?.url || '',
            duration: `${Math.floor(dur / 60)}:${(dur % 60).toString().padStart(2, '0')}`,
            qualities: uniqueQualities,
            size: 'Varies',
            source: 'youtube'
          };
        } catch (e: any) {
          console.warn('youtubei.js extraction failed, falling back:', e.message);
        }
      }

      // Try play-dl as the secondary fallback for YouTube
      if (!responseData && (url.includes('youtube.com') || url.includes('youtu.be'))) {
        try {
          console.log(`[Analyze Route] Using play-dl to extract YouTube info...`);
          const play = require('play-dl');
          const cookies = getCookiesForPlatform('youtube');
          if (cookies && cookies.length > 0) {
            const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
            await play.setToken({ youtube: { cookie: cookieString } });
          }

          const info = await play.video_info(url);
          const rawFormats = info.format || [];
          
          const qualitiesList = rawFormats
            .filter((f: any) => f.mimeType?.startsWith('video/') || f.height > 0)
            .map((f: any) => {
              const height = f.height || 0;
              const container = f.container || f.mimeType?.split(';')[0]?.split('/')[1] || 'mp4';
              const rawSize = f.contentLength;
              return {
                formatId: f.itag?.toString() || f.format_id?.toString() || '',
                quality: f.qualityLabel || (height ? `${height}p` : '720p'),
                ext: container,
                sizeMB: rawSize ? (parseInt(rawSize) / (1024 * 1024)).toFixed(1) : '??',
                height: height
              };
            })
            .sort((a: any, b: any) => b.height - a.height);

          // Remove duplicates
          const seen = new Set<string>();
          const uniqueQualities = qualitiesList.filter((q: any) => {
            const key = `${q.quality}-${q.ext}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          if (uniqueQualities.length === 0) {
            throw new Error('No downloadable formats extracted via play-dl');
          }

          const dur = info.video_details.durationInSec || 0;
          responseData = {
            id: info.video_details.id,
            title: info.video_details.title,
            author: info.video_details.channel?.name || 'Unknown',
            thumbnail: info.video_details.thumbnails?.[0]?.url || '',
            duration: `${Math.floor(dur / 60)}:${(dur % 60).toString().padStart(2, '0')}`,
            qualities: uniqueQualities,
            size: 'Varies',
            source: 'youtube'
          };
          console.log(`[Analyze Route] play-dl extraction SUCCESS for: ${info.video_details.title}`);
        } catch (e: any) {
          console.warn('play-dl extraction failed, falling back:', e.message);
        }
      }

      // Try Cobalt API next for all platforms (YouTube fallback + social media direct download)
      if (!responseData) {
        try {
          responseData = await analyzeWithCobalt(trimmedUrl);
        } catch (e: any) {
          console.warn('Cobalt extraction failed:', e.message);
        }
      }

      if (!responseData) {
        // Generic local yt-dlp fallback (only runs if server supports subprocess execution)
        const metadata = (await ytdl()(url, {
          dumpJson: true,
          noWarnings: true,
          noPlaylist: true,
          noCheckCertificates: true,
          cookies: cookiePath,
          proxy: proxy || undefined
        }, {
          windowsHide: true
        })) as any;

        responseData = {
          id: metadata.id,
          title: metadata.title,
          author: metadata.uploader || 'Unknown',
          thumbnail: metadata.thumbnail,
          duration: metadata.duration_string || `${Math.floor(metadata.duration / 60)}:${(metadata.duration % 60).toString().padStart(2, '0')}`,
          qualities: metadata.formats
            ?.filter((f: any) => f.vcodec && f.vcodec !== 'none')
            .map((f: any) => {
              const height = f.height || 0;
              return {
                formatId: f.format_id,
                quality: f.format_note || f.resolution || (height ? `${height}p` : 'unknown'),
                ext: f.ext || 'mp4',
                sizeMB: f.filesize ? (f.filesize / (1024 * 1024)).toFixed(1) : (f.filesize_approx ? (f.filesize_approx / (1024 * 1024)).toFixed(1) : '??'),
                height: height
              };
            })
            .sort((a: any, b: any) => b.height - a.height) || [],
          size: metadata.filesize ? (metadata.filesize / (1024 * 1024)).toFixed(1) : '??',
          source: metadata.extractor
        };
      }
    } finally {
      // Safely delete the temporary cookie file after use to prevent leaks
      if (generatedCookieFile && fs.existsSync(generatedCookieFile)) {
        try {
          fs.unlinkSync(generatedCookieFile);
          console.log(`Cleaned up temporary cookie file: ${generatedCookieFile}`);
        } catch (err) {
          console.error(`Failed to delete temporary cookie file: ${generatedCookieFile}`, err);
        }
      }
    }

    if (responseData) {
      nodeAnalyzeCache.set(trimmedUrl, { timestamp: now, data: responseData });
    }

    return NextResponse.json(responseData);

  } catch (err: any) {
    console.error('Analyze error:', err);
    return NextResponse.json({ error: 'Failed to analyze video. YouTube/Insta might be blocking us. Try again later.' }, { status: 500 });
  }
}
