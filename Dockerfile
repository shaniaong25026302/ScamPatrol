FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ENV NODE_ENV=production

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
CMD node -e "process.exit(0)"

CMD ["npm", "start"]