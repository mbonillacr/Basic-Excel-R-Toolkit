FROM python:3.11-alpine
RUN apk add --no-cache nodejs npm
RUN pip install pandas numpy
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3006
CMD ["node", "server.js"]