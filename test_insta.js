const { exec } = require('child_process');

exec('.\\yt-dlp.exe -j "https://www.instagram.com/p/CoF40_5u1e8/"', { maxBuffer: 1024 * 1024 * 10 }, (error, stdout) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }
  const info = JSON.parse(stdout);
  console.log(`Total Formats: ${info.formats.length}`);
  info.formats.forEach(f => {
    console.log(`ID: ${f.format_id}, WxH: ${f.width}x${f.height}, Ext: ${f.ext}, VExt: ${f.video_ext}, VCodec: ${f.vcodec}`);
  });
});
