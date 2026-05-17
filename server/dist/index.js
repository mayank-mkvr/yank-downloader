"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const morgan_1 = __importDefault(require("morgan"));
const promises_1 = require("stream/promises");
const logger_1 = require("./lib/logger");
const redis_1 = require("./lib/redis");
const yt_dlp_1 = require("./lib/yt-dlp");
const queue_1 = require("./lib/queue");
const ffmpeg_1 = require("./lib/ffmpeg");
const PORT = Number(process.env.PORT || 4000);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 30);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map((origin) => origin.trim());
function sanitizeFilename(value) {
    return value.replace(/[^a-zA-Z0-9 _.-]/g, '').substring(0, 120) || 'download';
}
function isValidUrl(value) {
    try {
        new URL(value);
        return true;
    }
    catch {
        return false;
    }
}
async function initialize() {
    await (0, redis_1.connectRedis)();
    await queue_1.analyzeQueue.waitUntilReady();
    await queue_1.downloadQueue.waitUntilReady();
}
const app = (0, express_1.default)();
app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '10kb' }));
app.use(express_1.default.urlencoded({ extended: false }));
app.use((0, morgan_1.default)('combined', { stream: { write: (message) => logger_1.logger.info(message.trim()) } }));
app.use((0, cors_1.default)({ origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'], allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'] }));
app.use((0, express_rate_limit_1.default)({ windowMs: RATE_LIMIT_WINDOW_MS, max: RATE_LIMIT_MAX, standardHeaders: true, legacyHeaders: false }));
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});
app.post('/api/analyze', async (req, res, next) => {
    const { url } = req.body;
    if (!url || typeof url !== 'string' || !isValidUrl(url)) {
        return res.status(400).json({ error: 'Invalid or missing URL' });
    }
    try {
        const metadata = await (0, yt_dlp_1.extractVideoInfo)(url);
        await queue_1.analyzeQueue.add('metadata', { url }, { removeOnComplete: 50, removeOnFail: 50 });
        const bestFormats = metadata.formats
            .filter((format) => format.ext === 'mp4' || format.ext === 'webm' || format.acodec !== 'none')
            .slice(0, 24);
        return res.json({
            id: metadata.id,
            title: metadata.title,
            author: metadata.uploader,
            thumbnail: metadata.thumbnail,
            duration: metadata.duration,
            formats: bestFormats,
            ffmpegAvailable: (0, ffmpeg_1.ffmpegAvailable)(),
            extractedAt: new Date().toISOString()
        });
    }
    catch (err) {
        next(err);
    }
});
app.get('/api/download', async (req, res, next) => {
    const url = String(req.query.url || '');
    const formatId = String(req.query.formatId || 'best');
    const rawTitle = String(req.query.title || 'download');
    if (!url || !formatId || !isValidUrl(url)) {
        return res.status(400).json({ error: 'Missing or invalid download parameters' });
    }
    if (formatId.includes('+') && !(0, ffmpeg_1.ffmpegAvailable)()) {
        return res.status(422).json({ error: 'FFmpeg is required for merged video downloads. Install FFmpeg and retry.' });
    }
    const sanitizedTitle = `${sanitizeFilename(rawTitle)}.${formatId === 'bestaudio' ? 'mp3' : formatId.includes('+') ? 'mp4' : 'mp4'}`;
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedTitle}"`);
    res.setHeader('Content-Type', formatId === 'bestaudio' ? 'audio/mpeg' : 'video/mp4');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Transfer-Encoding', 'chunked');
    try {
        await queue_1.downloadQueue.add('stream', { url, formatId, title: rawTitle }, { removeOnComplete: 50, removeOnFail: 50 });
        const child = (0, yt_dlp_1.streamYtdlp)(url, formatId);
        child.stderr.on('data', (chunk) => logger_1.logger.warn({ stderr: chunk.toString() }, 'yt-dlp download stderr'));
        child.on('error', (error) => logger_1.logger.error({ err: error }, 'yt-dlp process error'));
        req.on('aborted', () => {
            logger_1.logger.warn({ url, formatId }, 'client aborted download');
            child.kill('SIGINT');
        });
        await (0, promises_1.pipeline)(child.stdout, res);
    }
    catch (err) {
        next(err);
    }
});
app.use((err, _req, res, _next) => {
    logger_1.logger.error({ err }, 'unhandled server error');
    const message = err?.message || 'Internal server failure';
    res.status(500).json({ error: message });
});
initialize()
    .then(() => {
    app.listen(PORT, () => {
        logger_1.logger.info({ port: PORT }, 'backend service started');
    });
})
    .catch((error) => {
    logger_1.logger.error({ err: error }, 'failed to initialize backend service');
    process.exit(1);
});
