const play = require('play-dl');
const youtubeDl = require('youtube-dl-exec');
const path = require('path');
const fs = require('fs');

async function testExtraction(url) {
  console.log(`\nTesting URL: ${url}`);
  const cookiePath = path.resolve(process.cwd(), 'cookies.txt');
  
  // Test Cobalt Fallback
  try {
    console.log('--- Stage 1: Cobalt ---');
    const cobaltRes = await fetch('https://co.wuk.sh/api/json', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, videoQuality: '1080' })
    });
    const cobaltData = await cobaltRes.json();
    console.log('Cobalt Status:', cobaltData.status);
    if (cobaltData.url) console.log('Cobalt URL found!');
  } catch (e) {
    console.log('Cobalt failed:', e.message);
  }

  // Test play-dl
  if (url.includes('youtube')) {
    try {
      console.log('--- Stage 2: play-dl ---');
      await play.setToken({ youtube: { cookie: cookiePath } });
      const info = await play.video_info(url);
      console.log('Title:', info.video_details.title);
      console.log('Formats found:', info.format.length);
    } catch (e) {
      console.log('play-dl failed:', e.message);
    }
  }

  // Test yt-dlp
  try {
    console.log('--- Stage 3: yt-dlp ---');
    const metadata = await youtubeDl(url, {
      dumpJson: true,
      noWarnings: true,
      cookies: cookiePath,
      addHeader: ['User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36']
    });
    console.log('Title:', metadata.title);
    console.log('Extractor:', metadata.extractor);
  } catch (e) {
    console.log('yt-dlp failed:', e.message);
  }
}

async function runAll() {
  const links = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.instagram.com/reels/C34P9Y_S8f7/',
    'https://www.facebook.com/watch/?v=10158630514211729'
  ];
  
  for (const link of links) {
    await testExtraction(link);
  }
}

runAll();
