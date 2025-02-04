# build stage
FROM oven/bun:latest as build-stage
WORKDIR /app
COPY package*.json ./
RUN bun install
COPY . .
RUN bun run build

# production stage
FROM nginx:stable-alpine as production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
# COPY nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]