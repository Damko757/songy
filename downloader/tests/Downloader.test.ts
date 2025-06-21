import { Downloader } from "../src/Downloader.ts";
import fs from "fs";
import path, { resolve } from "path";
import { beforeAll, describe, expect, it } from "@jest/globals";
import { sha256 } from "sha.js";
import ytdl from "@distube/ytdl-core";

const DEBUG_SAVE = true;
beforeAll(() => {
  const files = fs.readdirSync("./out");
  // for (const file of files) {
  //   if (file.endsWith(".jpg")) continue;
  //   fs.unlinkSync(path.join("./out", file));
  // }
});

describe("Audio only", () => {
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
        if (DEBUG_SAVE) fs.writeFileSync("out/carpet.mp3", Buffer.concat(buf));
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

describe("Video only", () => {
  const url = "https://www.youtube.com/watch?v=aqz-KE-bpKQ"; // Blender official film
  for (const res of [144, 240, 360, 480, 720, 1080, 1440, 2160]) {
    // Testing all video files
    it(`${res}p`, async () => {
      const downloader = new Downloader(url);
      const format = (await ytdl.getInfo(url)).formats.find(
        (f) => f.height === res && f.hasVideo && !f.hasAudio
      );
      expect(format).toBeDefined();

      const videoStream = downloader.videoStream({
        format: format,
      });

      const buf: Uint8Array[] = [];
      const file = DEBUG_SAVE
        ? fs.createWriteStream(`out/${res}p.mp4`)
        : undefined;
      videoStream.on("data", (chunk) => {
        buf.push(chunk); // Saving chunk to buffer
        file?.write(chunk); // Writing chunk (if needed)
      });

      return new Promise<void>((resolve, reject) => {
        videoStream.on("end", () => {
          file?.end();

          expect(
            new sha256().update(Buffer.concat(buf).join(""))
          ).toMatchSnapshot();
          resolve();
        });

        videoStream.on("error", (e) => {
          reject(e);
        });
      });
    }, 10_000); // 10s
  }
});

describe("Combined", () => {
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
