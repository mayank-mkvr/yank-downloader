const ytdl = require('@distube/ytdl-core');
const path = require('path');
const fs = require('fs');

async function main() {
  try {
    console.log('Fetching video info using @distube/ytdl-core...');
    const options = {};
    const info = await ytdl.getInfo('https://www.youtube.com/watch?v=dQw4w9WgXcQ', options);
    console.log('Title:', info.videoDetails.title);
    
    // Choose format 18 (360p)
    const format = ytdl.chooseFormat(info.formats, { quality: '18' });
    console.log('Format URL:', format.url.slice(0, 100) + '...');

    // Try to get download stream
    console.log('Creating readable stream...');
    const stream = ytdl.downloadFromInfo(info, { format });
    
    // Read first chunk
    stream.on('data', chunk => {
      console.log('SUCCESS! Read chunk of size:', chunk.length);
      stream.destroy();
    });

    stream.on('error', err => {
      console.error('Stream Error:', err.message);
    });
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
