import { NextRequest, NextResponse } from 'next/server';
import ytdl from '@/lib/ytdlp';
import path from 'path';
import fs from 'fs';
import { getRandomProxy } from '@/lib/proxy';
import { ensurePythonEngineRunning } from '@/lib/pythonEngine';
import { generateNetscapeCookieFile, getCookiesForPlatform } from '@/lib/cookieManager';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  const itag = req.nextUrl.searchParams.get('formatId') || 'best';
  const title = req.nextUrl.searchParams.get('title') || 'video';
  const proxy = getRandomProxy();

  if (!url) {
    return NextResponse.json({ error: 'Missing URL' }, { status: 400 });
  }

  // 1. Try to delegate stream to Python Secure Session Engine first
  try {
    await ensurePythonEngineRunning();
    console.log(`Routing stream download for ${url} to Python Secure Session Engine...`);
    const pyStreamUrl = `${PYTHON_API_URL}/api/download?url=${encodeURIComponent(url)}&formatId=${encodeURIComponent(itag)}&title=${encodeURIComponent(title)}`;
    const pyResponse = await fetch(pyStreamUrl);

    if (pyResponse.ok && pyResponse.body) {
      console.log(`Python Session Engine successfully streaming video: ${title}`);
      
      const headers = new Headers();
      
      // Forward standard HTTP headers exactly as returned from Python backend
      const contentDisposition = pyResponse.headers.get('Content-Disposition');
      const contentType = pyResponse.headers.get('Content-Type');
      const contentLength = pyResponse.headers.get('Content-Length');

      if (contentDisposition) {
        headers.set('Content-Disposition', contentDisposition);
      } else {
        headers.set('Content-Disposition', `attachment; filename="${title}.mp4"`);
      }
      
      if (contentType) {
        headers.set('Content-Type', contentType);
      } else {
        headers.set('Content-Type', 'video/mp4');
      }
      
      if (contentLength) {
        headers.set('Content-Length', contentLength);
      } else {
        headers.set('Transfer-Encoding', 'chunked');
      }
      
      headers.set('Cache-Control', 'no-store');

      return new NextResponse(pyResponse.body as any, {
        status: 200,
        headers
      });
    } else {
      console.warn('Python Session Engine returned error stream, falling back to standard streaming...');
    }
  } catch (e: any) {
    console.warn('Python Session Engine is offline or streaming failed. Falling back to local node streaming...', e.message);
  }

  // 2. Standard Fallback local streaming
  // Try Cobalt redirect first for serverless / non-YouTube downloads (high speed, zero memory cost)
  const isServerless = !!(process.env.K_SERVICE || process.env.FUNCTION_NAME || process.env.FIREBASE_CONFIG || process.env.FUNCTIONS_EMULATOR);
  const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');

  if (isServerless || !isYoutube) {
    try {
      console.log(`[Download Route] Serverless/non-YT detected. Fetching high-speed streaming link from Cobalt for: ${url}`);
      const cobaltInstances = [
        'https://api.cobalt.tools/',
        'https://cobalt.api.ryzetech.live/',
        'https://co.wuk.sh/',
        'https://cobalt.instavids.workers.dev/'
      ];

      let cobaltStreamUrl = '';
      for (const instance of cobaltInstances) {
        try {
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), 6000);

          const isAudio = itag.includes('audio') || itag.includes('mp3') || itag.includes('bestaudio');
          const res = await fetch(instance, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            body: JSON.stringify({
              url: url,
              videoQuality: '720',
              downloadMode: isAudio ? 'audio' : 'auto',
              filenameStyle: 'basic'
            }),
            signal: controller.signal
          });
          clearTimeout(id);

          if (!res.ok) continue;
          const data = await res.json();
          if (data.status === 'stream' || data.status === 'redirect') {
            cobaltStreamUrl = data.url;
            break;
          }
        } catch (e) {
          // ignore instance failure
        }
      }

      if (cobaltStreamUrl) {
        console.log(`[Download Route] Directing client to Cobalt direct high-speed stream: ${cobaltStreamUrl}`);
        return NextResponse.redirect(new URL(cobaltStreamUrl));
      }
    } catch (e: any) {
      console.warn('[Download Route] Serverless Cobalt redirect failed:', e.message);
    }
  }

  let cookiePath = path.resolve(process.cwd(), 'cookies.txt');
  let generatedCookieFile: string | null = null;

  try {
    const plat = url.includes('youtube.com') || url.includes('youtu.be') ? 'youtube' :
                 url.includes('instagram.com') ? 'instagram' :
                 url.includes('facebook.com') || url.includes('fb.watch') ? 'facebook' : null;

    if (plat) {
      generatedCookieFile = generateNetscapeCookieFile(plat);
      if (generatedCookieFile) {
        cookiePath = generatedCookieFile;
        console.log(`Generated native Netscape cookie file for fallback download: ${cookiePath}`);
      }
    }

    // Schedule safe cleanup of the temporary cookie file in the background after some delay
    if (generatedCookieFile) {
      const fileToDelete = generatedCookieFile;
      setTimeout(() => {
        if (fs.existsSync(fileToDelete)) {
          try {
            fs.unlinkSync(fileToDelete);
            console.log(`Cleaned up temporary download cookie file: ${fileToDelete}`);
          } catch (err) {
            console.error(`Failed to delete temporary cookie file: ${fileToDelete}`, err);
          }
        }
      }, 10000); // 10 seconds is extremely safe to ensure subprocess has booted and loaded it
    }

    // For YouTube, try youtubei.js stream first as it's highly robust
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      try {
        console.log(`[Download Route] Using Innertube (youtubei.js) to stream YouTube video...`);
        const { Innertube, Platform } = require('youtubei.js');
        
        // Provide the custom JavaScript interpreter
        Platform.shim.eval = (code: any) => {
          const codeStr = typeof code === 'string' ? code : (code.code || code.output || code.toString());
          return new Function(codeStr)();
        };

        const cookies = getCookiesForPlatform('youtube');
        let cookieString = '';
        if (cookies && cookies.length > 0) {
          cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
          console.log(`[Innertube Stream] Loaded ${cookies.length} YouTube cookies from secure storage`);
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
          throw new Error('Could not parse YouTube video ID from URL');
        }

        console.log(`[Innertube Stream] Initiating download stream for video ID: ${videoId}, itag: ${itag}`);
        
        const isAudio = itag === 'bestaudio' || itag.includes('audio') || itag.includes('mp3');
        const streamOptions: any = {};
        
        if (isAudio) {
          streamOptions.type = 'audio';
          streamOptions.quality = 'best';
        } else if (itag && itag !== 'best') {
          streamOptions.itag = parseInt(itag);
        } else {
          streamOptions.type = 'video+audio';
          streamOptions.quality = 'best';
        }

        const stream = await yt.download(videoId, streamOptions);
        console.log('[Innertube Stream] Stream successfully generated from YouTube CDN!');

        const headers = new Headers();
        const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '_') || 'video';
        const ext = isAudio ? 'mp3' : 'mp4';
        headers.set('Content-Disposition', `attachment; filename="${cleanTitle}.${ext}"`);
        headers.set('Content-Type', isAudio ? 'audio/mpeg' : 'video/mp4');
        headers.set('Cache-Control', 'no-store');

        const reader = stream.getReader();
        const nativeStream = new ReadableStream({
          async pull(controller) {
            try {
              const { done, value } = await reader.read();
              if (done) {
                controller.close();
              } else {
                controller.enqueue(value);
              }
            } catch (err) {
              controller.error(err);
            }
          },
          cancel() {
            reader.cancel().catch(() => {});
          }
        });

        return new Response(nativeStream, {
          status: 200,
          headers
        });
      } catch (e: any) {
        console.warn('youtubei.js stream failed, falling back to other methods:', e.message);
      }

      // Try play-dl as the secondary fallback for YouTube streaming
      try {
        console.log(`[Download Route] Using play-dl to stream YouTube video...`);
        const play = require('play-dl');
        const cookies = getCookiesForPlatform('youtube');
        if (cookies && cookies.length > 0) {
          const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
          await play.setToken({ youtube: { cookie: cookieString } });
        }

        const info = await play.video_info(url);
        let selectedFormat = info.format.find((f: any) => (f.itag?.toString() || f.format_id?.toString()) === itag);
        
        if (!selectedFormat) {
          // Fallback: get the best format matching requested type
          const isAudio = itag === 'bestaudio' || itag.includes('audio') || itag.includes('mp3');
          if (isAudio) {
            selectedFormat = info.format.find((f: any) => !f.video_codec && f.mimeType?.startsWith('audio/'));
          } else {
            selectedFormat = info.format.find((f: any) => f.video_codec && f.mimeType?.startsWith('video/'));
          }
        }
        
        if (!selectedFormat) {
          selectedFormat = info.format[0];
        }

        if (!selectedFormat || !selectedFormat.url) {
          throw new Error('No format URL found via play-dl');
        }

        console.log(`[play-dl Stream] Fetching format URL: ${selectedFormat.url.slice(0, 100)}...`);
        const response = await fetch(selectedFormat.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch from YouTube CDN: ${response.statusText}`);
        }

        const headers = new Headers();
        const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '_') || 'video';
        const isAudio = itag === 'bestaudio' || itag.includes('audio') || itag.includes('mp3');
        const ext = isAudio ? 'mp3' : 'mp4';
        
        headers.set('Content-Disposition', `attachment; filename="${cleanTitle}.${ext}"`);
        headers.set('Content-Type', isAudio ? 'audio/mpeg' : 'video/mp4');
        headers.set('Cache-Control', 'no-store');
        
        const contentLength = response.headers.get('Content-Length');
        if (contentLength) {
          headers.set('Content-Length', contentLength);
        }

        return new NextResponse(response.body as any, {
          status: 200,
          headers
        });
      } catch (e: any) {
        console.warn('play-dl stream failed, falling back to other methods:', e.message);
      }
    }

    // Generic yt-dlp streaming fallback
    const subprocess = ytdl().exec(url, {
      format: itag,
      output: '-',
      noWarnings: true,
      noCheckCertificates: true,
      cookies: cookiePath,
      proxy: proxy || undefined
    }, {
      windowsHide: true
    });

    const headers = new Headers();
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, '_');
    headers.set('Content-Disposition', `attachment; filename="${sanitizedTitle}.mp4"`);
    headers.set('Content-Type', 'video/mp4');

    return new NextResponse(subprocess.stdout as any, {
      status: 200,
      headers
    });

  } catch (err: any) {
    console.error('Download error:', err);
    return NextResponse.json({ error: 'Failed to download video. Please try a different format or URL.' }, { status: 500 });
  }
}
