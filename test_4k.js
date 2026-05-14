const { exec } = require('child_process');

exec('.\\yt-dlp.exe -j "https://www.youtube.com/watch?v=LXb3EKWsInQ"', { maxBuffer: 1024 * 1024 * 10 }, (error, stdout) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }
  const info = JSON.parse(stdout);
  const formats = info.formats.filter(f => f.vcodec !== 'none' && f.video_ext !== 'none');
  formats.forEach(f => {
    if (f.height >= 1080) {
      console.log(`ID: ${f.format_id}, Res: ${f.resolution}, Ext: ${f.ext}, Note: ${f.format_note}, FPS: ${f.fps}, VCodec: ${f.vcodec}`);
    }
  });
});
