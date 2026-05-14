const youtubedl = require('youtube-dl-exec');

async function test() {
  try {
    const output = await youtubedl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
      dumpJson: true,
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true,
      preferFreeFormats: true,
      youtubeSkipDashManifest: true,
    });
    console.log('Success! Title:', output.title);
    console.log('Formats:', output.formats.length);
  } catch (err) {
    console.error('Error:', err.message);
  }
}
test();
