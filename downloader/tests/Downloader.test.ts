import { Downloader } from "../src/Downloader.ts";
import fs from "fs";
import path, { resolve } from "path";
import { beforeAll, describe, expect, it } from "@jest/globals";
import { sha256 } from "sha.js";

const DEBUG_SAVE = true;
describe("FFMPEG", () => {
  beforeAll(() => {
    fs.readdir("./out", (err, files) => {
      if (err) throw err;
      // for (const file of files) {
      //   if (file.endsWith(".jpg")) continue;
      //   fs.unlink(path.join("./out", file), (err) => {
      //     if (err) throw err;
      //   });
      // }
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
          expect(
            new sha256().update(Buffer.concat(buf).join(""))
          ).toMatchSnapshot();
          resolve(true);
        });

        audioStream.on("error", (e) => {
          reject(e);
        });
      });
    });
    it("Another audio", async () => {
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
          expect(
            new sha256().update(Buffer.concat(buf).join(""))
          ).toMatchSnapshot();
          resolve(true);
        });

        audioStream.on("error", (e) => {
          reject(e);
        });
      });
    }, 10_000);
  });

  describe.only("Video only", () => {
    it("Simple video", async () => {
      const downloader = new Downloader(
        "https://www.youtube.com/watch?v=FTQbiNvZqaY"
      );
      const videoStream = downloader.videoStream();
      console.log(videoStream);
      const buf: Uint8Array[] = [];
      const file = fs.createWriteStream("out/simple.mp4");
      videoStream.on("data", (chunk) => {
        buf.push(chunk);
        if (DEBUG_SAVE) file.write(chunk);
      });

      return new Promise<void>((resolve, reject) => {
        videoStream.on("end", () => {
          console.log("END!");
          file.end();

          // expect(
          //   new sha256().update(Buffer.concat(buf).join(""))
          // ).toMatchSnapshot();
          resolve();
        });

        videoStream.on("error", (e) => {
          reject(e);
        });
      });
    }, 1_000_000);
  });

  describe("MP4", () => {
    it("Video/Audio sync", async () => {
      const downloader = new Downloader(
        "https://youtu.be/LXb3EKWsInQ?si=kE2iqF0famt_njjk"
      );
      const audioStream = downloader.videoStream();
      const buf: Uint8Array[] = [];
      audioStream.on("data", (chunk) => {
        buf.push(chunk);
      });

      await new Promise((resolve, reject) => {
        audioStream.on("end", () => {
          if (DEBUG_SAVE) fs.writeFileSync("out/video.mp4", Buffer.concat(buf));
          expect(
            new sha256().update(Buffer.concat(buf).join(""))
          ).toMatchSnapshot();
          resolve(true);
        });

        audioStream.on("error", (e) => {
          reject(e);
        });
      });
    }, 10_0000);
  });
});
