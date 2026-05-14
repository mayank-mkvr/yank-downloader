FROM node:20-slim

# Install system dependencies and yt-dlp
RUN apt-get update \
  && apt-get install -y python3 python3-pip ffmpeg ca-certificates --no-install-recommends \
  && python3 -m pip install --no-cache-dir yt-dlp \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . ./
RUN npm run build

EXPOSE 3000
ENV PORT=3000

CMD ["npm", "start"]
