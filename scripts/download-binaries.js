const https = require('https');
const fs = require('fs');
const path = require('path');

const BIN_DIR = path.join(__dirname, '..', 'bin', 'linux');

if (!fs.existsSync(BIN_DIR)) {
  fs.mkdirSync(BIN_DIR, { recursive: true });
}

const YTDLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';

function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      console.log(`[Binaries] ${path.basename(dest)} already exists.`);
      return resolve();
    }
    console.log(`[Binaries] Downloading ${path.basename(dest)}...`);
    const file = fs.createWriteStream(dest);
    
    const request = (targetUrl) => {
      https.get(targetUrl, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          return request(response.headers.location);
        }
        
        if (response.statusCode !== 200) {
          fs.unlink(dest, () => {});
          return reject(new Error(`Failed to get '${targetUrl}' (${response.statusCode})`));
        }
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          fs.chmodSync(dest, '755');
          console.log(`[Binaries] ${path.basename(dest)} downloaded and made executable.`);
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    };
    
    request(url);
  });
}

async function main() {
  try {
    // We only need this in production Linux environments (Firebase App Hosting / Vercel)
    if (process.env.NODE_ENV === 'production' || process.env.FIREBASE_APP_HOSTING || process.env.VERCEL) {
        await download(YTDLP_URL, path.join(BIN_DIR, 'yt-dlp'));
    } else {
        console.log('[Binaries] Skipping download for local development. Use system yt-dlp.');
    }
  } catch (err) {
    console.error('[Binaries] Failed to download:', err);
    process.exit(1);
  }
}

main();
