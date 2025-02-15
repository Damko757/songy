import { expect, describe, it, beforeEach } from "bun:test";
import { Downloader } from "../src/Downloader/Downloader";
import fs from "fs";
import path from "path";

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
        const downloader = new Downloader(
          "33fPaNWvyzE" //https://www.youtube.com/watch?v=
        );
        await downloader.downloadAudio();
      },
      { timeout: 50_000_000 }
    );
  });

  describe("MP4", () => {
    it.only(
      "Video/Audio sync",
      async () => {
        const downloader = new Downloader(
          "33fPaNWvyzE" //https://www.youtube.com/watch?v=
        );
        await downloader.downloadVideo();
      },
      { timeout: 50_000_000 }
    );
  });
});
