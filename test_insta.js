const { exec } = require('child_process');

const url = "https://www.instagram.com/p/CoF40_5u1e8/";
const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

exec(`.\\yt-dlp.exe --user-agent "${userAgent}" -j "${url}"`, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`);
    console.error(`stderr: ${stderr}`);
    return;
  }
  try {
    const info = JSON.parse(stdout);
    console.log(`Success! Title: ${info.title}`);
    console.log(`Total Formats: ${info.formats.length}`);
  } catch (e) {
    console.error(`Parse error: ${e.message}`);
    console.log(`Stdout: ${stdout}`);
  }
});
