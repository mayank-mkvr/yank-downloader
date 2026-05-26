FROM node:20-slim

# Install system dependencies
# - ffmpeg: required for merging audio/video
# - python3/pip: required for yt-dlp installation
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg ca-certificates curl --no-install-recommends && \
    # Install yt-dlp globally
    python3 -m pip install --break-system-packages --no-cache-dir yt-dlp fastapi uvicorn pydantic requests cryptography && \
    # Cleanup to keep image small
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package info
COPY package*.json ./

# Install dependencies, bypassing the postinstall binary downloader inside Docker
ENV DOCKER_BUILD=1
RUN npm ci

# Copy source code
COPY . .

# Build Next.js
ENV NODE_ENV=production
RUN npm run build

# Start the application
CMD ["npm", "start"]
