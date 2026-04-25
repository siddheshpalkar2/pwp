FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p /app/database

ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
