FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libcairo2 \
    libfontconfig1 \
    libfreetype6 \
    libgif7 \
    libharfbuzz0b \
    libjpeg62-turbo \
    libpango-1.0-0 \
    libpng16-16 \
    libwebp7 \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["npm", "start"]
