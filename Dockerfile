FROM node:20-slim

# Install system dependencies
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg ca-certificates curl --no-install-recommends && \
    python3 -m pip install --break-system-packages --no-cache-dir yt-dlp fastapi uvicorn pydantic requests cryptography && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package info
COPY package*.json ./

# Install dependencies
ENV DOCKER_BUILD=1
RUN npm install

# Copy source code
COPY . .

# Create the bin/linux directory so Next.js outputFileTracing doesn't crash during build
RUN mkdir -p bin/linux

# Build Next.js with telemetry disabled to save RAM
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Start the application
CMD ["npm", "start"]
