import { NextRequest, NextResponse } from 'next/server';
import ytdl from '@/lib/ytdlp';
import play from 'play-dl';
import path from 'path';
import { getRandomProxy } from '@/lib/proxy';

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
  const cookiePath = path.resolve(process.cwd(), 'cookies.txt');

  try {
    // For YouTube, try play-dl stream first as it's more direct
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      try {
        await play.setToken({
          youtube: { cookie: cookiePath }
        });

        const stream = await play.stream(url, {
          quality: itag.includes('audio') ? 0 : 1,
          proxies: proxy ? [proxy] : undefined
        } as any);
        const headers = new Headers();
        headers.set('Content-Disposition', `attachment; filename="${title}.mp4"`);
        headers.set('Content-Type', 'video/mp4');
        return new NextResponse(stream.stream as any, { headers });
      } catch (e) {
        console.warn('play-dl stream failed, falling back to yt-dlp');
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
