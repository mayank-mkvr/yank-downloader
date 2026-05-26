import { create } from 'youtube-dl-exec';
import path from 'path';
import fs from 'fs';
import os from 'os';

let cachedYtdl: any = null;

const getBinPath = () => {
  const isWin = os.platform() === 'win32';
  const binName = isWin ? 'yt-dlp.exe' : 'yt-dlp';
  
  const searchPaths = [
    path.resolve(process.cwd(), 'bin', 'linux', 'yt-dlp'),
    path.resolve(process.cwd(), binName),
    path.resolve(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', binName),
    path.resolve(__dirname, '..', '..', '..', '..', binName),
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp'
  ];

  for (const p of searchPaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
};

export const getYtdl = () => {
  if (cachedYtdl) return cachedYtdl;
  const binPath = getBinPath();
  cachedYtdl = binPath ? create(binPath) : require('youtube-dl-exec');
  return cachedYtdl;
};

export default getYtdl;
