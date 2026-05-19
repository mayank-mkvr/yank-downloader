FROM node:20-slim

# Install system dependencies and yt-dlp
RUN apt-get update \
  && apt-get install -y python3 python3-pip ffmpeg ca-certificates --no-install-recommends \
  && python3 -m pip install --break-system-packages --no-cache-dir yt-dlp fastapi uvicorn pydantic requests cryptography \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
# Install all dependencies (including devDependencies) so next build compiles CSS, Tailwind, TypeScript, etc.
RUN npm install

COPY . ./
RUN npm run build

EXPOSE 3000
ENV PORT=3000

CMD ["npm", "start"]
