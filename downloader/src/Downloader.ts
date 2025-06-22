import ffmpeg from "fluent-ffmpeg";
import { PassThrough, Readable, Writable } from "stream";
import fs from "fs";
import cp, { spawn } from "child_process";
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
   * Streams audio only
   * Original stream is converted via FFMPEG. Progress and info event are added as an extra
   * @param options
   * @returns PassThrough audio stream
   */
  audioStream(options: ytdl.downloadOptions & { bitrate?: number } = {}) {
    return new Promise<Readable>(async (resolve, reject) => {
      ytdl
        .getInfo(this.link)
        .then((info) => {
          const format =
            options.format ??
            ytdl.chooseFormat(info.formats, {
              quality: options.quality ?? "highestaudio",
              ...options,
            }); // Fetching format for FFMPEG

          const videoStream = ytdl.downloadFromInfo(info, {
            quality: options.quality ?? "highestaudio",
            filter: "audio",
            ...options,
          });

          const audioStream = new PassThrough();

          // Emitting Ytdl-core events
          videoStream.on("progress", (...args) =>
            audioStream.emit("progress", ...args)
          );
          videoStream.on("info", (...args) => {
            audioStream.emit("info", ...args);
          });

          const ffmpeg = spawn("ffmpeg", [
            "-i",
            "pipe:0", // Input from stdin
            "-vn", // No video
            ...(format.audioBitrate
              ? ["-b:a", format.audioBitrate.toString() + "k"]
              : []), // Audio bitrate from format
            "-acodec",
            "libmp3lame", // Audio codec
            "-f",
            "mp3", // Output format
            "pipe:1", // Output to stdout
          ]);

          // Pipe video input into FFmpeg
          videoStream.pipe(ffmpeg.stdin);

          // Pipe FFmpeg output to audioOutput stream
          ffmpeg.stdout.pipe(audioStream);

          ffmpeg.on("data", console.error);

          resolve(audioStream);
        })
        .catch(reject);
    });
  }

  /**
   * Download video Only
   * @param options
   */
  videoStream(options: downloadOptions = {}) {
    return new Promise<Readable>((resolve, reject) => {
      ytdl
        .getInfo(this.link)
        .then((info) => {
          const videoStream = ytdl.downloadFromInfo(info, {
            filter: "video",
            ...options,
          });
          return resolve(videoStream);
        })
        .catch(reject);
    });
  }

  /**
   * Streams video + audio from youtube
   * @param options
   * @returns PassThrough stream with video stream
   */
  combinedStream(
    options: downloadOptions & {
      bitrate?: number;
      videoQuality?: ytdl.chooseFormatOptions["quality"];
      audioQuality?: ytdl.chooseFormatOptions["quality"];
    } = {}
  ) {
    const outStream = new PassThrough();

    ytdl
      .getInfo(this.link)
      .then((info) => {
        const audioStream = ytdl.downloadFromInfo(info, {
          quality: options.audioQuality ?? "highestaudio",
          filter: "audio",
          ...options,
        });
        const videoStream = ytdl.downloadFromInfo(info, {
          quality: options.audioQuality ?? "highestvideo",
          // filter: "video",
          ...options,
        });
        const ffmpegProcess = cp.spawn(
          ffmpegPath!,
          [
            // supress non-crucial messages
            "-loglevel",
            "8",
            "-hide_banner",
            "-fflags",
            "+igndts",
            // input audio and video by pipe
            "-i",
            "pipe:3",
            "-i",
            "pipe:4",
            // map audio and video correspondingly
            "-map",
            "0:a",
            "-map",
            "1:v",
            // no need to change the codec
            "-c",
            "copy",
            // output mp4 and pipe
            "-f",
            "matroska",
            "pipe:5",
          ],
          {
            // no popup window for Windows users
            windowsHide: true,
            stdio: [
              // silence stdin/out, forward stderr,
              "inherit",
              "inherit",
              "inherit",
              // and pipe audio, video, output
              "pipe",
              "pipe",
              "pipe",
            ],
          }
        );

        audioStream.pipe(ffmpegProcess.stdio[3] as Writable);
        videoStream.pipe(ffmpegProcess.stdio[4] as Writable);
        (ffmpegProcess.stdio as Readable[])[5].pipe(outStream);

        // Promise.all([audioStreamPromise, videoStreamPromise])
        //   .then(([audioStream, videoStream]) => {
        //     const audioReadable = readableStreamToReadable(audioStream);
        //     const videoReadable = readableStreamToReadable(videoStream);

        //     // audioReadable.pipe(fs.createWriteStream("out/sound.mp4"));
        //     // videoReadable.pipe(fs.createWriteStream("out/vid.mp4"));
        //     // videoReadable.on("end", () => outStream.end());

        //
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
