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

# Docker asks the container "are you actually alive?" on this timer, and restarts or
# marks it unhealthy when it stops answering.
#
# Two deliberate choices here:
#   1. node's built-in fetch, NOT curl. This is a slim image and it ships no curl, so a
#      curl-based check can never pass and the container reports unhealthy forever.
#   2. /api/health/live, NOT /api/health. The "live" one is shallow: it only asks whether
#      the process is up. The other deep-pings MySQL, so a brief database blip would make
#      Docker restart a perfectly healthy app. The deep check belongs after deployment.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
CMD node -e "fetch('http://127.0.0.1:3000/api/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node","src/server.js"]
