const play = require('play-dl');
const path = require('path');
const fs = require('fs');

async function debug() {
  const url = 'https://youtu.be/WPl10ZrhCtk?si=G4L4aJ8JKewZk6_q';
  const cookiePath = path.resolve(process.cwd(), 'cookies.txt');
  const proxy = 'http://hdussmam:ylixclo5phws@142.111.48.253:7030/';

  console.log('Testing with play-dl...');
  try {
    await play.setToken({ youtube: { cookie: fs.readFileSync(cookiePath, 'utf-8') } });
    const info = await play.video_info(url, { proxies: [proxy] });
    console.log('Success! Title:', info.video_details.title);
  } catch (e) {
    console.error('play-dl failed:', e.message);
  }
}

debug();
