const ytdl = require('@distube/ytdl-core');

async function test() {
  try {
    const info = await ytdl.getBasicInfo('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    console.log('Title:', info.videoDetails.title);
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
