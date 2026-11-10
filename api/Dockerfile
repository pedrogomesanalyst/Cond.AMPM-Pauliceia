FROM node:22-alpine
WORKDIR /srv/api
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY . .
ENV NODE_ENV=production
EXPOSE 10000
CMD ["node", "src/server.js"]
