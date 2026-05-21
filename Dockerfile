FROM node:20-slim

WORKDIR /app

# ---- Server dependencies ----
COPY server/package*.json ./server/
RUN cd server && npm install --production

# ---- Landing page (Vue 3 + Vite) ----
COPY landing/package*.json ./landing/
RUN cd landing && npm install

COPY landing/ ./landing/
RUN cd landing && npm run build && rm -rf node_modules

# ---- Server source ----
COPY server/ ./server/

# Ensure data directory exists for sql.js persistence
# (actual persistent data lives on a Railway Volume mounted here)
RUN mkdir -p /app/server/data

EXPOSE 3002

CMD ["node", "server/index.js"]
