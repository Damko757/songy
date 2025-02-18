import { expect, describe, it, beforeEach, beforeAll } from "bun:test";
import { Downloader } from "../src/Downloader/Downloader";
import fs from "fs";
import path, { resolve } from "path";
import sha256 from "crypto-js/sha256";

const DEBUG_SAVE = false;
describe("FFMPEG", () => {
  beforeAll(() => {
    fs.readdir("./out", (err, files) => {
      if (err) throw err;
      for (const file of files) {
        if (file.endsWith(".jpg")) continue;
        fs.unlink(path.join("./out", file), (err) => {
          if (err) throw err;
        });
      }
    });
  });

  describe("MP3", () => {
    it("Audio only", async () => {
      // expect.assertions(1);
      const downloader = new Downloader(
        "33fPaNWvyzE" //https://www.youtube.com/watch?v=
      );
      const audioStream = downloader.audioStream();
      const buf: Uint8Array[] = [];
      audioStream.on("data", (chunk) => {
        buf.push(chunk);
      });

      await new Promise((resolve, reject) => {
        audioStream.on("end", () => {
          if (DEBUG_SAVE) fs.writeFileSync("out/duck.mp3", Buffer.concat(buf));
          expect(sha256(Buffer.concat(buf).join(""))).toMatchSnapshot();
          resolve(true);
        });

        audioStream.on("error", (e) => {
          reject(e);
        });
      });
    });
    it(
      "Another audio",
      async () => {
        /**
         * Downloader does not automatically provide metadatas
         */
        const downloader = new Downloader("sduDiIGqvfQ");
        const audioStream = downloader.audioStream({
          bitrate: 320,
        });

        const buf: Uint8Array[] = [];
        audioStream.on("data", (chunk) => {
          buf.push(chunk);
        });

        await new Promise((resolve, reject) => {
          audioStream.on("end", () => {
            if (DEBUG_SAVE)
              fs.writeFileSync("out/carpet.mp3", Buffer.concat(buf));
            expect(sha256(Buffer.concat(buf).join(""))).toMatchSnapshot();
            resolve(true);
          });

          audioStream.on("error", (e) => {
            reject(e);
          });
        });
      },
      { timeout: 10_000 }
    );
  });

  describe("MP4", () => {
    it(
      "Video/Audio sync",
      async () => {
        const downloader = new Downloader("ucZl6vQ_8Uo");
        const audioStream = downloader.videoStream();
        const buf: Uint8Array[] = [];
        audioStream.on("data", (chunk) => {
          buf.push(chunk);
        });

        await new Promise((resolve, reject) => {
          audioStream.on("end", () => {
            if (DEBUG_SAVE)
              fs.writeFileSync("out/video.mp4", Buffer.concat(buf));
            expect(sha256(Buffer.concat(buf).join(""))).toMatchSnapshot();
            resolve(true);
          });

          audioStream.on("error", (e) => {
            reject(e);
          });
        });
      },
      {
        timeout: 10_000,
      }
    );
  });
});
