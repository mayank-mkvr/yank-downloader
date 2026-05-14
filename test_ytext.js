const yt = require('youtube-ext');

async function test() {
  try {
    const info = await yt.videoInfo('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    console.log('Success! Formats:', info.formats.length);
  } catch (err) {
    console.error('Error:', err.message);
  }
}
test();
