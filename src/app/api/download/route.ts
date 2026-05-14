import { NextRequest, NextResponse } from 'next/server';
import { spawn, execSync } from 'child_process';
import path from 'path';
import os from 'os';
import { createReadStream, statSync, unlinkSync, existsSync } from 'fs';

const ytDlpCmd = process.platform === 'win32' ? '.\\yt-dlp.exe' : 'yt-dlp';
let ffmpegAvailable = true;
try {
  execSync('ffmpeg -version', { stdio: 'ignore' });
} catch {
  ffmpegAvailable = false;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  const formatId = req.nextUrl.searchParams.get('formatId') || 'best';
  const rawTitle = req.nextUrl.searchParams.get('title') || 'SaveX_Download';
  const cleanTitle = rawTitle.replace(/[^a-zA-Z0-9 ]/g, "").trim().substring(0, 60);

  if (!url) {
    return new NextResponse('Invalid or missing URL', { status: 400 });
  }

  const isAudioOnly = formatId === 'bestaudio';
  const requiresMerge = !isAudioOnly && formatId.includes('+');
  const ext = isAudioOnly ? 'mp3' : 'mp4';
  const tempFilePath = path.join(os.tmpdir(), `savex-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`);

  if (requiresMerge && !ffmpegAvailable) {
    return new NextResponse('This video requires ffmpeg to merge audio and video for high-resolution downloads. Please install ffmpeg and try again.', { status: 400 });
  }

  try {
    // 1. Download and mux to a temporary file
    await new Promise((resolve, reject) => {
      const args = ['-f', formatId, '-o', tempFilePath, '--no-warnings', url];
      
      if (isAudioOnly) {
        args.push('--extract-audio', '--audio-format', 'mp3');
      } else if (requiresMerge) {
        args.push('--merge-output-format', 'mp4');
      }

      const ytDlp = spawn(ytDlpCmd, args);
      
      ytDlp.stderr.on('data', (data) => console.error(`[yt-dlp]: ${data.toString()}`));
      
      ytDlp.on('close', (code) => {
        if (code === 0 && existsSync(tempFilePath)) {
          resolve(true);
        } else {
          reject(new Error(`yt-dlp exited with code ${code}`));
        }
      });
    });

    // 2. Stream the completed file back to the browser
    const stat = statSync(tempFilePath);
    const fileStream = createReadStream(tempFilePath);

    const webStream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => controller.enqueue(chunk));
        fileStream.on('end', () => {
          controller.close();
          try { unlinkSync(tempFilePath); } catch (e) {} // Cleanup
        });
        fileStream.on('error', (err) => {
          controller.error(err);
          try { unlinkSync(tempFilePath); } catch (e) {} // Cleanup
        });
      },
      cancel() {
        fileStream.destroy();
        try { unlinkSync(tempFilePath); } catch (e) {} // Cleanup
      }
    });

    return new NextResponse(webStream, {
      headers: {
        'Content-Disposition': `attachment; filename="${cleanTitle}.${ext}"`,
        'Content-Type': isAudioOnly ? 'audio/mpeg' : 'video/mp4',
        'Content-Length': stat.size.toString(),
      },
    });

  } catch (err: any) {
    console.error("Download Error:", err);
    try { if (existsSync(tempFilePath)) unlinkSync(tempFilePath); } catch (e) {}
    return new NextResponse('Error downloading media.', { status: 500 });
  }
}
