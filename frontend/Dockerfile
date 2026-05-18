# pull the official base image
# LTS version, End-of-life: 2026-04-30
FROM node:20.17.0 AS builder
# set working direction
WORKDIR /app
# add `/app/node_modules/.bin` to $PATH
ENV PATH /app/node_modules/.bin:$PATH
# install application dependencies
COPY package.json ./
COPY package-lock.json ./
RUN npm i

# add app
COPY . ./

# build app
RUN npm run build

FROM nginx:stable-alpine

WORKDIR /

COPY --from=builder /app/build/. /var/www/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

CMD ["/bin/sh", "-c", "exec nginx -g 'daemon off;';"]
