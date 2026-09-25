FROM node:22-alpine

ENV NODE_ENV=production
ENV PORT=8080
WORKDIR /app

RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY public ./public
COPY src ./src

EXPOSE 8080
CMD ["node", "src/index.js"]
