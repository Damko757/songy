// import ytdlp from "ytdlp-nodejs";
import fs from "fs";
import type { IncomingMessage } from "http";
import ytmux from "./ytmux.js";
import { resolve } from "path";
import cp from "child_process";
// import internal, { PassThrough, Stream } from "stream";
import YtdlCore from "@ybd-project/ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import { error } from "console";
import { Readable } from "stream";
import { stream } from "ytdlp-nodejs";

export class Downloader {
  link: string;
  constructor(link: string) {
    this.link = link;
  }

  /**
   * Creates stream with correct event triggering (see https://github.com/fent/node-ytdl-core/issues/1287)
   * @param ytdlStream Invalid stream, e.g. ytdl.downloadFromInfo
   */
  private createStream(
    info: ytdl.videoInfo,
    quality: ytdl.chooseFormatOptions["quality"],
    options: ytdl.getInfoOptions = {}
  ) {
    const format = ytdl.chooseFormat(info.formats, { quality: quality });

    const stream = new PassThrough();

    return stream;
  }

  private async getStream(info: ytdl.videoInfo, options: ytdl.getInfoOptions) {
    return new Promise<Buffer<ArrayBuffer>>((resolve) => {
      const buffer: Uint8Array[] = [];
      ytdl
        .downloadFromInfo(info, { quality: "highestaudio" })
        .on("data", (d) => {
          buffer.push(d);
          console.log(buffer.length);
        })
        .on("error", (e) => console.error(e))
        .on("pause", () => console.log("pause"))
        .on("resume", () => console.log("resume"))
        .on("progress", (...args) => console.log(...args))
        .on("close", () => console.log("CLOSE"))
        .on("end", () => {
          console.log("END");
          resolve(Buffer.concat(buffer));
        });
    });
  }

  async downloadVideo(options: object = {}) {
    const self = this;
    return new Promise(async (resolve, reject) => {
      const ytdl = new YtdlCore({
        logDisplay: ["debug", "error", "info", "success", "warning"],
        clients: [
          "web",
          "mweb",
          "webCreator",
          "android",
          "ios",
          "tv",
          "tvEmbedded",
        ],
        quality: "highestaudio",
      });

      ytdl
        .getFullInfo(this.link)
        .then((info) => {
          ytdl
            .downloadFromInfo(info)
            // .download(this.link)
            .then((stream) => {
              const reader = stream.getReader();
              ffmpeg()
                .input(
                  new Readable({
                    async read() {
                      // Function to read the chunks asynchronously
                      const pushChunk = async () => {
                        try {
                          const { done, value } = await reader.read();

                          if (done) {
                            this.push(null); // No more data, signal end of stream
                          } else {
                            this.push(value); // Push the chunk of data to the Node.js stream
                            pushChunk(); // Continue reading
                          }
                        } catch (err) {
                          this.emit("error", err); // Handle any errors
                        }
                      };

                      pushChunk(); // Start reading the chunks
                    },
                  })
                )
                .audioBitrate(320)
                .format("mp3")
                .on("end", () => resolve(null))
                .on("error", (e) => resolve(e))
                .on("progress", (...args) => console.log(...args))
                .pipe(fs.createWriteStream("out/duck.mp3"));
              // const writeStream = fs.createWriteStream("out/duck.mp4");
              // stream.pipeTo(
              //   new WritableStream<Uint8Array>({
              //     write(chunk) {
              //       return new Promise<void>((resolve, reject) => {
              //         // Use fs.WriteStream's `write` method to write data to the file
              //         if (!writeStream.write(chunk)) {
              //           // If the internal buffer is full, wait for it to drain before writing more data
              //           writeStream.once("drain", resolve);
              //         } else {
              //           resolve();
              //         }
              //       });
              //     },
              //     close() {
              //       // End the write stream when the WritableStream is closed
              //       writeStream.end();
              //       console.log("END");
              //     },
              //     abort(err) {
              //       // Handle any errors
              //       writeStream.destroy(err);
              //     },
              //   })
              // );
              // .pipe(fs.createWriteStream("out/test.mp4"));
              // ffmpeg()
              //   .input(stream as unknown as Readable)
              //   .audioBitrate(320)
              //   // .save(`${__dirname}/${ID}.mp3`)
              //   .on("progress", (p) => {
              //     // readline.cursorTo(process.stdout, 0);
              //     console.log(`${p.targetSize}kb downloaded`);
              //   })
              //   .on("end", () => {
              //     console.log(`\nDONE`);
              //   })
              //   .pipe(fs.createWriteStream("out/s.mp3"));
            })
            .catch((error) => {
              console.error(error);
              reject();
            });
        })
        .catch((e) => {
          console.log("COULD NOT FETCH INFO");
          reject(e);
        });
      // ---
      return;
      ytdl
        .getFullInfo("https://www.youtube.com/watch?v=CaP12QFH5Qg")
        .then(async (info) => {
          // fs.writeFileSync("out/info.json", JSON.stringify(info));
          // resolve(null);
          // return;

          // const audioStream = self.createStream(info, "highestaudio");

          const ffmpegProcessToMP3 = cp.spawn(
            ffmpeg!,
            ["-i", "pipe:3", "-c:v", "copy", "-ab", "320k", "out/s.mp3"],
            {
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

          ffmpegProcessToMP3.stdio[1]?.pipe(
            fs.createWriteStream("out/stdout.log")
          );
          ffmpegProcessToMP3.stdio[2]?.pipe(
            fs.createWriteStream("out/stderr.log")
          );
          audioStream.pipe(ffmpegProcessToMP3.stdio[3]);
          // ffmpegProcessToMP3.stdio[4]?.pipe(
          //   fs.createWriteStream("out/stderr.log")
          // );

          // ytdl
          //   .downloadFromInfo(info, { quality: "highestaudio", ...options })
          //   .pipe(ffmpegProcessToMP3.stdio[3]);

          // LIB is broken, will need FORK (https://github.com/fent/node-ytdl-core/issues/1287)

          // (false
          //   ? ytdl.downloadFromInfo(info, { quality: "highestaudio" })
          //   : Stream.Readable.from(await self.getStream(info, options))
          // ).pipe(ffmpegProcessToMP3.stdio[3]);
          // ffmpegProcessToMP3.stdio[4]?.pipe(
          //   fs.createWriteStream("out/sound.mp3")
          // );
          // ffmpegProcessToMP3.on("exit", (...args) => {
          //   console.error("EXIT?");
          //   console.error(...args);
          // });
          ffmpegProcessToMP3.on("error", (...args) => {
            console.error(...args);
          });
          // ffmpegProcessToMP3.on("message", (...args) => {
          //   console.info("Mess!");
          //   console.log(...args);
          // });
          ffmpegProcessToMP3.on("exit", () => {
            console.log("FFMPEG EXIT!");
            resolve(null);
          });
          ffmpegProcessToMP3.on("close", (...args) => {
            console.log("FFMPEG Closing!");
            console.error(...args);
            reject(args[0]);
          });
        });
    });
  }

  async ____downloadVideo() {
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
    ffmpegProcess.stdio[3]?.pipe(fs.createWriteStream("out/pipeFull.mp4"));
    ffmpegProcess.stdio[3]?.on("finish", () => console.log("FINISH!"));
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
