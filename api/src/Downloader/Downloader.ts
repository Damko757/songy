import ffmpeg from "fluent-ffmpeg";
import { PassThrough, Readable, Writable } from "stream";
import { Metadator } from "../Metadata/Metadator.js";
import {
  YtdlCore,
  type YTDL_ChooseFormatOptions,
  type YTDL_DownloadOptions,
  type YTDL_VideoFormat,
} from "@ybd-project/ytdl-core";
import type { Metadata } from "../../../shared/Entities/Metadata/Metadata.js";
import { readableStreamToReadable } from "../Utils/ReadableStreamUtils.js";
import fs from "fs";
import cp from "child_process";
import ffmpegPath from "ffmpeg-static";

export class Downloader {
  link: string;
  metadator: Metadator;

  static supportedExtensions: Record<"audio" | "video", string[]> = {
    audio: ["mp3"],
    video: ["mp4"],
  };

  constructor(link: string) {
    this.link = link;
    this.metadator = new Metadator(this.link);
  }

  /**
   * Validates Youtube URL
   * @returns bool
   */
  isValid() {
    return this.metadator.isValid();
  }

  /**
   * Streams audio only from youtube
   * @param options
   * @returns PassThrough stream with audio stream
   */
  audioStream(
    options: YTDL_DownloadOptions & {
      bitrate?: number;
    } = {}
  ) {
    const self = this;
    const outStream = new PassThrough();

    this.metadator
      .rawMetaData()
      .then((info) => {
        self.metadator
          .getYtDlInstance()
          .downloadFromInfo(info, {
            quality: options.quality ?? "highestaudio",
            filter: "audio",
            ...options,
          })
          .then((stream) => {
            const readable = readableStreamToReadable(stream);
            ffmpeg()
              .input(readable)
              .audioBitrate(options.bitrate ?? 320)
              .format("mp3")
              .pipe(outStream);
          })
          .catch((e) => {
            console.error(e);
            outStream.emit("error", e);
          });
      })
      .catch((e) => {
        outStream.emit("error", e);
      });

    return outStream;
  }

  /**
   * Streams video + audio from youtube
   * @param options
   * @returns PassThrough stream with video stream
   */
  videoStream(
    options: YTDL_DownloadOptions & {
      bitrate?: number;
      videoQuality?: YTDL_ChooseFormatOptions["quality"];
      audioQuality?: YTDL_ChooseFormatOptions["quality"];
    } = {}
  ) {
    const self = this;
    const outStream = new PassThrough();

    this.metadator
      .rawMetaData()
      .then((info) => {
        const audioStreamPromise = self.metadator
          .getYtDlInstance()
          .downloadFromInfo(info, {
            quality: options.audioQuality ?? "highestaudio",
            filter: "audio",
            ...options,
          });
        const videoStreamPromise = self.metadator
          .getYtDlInstance()
          .downloadFromInfo(info, {
            quality: "highestvideo",
            filter: "video",
            ...options,
          });
        Promise.all([audioStreamPromise, videoStreamPromise])
          .then(([audioStream, videoStream]) => {
            const audioReadable = readableStreamToReadable(audioStream);
            const videoReadable = readableStreamToReadable(videoStream);

            // audioReadable.pipe(fs.createWriteStream("out/sound.mp4"));
            // videoReadable.pipe(fs.createWriteStream("out/vid.mp4"));
            // videoReadable.on("end", () => outStream.end());

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
            audioReadable.pipe(ffmpegProcess.stdio[3] as Writable);
            videoReadable.pipe(ffmpegProcess.stdio[4] as Writable);

            (ffmpegProcess.stdio as Readable[])[5].pipe(outStream);
          })
          .catch((e) => {
            console.error(e);
            outStream.emit("error", e);
          });
      })
      .catch((e) => {
        outStream.emit("error", e);
      });

    return outStream;
  }
}
