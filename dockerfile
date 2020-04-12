FROM node:11

WORKDIR /app
COPY package*.json ./
COPY config ./config
COPY css ./css
COPY models ./models
COPY routes ./routes
COPY views ./views
COPY Server.js ./
COPY .env ./

RUN npm install --only=production

EXPOSE 5000
CMD [ "node", "Server.js" ]
