# <Nivi Start>
FROM node:22-bookworm-slim

WORKDIR /app

# Create the unprivileged user FIRST, so everything copied below can be owned by it.
# Order matters here: if the user is created last, /app stays owned by root and the app
# runs without permission to write its own data files.
RUN addgroup --system appgroup && adduser --system appuser --ingroup appgroup

COPY --chown=appuser:appgroup package*.json ./

RUN npm ci --omit=dev

COPY --chown=appuser:appgroup src src
COPY --chown=appuser:appgroup views views
COPY --chown=appuser:appgroup public public
COPY --chown=appuser:appgroup db db
COPY --chown=appuser:appgroup middleware middleware

# npm ci ran as root, so node_modules is root-owned. Hand the whole tree over.
RUN chown -R appuser:appgroup /app

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

# Drop privileges for everything from here on. Anything that escapes the application is
# confined to an unprivileged account rather than root inside the container.
USER appuser

CMD ["node","src/server.js"]
# <Nivi End>
