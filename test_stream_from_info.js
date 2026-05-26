const play = require('play-dl');
const path = require('path');
const fs = require('fs');

async function main() {
  try {
    const cookiePath = path.resolve(process.cwd(), 'cookies.txt');
    if (fs.existsSync(cookiePath)) {
      await play.setToken({ youtube: { cookie: cookiePath } });
      console.log('Cookies loaded!');
    }

    const info = await play.video_info('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    console.log('Got video info! Title:', info.video_details.title);

    console.log('Creating stream from info using stream_from_info...');
    const streamInfo = await play.stream_from_info(info);
    console.log('Stream Keys:', Object.keys(streamInfo));
    console.log('Type:', streamInfo.type);
    console.log('Stream is readable:', streamInfo.stream instanceof require('stream').Readable);
    console.log('Stream URL:', streamInfo.url.slice(0, 100) + '...');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
