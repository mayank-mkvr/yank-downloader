#!/usr/bin/env node
const path = require('path');
const { createServer } = require('http');
const { parse } = require('url');

// Check if Next.js is available
let app, handle;
try {
  const next = require('next');
  app = next({ dev: false, dir: __dirname });
  handle = app.getRequestHandler();
} catch (e) {
  console.error('Next.js not found. Installing...');
  process.exit(1);
}

const port = parseInt(process.env.PORT || '3000', 10);
const hostname = 'localhost';

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      
      // Handle direct file requests
      if (parsedUrl.pathname === '/favicon.ico') {
        res.statusCode = 204;
        res.end();
        return;
      }
      
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  server.listen(port, hostname, () => {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   YT DOWNLOADER - RUNNING             ║');
    console.log('╚════════════════════════════════════════╝\n');
    console.log('✓ Server is ready!');
    console.log(`✓ Open: http://localhost:${port}`);
    console.log('\nPress Ctrl+C to stop\n');
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down gracefully...');
  process.exit(0);
});
