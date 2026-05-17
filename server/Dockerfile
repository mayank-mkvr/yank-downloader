FROM node:20-slim

RUN apt-get update \
  && apt-get install -y python3 python3-pip ffmpeg ca-certificates --no-install-recommends \
  && python3 -m pip install --break-system-packages --no-cache-dir yt-dlp fastapi uvicorn pydantic requests cryptography \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/backend

COPY package*.json ./
RUN npm install --production

COPY . ./
RUN npm run build

EXPOSE 4000
ENV PORT=4000
CMD ["npm", "run", "pm2"]
