import { NextRequest, NextResponse } from 'next/server';
import ytdl from '@/lib/ytdlp';
import play from 'play-dl';
import path from 'path';
import { getRandomProxy } from '@/lib/proxy';
import { ensurePythonEngineRunning } from '@/lib/pythonEngine';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    const proxy = getRandomProxy();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing URL' }, { status: 400 });
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
        return NextResponse.json({
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
        });
      } else {
        const errDetail = await pyResponse.json();
        console.warn('Python Session Engine returned error, falling back to standard extraction:', errDetail.detail);
      }
    } catch (e: any) {
      console.warn('Python Session Engine is offline or failed. Falling back to local node extraction...', e.message);
    }

    // 2. Standard Fallback local extraction
    const cookiePath = path.resolve(process.cwd(), 'cookies.txt');
    let responseData: any = null;

    // Try play-dl first for YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      try {
        await play.setToken({
          youtube: { cookie: cookiePath }
        });

        const info = await play.video_info(url, {
          proxies: proxy ? [proxy] : undefined
        } as any);

        responseData = {
          id: info.video_details.id,
          title: info.video_details.title,
          author: info.video_details.channel?.name || 'Unknown',
          thumbnail: info.video_details.thumbnails[0]?.url || '',
          duration: info.video_details.durationRaw || `${Math.floor(info.video_details.durationInSec / 60)}:${(info.video_details.durationInSec % 60).toString().padStart(2, '0')}`,
          qualities: info.format
            .filter((f: any) => f.container === 'mp4' || f.hasVideo)
            .map((f: any) => ({
              formatId: f.itag?.toString() || f.format_id,
              quality: f.quality_label || f.resolution || '720p',
              ext: 'mp4',
              sizeMB: f.content_length ? (parseInt(f.content_length) / (1024 * 1024)).toFixed(1) : (f.filesize ? (f.filesize / (1024 * 1024)).toFixed(1) : '??')
            })),
          size: 'Varies',
          source: 'youtube'
        };
      } catch (e: any) {
        console.warn('play-dl failed, falling back to yt-dlp:', e.message);
      }
    }

    if (!responseData) {
      // Generic local yt-dlp fallback
      const metadata = (await ytdl()(url, {
        dumpJson: true,
        noWarnings: true,
        noPlaylist: true,
        noCheckCertificates: true,
        cookies: cookiePath,
        proxy: proxy || undefined
      })) as any;

      responseData = {
        id: metadata.id,
        title: metadata.title,
        author: metadata.uploader || 'Unknown',
        thumbnail: metadata.thumbnail,
        duration: metadata.duration_string || `${Math.floor(metadata.duration / 60)}:${(metadata.duration % 60).toString().padStart(2, '0')}`,
        qualities: metadata.formats
          ?.filter((f: any) => f.ext === 'mp4' || f.vcodec !== 'none')
          .map((f: any) => ({
            formatId: f.format_id,
            quality: f.format_note || f.resolution || 'unknown',
            ext: f.ext,
            sizeMB: f.filesize ? (f.filesize / (1024 * 1024)).toFixed(1) : (f.filesize_approx ? (f.filesize_approx / (1024 * 1024)).toFixed(1) : '??')
          })) || [],
        size: metadata.filesize ? (metadata.filesize / (1024 * 1024)).toFixed(1) : '??',
        source: metadata.extractor
      };
    }

    return NextResponse.json(responseData);

  } catch (err: any) {
    console.error('Analyze error:', err);
    return NextResponse.json({ error: 'Failed to analyze video. YouTube/Insta might be blocking us. Try again later.' }, { status: 500 });
  }
}
