// import ytdlp from "ytdlp-nodejs";
import fs from "fs";
import ytdl from "@distube/ytdl-core";
import type { IncomingMessage } from "http";
import ytmux from "./ytmux.js";
import { resolve } from "path";
import cp from "child_process";
import ffmpeg from "ffmpeg-static";

export class Downloader {
  link: string;
  constructor(link: string) {
    this.link = link;
  }

  async downloadVideo(options: ytdl.getInfoOptions = {}) {
    const self = this;
    return new Promise(async (resolve) => {
      ytdl
        .getInfo("https://www.youtube.com/watch?v=ucZl6vQ_8Uo")
        .then((info) => {
          // ytdl
          //   .downloadFromInfo(info, { quality: "highestvideo", ...options })
          //   .pipe(fs.createWriteStream("out/video.mp4"));
          // ytdl
          //   .downloadFromInfo(info, { quality: "highestaudio", ...options })
          //   .pipe(fs.createWriteStream("out/audio.mp4"));

          const ffmpegProcess = cp.spawn(
            ffmpeg!,
            [
              // supress non-crucial messages
              // '-loglevel', '8', '-hide_banner',
              "-fflags",
              "+igndts",
              // input audio and video by pipe
              "-i",
              "out/video.mp4",
              "-i",
              "out/audio.mp4",
              "-c:v",
              "copy",
              "-c:a",
              "aac",
              // output mp4 and pipe
              "-f",
              "matroska",
              "pipe:3",
              // "out/full.mp4",
            ],
            // [
            //   // "-fflags",
            //   // "+igndts",
            //   "-i",
            //   "out/video.mp4",
            //   "-i",
            //   "out/audio.mp4",
            //   "-c:v",
            //   "copy",
            //   "-c:a",
            //   "aac",
            //   "out/full.mp4",
            //   // "-f",
            //   // "matroska",
            //   // "pipe:5",
            // ],
            // ["-i", "pipe:3", "out/audio.mp3"],
            {
              // no popup window for Windows users
              windowsHide: true,
              stdio: [
                // silence stdin/out, forward stderr,
                "inherit",
                "pipe",
                "pipe",
                // and pipe audio, video, output
                "pipe",
                // "pipe",
                // "pipe",
              ],
            }
          );

          // fs.createReadStream("out/audio.mp4").pipe(ffmpegProcess.stdio[3]);
          // ytdl
          //   .downloadFromInfo(info, { quality: "highestaudio", ...options })
          //   .pipe(ffmpegProcess.stdio[3]);
          // ytdl
          //   .downloadFromInfo(info, { quality: "highestvideo", ...options })
          //   .pipe(ffmpegProcess.stdio[4]);
          ffmpegProcess.stdio[1]?.pipe(fs.createWriteStream("out/stdout.log"));
          ffmpegProcess.stdio[2]?.pipe(fs.createWriteStream("out/stderr.log"));
          ffmpegProcess.stdio[3]?.pipe(
            fs.createWriteStream("out/pipeFull.mp4")
          );
          ffmpegProcess.stdio[3]?.on("finish", () => console.log("FINISH!"));

          // ffmpegProcess.stdio[5]?.pipe(fs.createWriteStream("out/final.mp4"));
          // fs.createReadStream("out/video.mp4").pipe(ffmpegProcess.stdio[4]);
          // ffmpegProcess.stdio[5].pipe(fs.createWriteStream("out/full.mp4"));
        });

      // const stream = ytmux("https://youtu.be/knfrxj0T5NY?si=2ez2aJsNloR1HrxZ");
      // stream.pipe(fs.createWriteStream("out/v.mp4"));
    });
    // console.log(r);
    // const r = ytmux(this.link);
  }

  async __downloadVideo() {
    const videoProgress = ytdl(this.link);
    const path = "./out/video.mp4";
    videoProgress.pipe(fs.createWriteStream(path));
    return new Promise((resolve) => {
      videoProgress.on("response", (res: IncomingMessage) => {
        console.log(res);
        console.log("Done?");
        // resolve(res);
      });
    });
  }
  _downloadVideo() {
    return new Promise(async (resolve) => {
      const outputFilePath = `video.mp4`;

      const videoStream = ytdl(this.link, {
        quality: "highestvideo",
        filter: "videoandaudio",
      });
      const fileStream = fs.createWriteStream(outputFilePath);

      let downloadedBytes = 0;
      let totalBytes = 0;

      videoStream.on("response", (response) => {
        totalBytes = parseInt(response.headers["content-length"], 10);
      });

      videoStream.on("data", (chunk) => {
        downloadedBytes += chunk.length;
        const progress = (downloadedBytes / totalBytes) * 100;
        console.log(`Progress: ${progress.toFixed(2)}%`);
      });

      videoStream.pipe(fileStream);

      fileStream.on("finish", () => {
        console.log("Finish?");
      });

      fileStream.on("error", (error) => {
        console.error("Error:", error);
      });
    });
  }
}
