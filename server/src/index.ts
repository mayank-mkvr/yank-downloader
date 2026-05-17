import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { pipeline } from 'stream/promises';
import { logger } from './lib/logger';
import { connectRedis } from './lib/redis';
import { extractVideoInfo, streamYtdlp } from './lib/yt-dlp';
import { analyzeQueue, downloadQueue } from './lib/queue';
import { ffmpegAvailable } from './lib/ffmpeg';

const PORT = Number(process.env.PORT || 4000);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 30);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map((origin) => origin.trim());

function sanitizeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9 _.-]/g, '').substring(0, 120) || 'download';
}

function isValidUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

async function initialize() {
  await connectRedis();
  await analyzeQueue.waitUntilReady();
  await downloadQueue.waitUntilReady();
}

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(morgan('combined', { stream: { write: (message: string) => logger.info(message.trim()) } }));
app.use(cors({ origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'], allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'] }));
app.use(rateLimit({ windowMs: RATE_LIMIT_WINDOW_MS, max: RATE_LIMIT_MAX, standardHeaders: true, legacyHeaders: false }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.post('/api/analyze', async (req: Request, res: Response, next: NextFunction) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string' || !isValidUrl(url)) {
    return res.status(400).json({ error: 'Invalid or missing URL' });
  }

  try {
    const metadata = await extractVideoInfo(url);
    await analyzeQueue.add('metadata', { url }, { removeOnComplete: 50, removeOnFail: 50 });

    const bestFormats = metadata.formats
      .filter((format: any) => format.ext === 'mp4' || format.ext === 'webm' || format.acodec !== 'none')
      .slice(0, 24);

    return res.json({
      id: metadata.id,
      title: metadata.title,
      author: metadata.uploader,
      thumbnail: metadata.thumbnail,
      duration: metadata.duration,
      formats: bestFormats,
      ffmpegAvailable: ffmpegAvailable(),
      extractedAt: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
});

app.get('/api/download', async (req: Request, res: Response, next: NextFunction) => {
  const url = String(req.query.url || '');
  const formatId = String(req.query.formatId || 'best');
  const rawTitle = String(req.query.title || 'download');

  if (!url || !formatId || !isValidUrl(url)) {
    return res.status(400).json({ error: 'Missing or invalid download parameters' });
  }

  if (formatId.includes('+') && !ffmpegAvailable()) {
    return res.status(422).json({ error: 'FFmpeg is required for merged video downloads. Install FFmpeg and retry.' });
  }

  const sanitizedTitle = `${sanitizeFilename(rawTitle)}.${formatId === 'bestaudio' ? 'mp3' : formatId.includes('+') ? 'mp4' : 'mp4'}`;
  res.setHeader('Content-Disposition', `attachment; filename="${sanitizedTitle}"`);
  res.setHeader('Content-Type', formatId === 'bestaudio' ? 'audio/mpeg' : 'video/mp4');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Transfer-Encoding', 'chunked');

  try {
    await downloadQueue.add('stream', { url, formatId, title: rawTitle }, { removeOnComplete: 50, removeOnFail: 50 });
    const child = streamYtdlp(url, formatId);

    child.stderr.on('data', (chunk) => logger.warn({ stderr: chunk.toString() }, 'yt-dlp download stderr'));
    child.on('error', (error) => logger.error({ err: error }, 'yt-dlp process error'));

    req.on('aborted', () => {
      logger.warn({ url, formatId }, 'client aborted download');
      child.kill('SIGINT');
    });

    await pipeline(child.stdout, res);
  } catch (err) {
    next(err);
  }
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'unhandled server error');
  const message = err?.message || 'Internal server failure';
  res.status(500).json({ error: message });
});

initialize()
  .then(() => {
    app.listen(PORT, () => {
      logger.info({ port: PORT }, 'backend service started');
    });
  })
  .catch((error) => {
    logger.error({ err: error }, 'failed to initialize backend service');
    process.exit(1);
  });
