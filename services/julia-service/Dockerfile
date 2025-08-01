FROM node:18-alpine
RUN apk add --no-cache julia
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3002
CMD ["node", "server.js"]