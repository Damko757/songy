import { Downloader } from "../src/Downloader.ts";
import fs from "fs";
import path, { resolve } from "path";
import { beforeAll, describe, expect, it } from "@jest/globals";
import { sha256 } from "sha.js";
import ytdl from "@distube/ytdl-core";
import readline from "readline";

const DEBUG_SAVE = true;
beforeAll(() => {
  const files = fs.readdirSync("./out");
  for (const file of files) {
    if (file.endsWith(".jpg")) continue;
    fs.unlinkSync(path.join("./out", file));
  }
});

describe("Audio only", () => {
  for (const link of ["33fPaNWvyzE", "sduDiIGqvfQ"]) {
    it("Audio only", async () => {
      const downloader = new Downloader(
        link //https://www.youtube.com/watch?v=
      );
      const file = DEBUG_SAVE
        ? fs.createWriteStream(`out/audio-${link}.mp3`)
        : undefined;
      const hash = new sha256();

      const audioStream = await downloader.audioStream();
      audioStream.on("data", (chunk) => {
        hash.update(chunk);
        file?.write(chunk); // Debug save
      });
      audioStream.on("progress", (chunks, downloaded, total) => {
        readline.clearLine(process.stderr, 1);
        process.stdout.write(((downloaded / total) * 100).toFixed(3) + "%");
        readline.cursorTo(process.stderr, 0);
      });

      return new Promise<void>((resolve, reject) => {
        audioStream.on("end", () => {
          file?.end();
          file?.close();

          expect(hash).toMatchSnapshot();

          resolve();
        });

        audioStream.on("error", (e) => {
          reject(e);
        });
      });
    }, 10_000); // 10 s
  }
});

describe("Video only", () => {
  const url = "https://www.youtube.com/watch?v=aqz-KE-bpKQ"; // Blender official film
  for (const res of [144, 240, 360, 480, 720, 1080, 1440, 2160]) {
    // Testing all video files
    it(
      `${res}p`,
      async () => {
        const downloader = new Downloader(url);
        const format = (await ytdl.getInfo(url)).formats.find(
          (f) => f.height === res && f.hasVideo && !f.hasAudio
        ); // Filtering resolution
        expect(format).toBeDefined();

        const videoStream = await downloader.videoStream({
          format: format,
        });

        const hash = new sha256();

        const file = DEBUG_SAVE
          ? fs.createWriteStream(`out/video-${res}p.mp4`)
          : undefined;
        videoStream.on("data", (chunk) => {
          file?.write(chunk); // Writing chunk (if needed)
          hash.update(chunk); // Snapshot hash
        });

        return new Promise<void>((resolve, reject) => {
          videoStream.on("end", () => {
            file?.end();
            file?.close();

            expect(hash).toMatchSnapshot();
            resolve();
          });

          videoStream.on("error", (e) => {
            reject(e); // Not passing, fail
          });
        });
      },
      res * 100
    ); // 100 ms per pixel of height
  }
});

describe("Combined", () => {
  // it("Video/Audio sync", async () => {
  //   const downloader = new Downloader(
  //     "https://youtu.be/LXb3EKWsInQ?si=kE2iqF0famt_njjk"
  //   );
  //   const audioStream = downloader.videoStream();
  //   const buf: Uint8Array[] = [];
  //   audioStream.on("data", (chunk) => {
  //     buf.push(chunk);
  //   });
  //   await new Promise((resolve, reject) => {
  //     audioStream.on("end", () => {
  //       if (DEBUG_SAVE) fs.writeFileSync("out/video.mp4", Buffer.concat(buf));
  //       expect(
  //         new sha256().update(Buffer.concat(buf).join(""))
  //       ).toMatchSnapshot();
  //       resolve(true);
  //     });
  //     audioStream.on("error", (e) => {
  //       reject(e);
  //     });
  //   });
  // }, 10_0000);
});
