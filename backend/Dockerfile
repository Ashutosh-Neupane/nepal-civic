FROM node:20-bookworm-slim

ENV NODE_ENV=production \
    LANG=C.UTF-8 \
    TZ=Asia/Kathmandu

WORKDIR /srv/app
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY . .

EXPOSE 3000
CMD ["sh", "-c", "npm run migrate up && npm start"]
