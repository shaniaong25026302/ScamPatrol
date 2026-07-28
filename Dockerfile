FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY src src
COPY views views
COPY public public
COPY db db
COPY middleware middleware

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
CMD curl -f http://localhost:3000/api/health/live || exit 1

CMD ["node","src/server.js"]