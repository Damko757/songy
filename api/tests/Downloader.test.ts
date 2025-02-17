import { expect, describe, it, beforeEach } from "bun:test";
import { Downloader } from "../src/Downloader/Downloader";
import fs from "fs";
import path, { resolve } from "path";
import sha256 from "crypto-js/sha256";

describe("FFMPEG", () => {
  beforeEach(() => {
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

  describe.only("MP3", () => {
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
          expect(sha256(Buffer.concat(buf).join(""))).toMatchSnapshot();
          fs.writeFileSync("out/duck.mp3", Buffer.concat(buf));
          resolve(true);
        });

        audioStream.on("error", (e) => {
          reject(e);
        });
      });
    });
    it.only(
      "Audio with Metadata",
      async () => {
        const downloader = new Downloader("sduDiIGqvfQ");
        const metas = await downloader.metadator.metaDatas();
        const audioStream = downloader.audioStream({
          metadata: metas.spotify?.[0] ?? {},
          bitrate: 320,
        });

        const buf: Uint8Array[] = [];
        audioStream.on("data", (chunk) => {
          buf.push(chunk);
        });

        await new Promise((resolve, reject) => {
          audioStream.on("end", () => {
            expect(sha256(Buffer.concat(buf).join(""))).toMatchSnapshot();
            fs.writeFileSync("out/carpet.mp3", Buffer.concat(buf));
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
        const downloader = new Downloader(
          "33fPaNWvyzE" //https://www.youtube.com/watch?v=
        );
        await downloader.streamVideo();
      },
      { timeout: 50_000_000 }
    );
  });
});
