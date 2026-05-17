import { spawn } from 'child_process';
import { logger } from './logger';
import { getCache, setCache } from './redis';
import crypto from 'crypto';

const ytDlpCommand = 'yt-dlp';
const YTDLP_TIMEOUT_MS = Number(process.env.YTDLP_TIMEOUT_MS || 45000);

function buildCacheKey(url: string) {
  const hash = crypto.createHash('sha256').update(url).digest('hex');
  return `media:metadata:${hash}`;
}

export async function extractVideoInfo(url: string) {
  const cacheKey = buildCacheKey(url);
  const cached = await getCache<any>(cacheKey);
  if (cached) {
    logger.info({ url, cacheKey }, 'metadata cache hit');
    return cached;
  }

  logger.info({ url }, 'extracting metadata with yt-dlp');

  const args = [
    '-j',
    '--no-warnings',
    '--no-playlist',
    '--no-check-certificate',
    `--socket-timeout`, `${YTDLP_TIMEOUT_MS / 1000}`,
    url
  ];

  const child = spawn(ytDlpCommand, args, {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });

  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
    logger.warn({ stderr: chunk.toString() }, 'yt-dlp stderr');
  });

  const result = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('yt-dlp metadata extraction timed out'));
    }, YTDLP_TIMEOUT_MS);

    child.on('error', reject);
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(`yt-dlp exited with code ${code}: ${stderr.trim()}`));
      } else if (!stdout) {
        reject(new Error(`yt-dlp returned no metadata: ${stderr.trim()}`));
      } else {
        resolve(stdout);
      }
    });
  });

  const info = JSON.parse(result);
  const metadata = normalizeVideoInfo(info);

  await setCache(cacheKey, metadata, 3600 * 12);
  return metadata;
}

function normalizeVideoInfo(info: any) {
  const formats = Array.isArray(info.formats) ? info.formats : [];
  const combinedFormats = formats.filter((format: any) => format.vcodec !== 'none' && format.acodec !== 'none');
  const audioOnlyFormats = formats.filter((format: any) => format.vcodec === 'none' && format.acodec !== 'none');

  const qualityList = combinedFormats
    .concat(audioOnlyFormats)
    .map((format: any) => {
      const size = format.filesize || format.filesize_approx || 0;
      const qualityLabel = format.format_note || format.resolution || `${format.acodec || ''}`;
      return {
        formatId: format.format_id,
        quality: qualityLabel,
        ext: format.ext || 'mp4',
        filesize: size,
        fps: format.fps || 0,
        height: format.height || 0,
        width: format.width || 0,
        acodec: format.acodec,
        vcodec: format.vcodec,
        formatNote: format.format_note || '',
        description: format.format || ''
      };
    })
    .sort((a: any, b: any) => (b.height || 0) - (a.height || 0) || (b.filesize || 0) - (a.filesize || 0));

  const sanitized = {
    id: info.id,
    title: info.title || 'download',
    uploader: info.uploader || info.channel || '',
    duration: info.duration || 0,
    thumbnail: info.thumbnail || '',
    upload_date: info.upload_date || '',
    extractor: info.extractor || '',
    webpage_url: info.webpage_url || '',
    formats: qualityList
  };

  return sanitized;
}

export function buildYtdlpDownloadArgs(url: string, formatId: string) {
  const args = ['-f', formatId, '--no-warnings', '--no-check-certificate', `--socket-timeout`, `${YTDLP_TIMEOUT_MS / 1000}`, url, '-o', '-'];

  if (formatId === 'bestaudio') {
    return ['-f', 'bestaudio', '--no-warnings', '--no-check-certificate', `--socket-timeout`, `${YTDLP_TIMEOUT_MS / 1000}`, '--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0', url, '-o', '-'];
  }

  if (formatId.includes('+')) {
    args.push('--merge-output-format', 'mp4');
  }

  return args;
}

export function streamYtdlp(url: string, formatId: string) {
  const args = buildYtdlpDownloadArgs(url, formatId);
  logger.info({ url, formatId, args }, 'starting yt-dlp stream');
  return spawn(ytDlpCommand, args, {
    stdio: ['ignore', 'pipe', 'pipe']
  });
}
