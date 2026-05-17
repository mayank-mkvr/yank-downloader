const youtubeDl = require('youtube-dl-exec');
const path = require('path');

async function debug() {
  const url = 'https://youtu.be/WPl10ZrhCtk?si=G4L4aJ8JKewZk6_q';
  const cookiePath = path.resolve(process.cwd(), 'cookies.txt');
  const proxy = 'http://hdussmam:ylixclo5phws@142.111.48.253:7030/';

  console.log('Testing with yt-dlp...');
  try {
    const metadata = await youtubeDl(url, {
      dumpJson: true,
      noWarnings: true,
      cookies: cookiePath,
      proxy: proxy
    });
    console.log('Success! Title:', metadata.title);
  } catch (e) {
    console.error('yt-dlp failed:', e.message);
  }
}

debug();
