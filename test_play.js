const play = require('play-dl');

async function test() {
  try {
    const stream = await play.stream('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    console.log('Stream retrieved! Type:', stream.type);
    console.log('URL:', stream.url.slice(0, 50) + '...');
  } catch (err) {
    console.error('Error:', err.message);
  }
}
test();
