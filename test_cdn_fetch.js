const play = require('play-dl');
const path = require('path');
const fs = require('fs');

async function main() {
  try {
    const cookiePath = path.resolve(process.cwd(), 'cookies.txt');
    if (fs.existsSync(cookiePath)) {
      await play.setToken({ youtube: { cookie: cookiePath } });
    }

    const info = await play.video_info('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    const selectedFormat = info.format.find(f => f.itag === 18); // 360p
    if (!selectedFormat) {
      console.log('360p format not found');
      return;
    }

    console.log('CDN URL:', selectedFormat.url.slice(0, 100) + '...');
    
    // Read cookie file if exists
    let cookieString = '';
    if (fs.existsSync(cookiePath)) {
      cookieString = fs.readFileSync(cookiePath, 'utf8');
    }

    const headersToSend = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Referer': 'https://www.youtube.com/'
    };

    console.log('Fetching CDN URL with headers...');
    const response = await fetch(selectedFormat.url, {
      headers: headersToSend
    });

    console.log('Response Status:', response.status);
    console.log('Response Headers Content-Type:', response.headers.get('content-type'));
    console.log('Response Headers Content-Length:', response.headers.get('content-length'));

    if (response.ok) {
      console.log('SUCCESS! Successfully connected to YouTube CDN stream!');
    } else {
      console.log('FAILED! Status:', response.status, response.statusText);
      const text = await response.text();
      console.log('Error Body:', text.slice(0, 200));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
