# YT Downloader - Local Installation Guide

## Download & Install

### Option 1: Automatic Setup (Recommended)
1. Download `YTDownloader-Setup.bat`
2. Double-click to run the installation
3. The application will automatically:
   - Check for Node.js (and install if needed)
   - Install dependencies
   - Build the application
   - Open in your browser

### Option 2: Manual Setup
1. Ensure Node.js is installed (https://nodejs.org/)
2. Download and extract the application folder
3. Run `RUN-YTDownloader.bat` to start the server
4. Open http://localhost:3000 in your browser

## System Requirements

- **Windows 7 or later**
- **Internet connection** (for first-time setup)
- **Administrator privileges** (for Node.js installation if needed)
- **RAM:** 2GB minimum
- **Disk Space:** 500MB for Node.js + dependencies

## First Run

The first time you run the application:
1. It will install all dependencies (may take 2-5 minutes)
2. Once ready, the app will automatically open in your browser
3. If the browser doesn't open, visit http://localhost:3000 manually

## Subsequent Runs

Just double-click `RUN-YTDownloader.bat` to start the server. It will remember all dependencies from the first run.

## Troubleshooting

### "Node.js not found" error
- Install Node.js from https://nodejs.org/ and restart
- Or run the script again and select "Yes" to auto-install

### Port 3000 already in use
- Another application is using port 3000
- You can change the port by modifying the batch file:
  - Find the line `set PORT=3000`
  - Change `3000` to another number (e.g., `3001`)

### Application won't start
- Delete the `node_modules` folder
- Delete `.next` folder
- Run the setup script again

## Performance Notes

- First run takes longer due to dependencies installation
- Video downloads depend on your internet connection
- Large videos may take several minutes to process

## Support

For issues or feature requests, visit the project repository or contact support.

## License

This application is provided as-is for personal use.
