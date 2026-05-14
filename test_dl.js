const ytdl = require('@distube/ytdl-core');

async function test() {
  try {
    const stream = ytdl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    stream.on('info', (info) => {
      console.log('Stream info received, formats found:', info.formats.length);
    });
    stream.on('error', (err) => {
      console.error('Stream Error:', err.message);
    });
  } catch (err) {
    console.error('Catch Error:', err);
  }
}
test();
