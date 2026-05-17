import { spawn } from 'child_process';
import { logger } from './logger';

export function ffmpegAvailable() {
  try {
    const proc = spawn('ffmpeg', ['-version'], { stdio: 'ignore' });
    proc.kill();
    return true;
  } catch {
    return false;
  }
}

export function spawnFfmpegMerge(videoStream: NodeJS.ReadableStream, audioStream: NodeJS.ReadableStream, outputFormat: string = 'mp4') {
  const args = [
    '-i', 'pipe:3',
    '-i', 'pipe:4',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-movflags', 'frag_keyframe+empty_moov',
    '-f', outputFormat,
    'pipe:1'
  ];

  logger.info({ args }, 'starting ffmpeg merge pipeline');
  const ffmpeg = spawn('ffmpeg', args, {
    stdio: ['ignore', 'pipe', 'pipe', 'pipe', 'pipe']
  });

  videoStream.pipe(ffmpeg.stdio[3] as NodeJS.WritableStream);
  audioStream.pipe(ffmpeg.stdio[4] as NodeJS.WritableStream);
  return ffmpeg;
}
