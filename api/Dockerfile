FROM oven/bun:latest
WORKDIR /usr/src/app

COPY ./package.json ./

RUN bun install
RUN apt update && apt install -y ffmpeg

USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "src/index.ts" ]