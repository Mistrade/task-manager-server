FROM node:16.18.0

WORKDIR /app

COPY package.json /app
# COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 9090

CMD ["npm", "run", "dev"]