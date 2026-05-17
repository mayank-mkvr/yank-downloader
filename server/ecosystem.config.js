module.exports = {
  apps: [
    {
      name: 'ytdownloader-backend',
      script: './dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'ytdownloader-analyze-worker',
      script: './dist/workers/analyze.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'ytdownloader-download-worker',
      script: './dist/workers/ffmpeg.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
