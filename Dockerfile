# Fallback for Docker-based deploys (Zeabur also supports plain Node deploys
# via zbpack.json — use whichever fits; both run `node server.js`).
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server.js ./
COPY api ./api
EXPOSE 3000
CMD ["node", "server.js"]
