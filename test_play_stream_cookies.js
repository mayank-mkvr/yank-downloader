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

    console.log('Requesting stream...');
    const streamInfo = await play.stream('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    console.log('Stream Keys:', Object.keys(streamInfo));
    console.log('Type:', streamInfo.type);
    console.log('Stream is readable:', streamInfo.stream instanceof require('stream').Readable);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
