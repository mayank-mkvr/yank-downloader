# Docker Deployment Guide

The app is configured to deploy as a Docker container to any of these platforms:

## 1. **Render** (Easiest - Free tier available)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com)
3. Click "New +" → "Web Service"
4. Connect your GitHub repo
5. Set:
   - **Name**: ytdownloader
   - **Runtime**: Docker
   - **Region**: us-east
   - **Plan**: Free (if eligible)
6. Click Deploy

Your app will be live at `https://ytdownloader-xxxxx.onrender.com`

---

## 2. **Railway.app** (Free $5/month credit)

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub"
4. Select your repo
5. Railway auto-detects Dockerfile and deploys
6. Domain auto-assigned

Your app will be live at `https://ytdownloader-prod-xxxx.railway.app`

---

## 3. **Fly.io** (Free tier with limited resources)

1. Install [Fly CLI](https://fly.io/docs/getting-started/installing-flyctl/)
2. Run from project root:
   ```bash
   flyctl auth login
   flyctl launch
   flyctl deploy
   ```
3. Done - your app is live

---

## Local Docker Testing

Before deploying, test locally:

```bash
# Build image
docker build -t ytdownloader .

# Run container
docker run -p 3000:3000 ytdownloader

# Open browser to http://localhost:3000
```

---

## Important Notes

- App requires `yt-dlp` and `ffmpeg` (both included in Dockerfile)
- YouTube may block requests - you may need to add browser cookies to `yt-dlp`
- API routes execute system commands (analyze, download)
- Free tier services may have CPU/memory limits

---

## GitHub Setup (Required for Render/Railway)

```bash
git init
git add .
git commit -m "Initial commit: ytdownloader app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ytdownloader.git
git push -u origin main
```

Then follow the steps above for your chosen platform.
