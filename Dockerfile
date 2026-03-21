FROM node:20-bookworm-slim

# Install Playwright dependencies (Chromium)
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libxshmfence1 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci --production=false

# Install Playwright Chromium browser
RUN npx playwright install chromium

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Create required directories
RUN mkdir -p /app/data /app/workspace/generated /app/test-results

# Expose port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "--import", "tsx", "server.ts"]
