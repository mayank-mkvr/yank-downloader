const play = require('play-dl');

async function main() {
  try {
    const streamInfo = await play.stream('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    console.log('Stream Keys:', Object.keys(streamInfo));
    console.log('Type:', streamInfo.type);
    console.log('Is Readable Stream:', streamInfo.stream instanceof require('stream').Readable);
    console.log('Video Format / quality:', streamInfo.quality);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
