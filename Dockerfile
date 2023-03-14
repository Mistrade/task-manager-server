FROM node:16.18.0

WORKDIR /app

COPY package.json /app

RUN npm install

COPY . .
