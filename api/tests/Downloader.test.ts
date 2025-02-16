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
        fs.unlink(path.join("./out", file), (err) => {
          if (err) throw err;
        });
      }
    });
  });

  describe("MP3", () => {
    it.only(
      "Audio only",
      async () => {
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
      },
      {}
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
