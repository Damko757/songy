import ffmpeg from "fluent-ffmpeg";
import { PassThrough, Readable, Writable } from "stream";
import fs from "fs";
import cp from "child_process";
import ffmpegPath from "ffmpeg-static";
import ytdl, { type downloadOptions } from "@distube/ytdl-core";

export class Downloader {
  link: string;

  static supportedExtensions: Record<"audio" | "video", string[]> = {
    audio: ["mp3"],
    video: ["mp4"],
  };

  constructor(link: string) {
    this.link = link;
  }

  /**
   * Validates Youtube URL/video ID
   * @returns bool
   */
  isValid() {
    return this.link.includes("?")
      ? ytdl.validateURL(this.link)
      : ytdl.validateID(this.link);
  }

  /**
   * Streams audio only from youtube
   * @param options
   * @returns PassThrough stream with audio stream
   */
  audioStream(options: ytdl.downloadOptions & { bitrate?: number } = {}) {
    const self = this;
    const outStream = new PassThrough();
    return outStream;

    // this.metadator
    //   .rawMetaData()
    //   .then((info) => {
    //     const readable = ytdl.downloadFromInfo(info, {
    //       quality: options.quality ?? "highestaudio",
    //       filter: "audio",
    //       ...options,
    //     });

    //     ffmpeg()
    //       .input(readable)
    //       .audioBitrate(options.bitrate ?? 320)
    //       .format("mp3")
    //       .pipe(outStream);
    //   })
    //   .catch((e) => {
    //     outStream.emit("error", e);
    //   });

    // return outStream;
  }

  /**
   * Streams video + audio from youtube
   * @param options
   * @returns PassThrough stream with video stream
   */
  videoStream(
    options: downloadOptions & {
      bitrate?: number;
      videoQuality?: ytdl.chooseFormatOptions["quality"];
      audioQuality?: ytdl.chooseFormatOptions["quality"];
    } = {}
  ) {
    const self = this;
    const outStream = new PassThrough();

    ytdl
      .getInfo(this.link)
      .then((info) => {
        // ytdl.downloadFromInfo(info, {
        //   quality: options.audioQuality ?? "highestaudio",
        //   filter: "audio",
        //   ...options,
        // });
        const stream = ytdl.downloadFromInfo(info, {
          quality: "highestvideo",
          // filter: "video",
          ...options,
        });
        stream.on("close", (...args) => outStream.emit("close", ...args));
        stream.on("finish", (...args) => outStream.emit("finish", ...args));
        stream.on("end", (...args) => outStream.emit("end", ...args));
        stream.on("progress", (...args) => outStream.emit("progress", ...args));
        stream.on("info", (...args) => outStream.emit("info", ...args));
        stream.pipe(outStream);

        // Promise.all([audioStreamPromise, videoStreamPromise])
        //   .then(([audioStream, videoStream]) => {
        //     const audioReadable = readableStreamToReadable(audioStream);
        //     const videoReadable = readableStreamToReadable(videoStream);

        //     // audioReadable.pipe(fs.createWriteStream("out/sound.mp4"));
        //     // videoReadable.pipe(fs.createWriteStream("out/vid.mp4"));
        //     // videoReadable.on("end", () => outStream.end());

        //     const ffmpegProcess = cp.spawn(
        //       ffmpegPath!,
        //       [
        //         // supress non-crucial messages
        //         "-loglevel",
        //         "8",
        //         "-hide_banner",
        //         "-fflags",
        //         "+igndts",
        //         // input audio and video by pipe
        //         "-i",
        //         "pipe:3",
        //         "-i",
        //         "pipe:4",
        //         // map audio and video correspondingly
        //         "-map",
        //         "0:a",
        //         "-map",
        //         "1:v",
        //         // no need to change the codec
        //         "-c",
        //         "copy",
        //         // output mp4 and pipe
        //         "-f",
        //         "matroska",
        //         "pipe:5",
        //       ],
        //       {
        //         // no popup window for Windows users
        //         windowsHide: true,
        //         stdio: [
        //           // silence stdin/out, forward stderr,
        //           "inherit",
        //           "inherit",
        //           "inherit",
        //           // and pipe audio, video, output
        //           "pipe",
        //           "pipe",
        //           "pipe",
        //         ],
        //       }
        //     );
        //     audioReadable.pipe(ffmpegProcess.stdio[3] as Writable);
        //     videoReadable.pipe(ffmpegProcess.stdio[4] as Writable);

        //     (ffmpegProcess.stdio as Readable[])[5].pipe(outStream);
        //   })
        //   .catch((e) => {
        //     console.error(e);
        //     outStream.emit("error", e);
        //   });
      })
      .catch((e) => {
        outStream.emit("error", e);
      });

    return outStream;
  }
}
