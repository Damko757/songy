import { Downloader } from "../src/Downloader.js";
import fs from "fs";
import path, { resolve } from "path";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { sha256 } from "sha.js";
import ytdl from "@distube/ytdl-core";
import readline from "readline";
import tmp from "tmp";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEBUG_SAVE = true;
beforeAll(() => {
  Downloader.downloadDirectory = path.resolve(__dirname, "out");
  const files = fs.readdirSync(Downloader.downloadPath(""));
  for (const file of files) {
    if (file.endsWith(".jpg")) continue;
    fs.unlinkSync(Downloader.downloadPath(file));
  }
});
afterAll(() => {
  // fs.rmSync(Downloader.downloadPath(""), { recursive: true });
});

describe("Audio only", () => {
  for (const link of ["33fPaNWvyzE", "sduDiIGqvfQ"]) {
    it("Audio only", async () => {
      const downloader = new Downloader(
        link //https://www.youtube.com/watch?v=
      );
      const file = DEBUG_SAVE
        ? fs.createWriteStream(Downloader.downloadPath(`audio-${link}`))
        : undefined;
      const hash = new sha256();

      const audioStream = await downloader.audioStream();
      audioStream.on("data", (chunk) => {
        hash.update(chunk);
        file?.write(chunk); // Debug save
      });
      // audioStream.on("progress", (chunks, downloaded, total) => {
      //   readline.clearLine(process.stderr, 1);
      //   process.stdout.write(((downloaded / total) * 100).toFixed(3) + "%");
      //   readline.cursorTo(process.stderr, 0);
      // });

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

const blenderFilm = "https://www.youtube.com/watch?v=aqz-KE-bpKQ"; // Blender official film
describe("Video only", () => {
  for (const res of [144, 240, 360, 480, 720, 1080, 1440, 2160]) {
    // Testing all video files
    it(
      `${res}p`,
      async () => {
        const downloader = new Downloader(blenderFilm);
        const format = (await ytdl.getInfo(blenderFilm)).formats.find(
          (f) => f.height === res && f.hasVideo && !f.hasAudio
        ); // Filtering resolution
        expect(format).toBeDefined();

        const videoStream = await downloader.videoStream({
          format: format,
        });

        const hash = new sha256();

        const file = DEBUG_SAVE
          ? fs.createWriteStream(Downloader.downloadPath(`video-${res}p`))
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
  it("Video/Audio sync", async () => {
    expect.assertions(7);
    const videoHash = new sha256();
    const audioHash = new sha256();
    const combinedHash = new sha256();

    const downloader = new Downloader(
      "https://www.youtube.com/watch?v=ucZl6vQ_8Uo"
    );

    const videoFileName = DEBUG_SAVE
      ? Downloader.downloadPath("video-audio-sync-VIDEO")
      : tmp.fileSync().name;
    const videoFileStream = fs.createWriteStream(videoFileName);
    const audioFileName = DEBUG_SAVE
      ? Downloader.downloadPath("video-audio-sync-AUDIO")
      : tmp.fileSync().name;
    const audioFileStream = fs.createWriteStream(audioFileName);

    // Video stream test
    const videoStream = await downloader.videoStream({
      quality: "highestvideo",
    });
    videoStream
      .on("info", (_, format: ytdl.videoFormat) => {
        expect(format.hasVideo).toBeTruthy();
        expect(format.hasAudio).toBeFalsy();
        expect(format.height).toBe(1080);
      })
      .on("data", (chunk) => {
        videoFileStream.write(chunk);
        videoHash.update(chunk);
      });
    await new Promise<void>((resolve) =>
      videoStream.on("end", () => {
        expect(videoHash).toMatchSnapshot();
        resolve();
      })
    );

    // Audio stream test
    const audioStream = await downloader.audioStream();
    audioStream
      .on("info", (_, format: ytdl.videoFormat) => {
        expect(format.hasAudio).toBeTruthy();
        expect(format.hasVideo).toBeFalsy();
      })
      .on("data", (chunk) => {
        audioFileStream.write(chunk);
        audioHash.update(chunk);
      });
    await new Promise<void>((resolve) =>
      audioStream.on("end", () => {
        expect(audioHash).toMatchSnapshot();
        resolve();
      })
    );

    const outFileName = DEBUG_SAVE
      ? Downloader.downloadPath("video-audio-sync")
      : tmp.fileSync().name;

    // Combination
    await downloader.createCombinedVideoAudio(
      videoFileName,
      audioFileName,
      outFileName
    );
  }, 30_000); // 30 s

  it(
    "4K Blender film",
    async () => {
      const downloader = new Downloader(blenderFilm);
      const info = await downloader.getInfo();
      const format4K = info.formats.find(
        (format) => !format.hasAudio && format.hasVideo && format.height == 2160
      );

      const videoFileName = tmp.fileSync().name;
      await downloader.saveStream(
        await downloader.videoStream({ format: format4K }),
        videoFileName
      );

      const audioFileName = tmp.fileSync().name;
      await downloader.saveStream(
        await downloader.audioStream(),
        audioFileName
      );

      const outFile = DEBUG_SAVE
        ? Downloader.downloadPath("blender-film")
        : tmp.fileSync().name;
      const hash = new sha256();

      await expect(
        downloader.createCombinedVideoAudio(
          videoFileName,
          audioFileName,
          outFile
        )
      ).resolves.toBeUndefined();

      const data = fs.readFileSync(outFile);
      expect(new sha256().update(data)).toMatchSnapshot(); // Checking final video
    },
    60_000 * 5 // 5 min
  );
});
