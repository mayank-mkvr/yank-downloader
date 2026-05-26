const play = require('play-dl');

async function main() {
  try {
    const info = await play.video_info('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    console.log('Video Details:');
    console.log('ID:', info.video_details.id);
    console.log('Title:', info.video_details.title);
    console.log('Author:', info.video_details.channel?.name);
    console.log('Thumbnail:', info.video_details.thumbnails?.[0]?.url);
    console.log('Duration:', info.video_details.durationInSec);
    console.log('\nFirst format sample:');
    if (info.format && info.format.length > 0) {
      const f = info.format[0];
      console.log(JSON.stringify({
        formatId: f.itag || f.format_id,
        quality: f.qualityLabel || f.quality || f.resolution,
        container: f.container,
        url: f.url ? 'present' : 'absent',
        mimeType: f.mimeType,
        contentLength: f.contentLength,
        height: f.height,
        vcodec: f.codecs
      }, null, 2));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
