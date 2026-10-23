FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
RUN mkdir -p /var/data && chown node:node /var/data /app
USER node
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV DATABASE_PATH=/var/data/bank.sqlite
EXPOSE 3000
CMD ["npm", "start"]
