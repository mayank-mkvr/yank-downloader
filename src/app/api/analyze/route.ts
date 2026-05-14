import { NextResponse } from 'next/server';
import { exec, execSync } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);
const ytDlpCmd = process.platform === 'win32' ? '.\\yt-dlp.exe' : 'yt-dlp';
let ffmpegAvailable = true;
try {
  execSync('ffmpeg -version', { stdio: 'ignore' });
} catch {
  ffmpegAvailable = false;
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Detect if it's a playlist URL
    const isPlaylist = url.includes('list=') || url.includes('/playlist?');

    if (isPlaylist) {
      const { stdout } = await execPromise(`${ytDlpCmd} -J --flat-playlist --no-warnings "${url}"`);
      const info = JSON.parse(stdout);
      
      return NextResponse.json({
        isPlaylist: true,
        title: info.title || "YouTube Playlist",
        author: info.uploader || info.channel || "Various Artists",
        videoCount: info.entries ? info.entries.length : 0,
        thumbnail: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&q=80", // Placeholder for playlist
        entries: info.entries ? info.entries.slice(0, 50).map((e: any) => ({
          title: e.title,
          url: e.url,
          id: e.id
        })) : []
      });
    }

    // Execute yt-dlp to get single video metadata in JSON format
    const { stdout } = await execPromise(`${ytDlpCmd} -j --no-warnings "${url}"`);
    const info = JSON.parse(stdout);

    // Extract real qualities with their actual file sizes (or approximated if hidden)
    const combinedFormats = info.formats.filter((f: any) => f.vcodec !== 'none' && f.acodec !== 'none');
    const videoOnlyFormats = info.formats.filter((f: any) => f.vcodec !== 'none' && f.acodec === 'none');
    const formatList = [
      ...combinedFormats,
      ...(ffmpegAvailable ? videoOnlyFormats : []),
    ];
    const hasHighResVideoOnly = videoOnlyFormats.some((f: any) => (f.height || 0) >= 1440);

    const qualities = formatList
      .filter((f: any) => {
        const shortEdge = Math.min(f.width || 0, f.height || 0);
        return shortEdge <= 2160; // Filter out 8K (4320p)
      })
      .map((f: any) => {
        let sizeStr = "Unknown";
        if (f.filesize) {
          sizeStr = (f.filesize / 1024 / 1024).toFixed(1);
        } else if (f.filesize_approx) {
          sizeStr = (f.filesize_approx / 1024 / 1024).toFixed(1);
        } else if (info.duration) {
          // Fallback: Estimate size based on resolution and duration
          const h = f.height || 720;
          let mbPerMin = 8; // Default 720p
          if (h >= 1080) mbPerMin = 15;
          else if (h >= 480) mbPerMin = 5;
          else if (h < 480) mbPerMin = 3;
          
          sizeStr = ((info.duration / 60) * mbPerMin).toFixed(1);
        }

        const shortEdge = Math.min(f.width || 0, f.height || 0);
        let rawLabel = f.format_note || f.resolution || '';
        let label = "Standard";
        
        // Normalize resolutions
        if (rawLabel.includes('2160') || shortEdge === 2160) label = '4K';
        else if (rawLabel.includes('1440') || shortEdge === 1440) label = '2K';
        else if (rawLabel.includes('1080') || shortEdge === 1080) label = '1080p HD';
        else if (rawLabel.includes('720') || shortEdge === 720) label = '720p';
        else if (shortEdge > 0) label = `${shortEdge}p`;
        else if (rawLabel) label = rawLabel;

        // Append 60FPS if applicable
        if (f.fps > 30) label += ` 60FPS`;

        return {
          quality: label.trim(),
          formatId: f.acodec === 'none' ? `${f.format_id}+bestaudio` : `${f.format_id}`,
          sizeMB: sizeStr
        };
      })
      .reduce((acc: any[], current: any) => {
        // Deduplicate by quality, keeping the highest quality version
        if (!acc.find((x) => x.quality === current.quality)) {
          acc.push(current);
        }
        return acc;
      }, [])
      .sort((a: any, b: any) => parseFloat(b.sizeMB) - parseFloat(a.sizeMB));

    const durationMins = Math.floor(info.duration / 60);
    const remainingSecs = info.duration % 60;
    const formattedDuration = `${durationMins}:${remainingSecs.toString().padStart(2, '0')}`;

    // Calculate default total size from the best quality
    const defaultSize = qualities.length > 0 ? qualities[0].sizeMB : "0";

    return NextResponse.json({
      title: info.title,
      thumbnail: info.thumbnail,
      duration: formattedDuration,
      author: info.uploader,
      qualities: qualities,
      size: defaultSize,
      ffmpegAvailable,
      ffmpegRequiredForHighRes: !ffmpegAvailable && hasHighResVideoOnly,
    });

  } catch (error: any) {
    console.error('Error analyzing URL with yt-dlp:', error);
    return NextResponse.json({ error: 'Failed to analyze video. YouTube may be blocking the request.' }, { status: 500 });
  }
}
