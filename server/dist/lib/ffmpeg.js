"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ffmpegAvailable = ffmpegAvailable;
exports.spawnFfmpegMerge = spawnFfmpegMerge;
const child_process_1 = require("child_process");
const logger_1 = require("./logger");
function ffmpegAvailable() {
    try {
        const proc = (0, child_process_1.spawn)('ffmpeg', ['-version'], { stdio: 'ignore' });
        proc.kill();
        return true;
    }
    catch {
        return false;
    }
}
function spawnFfmpegMerge(videoStream, audioStream, outputFormat = 'mp4') {
    const args = [
        '-i', 'pipe:3',
        '-i', 'pipe:4',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-movflags', 'frag_keyframe+empty_moov',
        '-f', outputFormat,
        'pipe:1'
    ];
    logger_1.logger.info({ args }, 'starting ffmpeg merge pipeline');
    const ffmpeg = (0, child_process_1.spawn)('ffmpeg', args, {
        stdio: ['ignore', 'pipe', 'pipe', 'pipe', 'pipe']
    });
    videoStream.pipe(ffmpeg.stdio[3]);
    audioStream.pipe(ffmpeg.stdio[4]);
    return ffmpeg;
}
