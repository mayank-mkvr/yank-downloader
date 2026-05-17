const play = require('play-dl');

async function test() {
  try {
    const info = await play.video_info('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    console.log('Keys:', Object.keys(info));
    console.log('Formats count:', info.format.length);
    console.log('First format:', info.format[0]);
  } catch (err) {
    console.error(err);
  }
}
test();
