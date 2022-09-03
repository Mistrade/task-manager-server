FROM node:16.17.0

WORKDIR /app

COPY package.json /app

RUN npm install

COPY . .

EXPOSE 9090

CMD ["npm", "run", "dev"]