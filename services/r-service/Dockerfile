FROM node:18-alpine
RUN apk add --no-cache R R-dev
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]