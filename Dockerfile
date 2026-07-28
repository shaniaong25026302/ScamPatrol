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

# Docker asks the container "are you actually alive?" on this timer.
# Uses node's built-in fetch, NOT curl: this is a slim image and ships no curl, so a
# curl-based check can never pass and the container reports unhealthy forever.
# Points at "/" for now. Switch to /api/health/live once that endpoint exists AND is
# added to the guest allow-list in src/server.js, otherwise it answers 401.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node","src/server.js"]
