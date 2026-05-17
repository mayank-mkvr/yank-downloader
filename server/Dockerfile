FROM node:20-slim

RUN apt-get update \
  && apt-get install -y python3 python3-pip ffmpeg ca-certificates --no-install-recommends \
  && python3 -m pip install --no-cache-dir yt-dlp \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/backend

COPY package*.json ./
RUN npm install --production

COPY . ./
RUN npm run build

EXPOSE 4000
ENV PORT=4000
CMD ["npm", "run", "pm2"]
