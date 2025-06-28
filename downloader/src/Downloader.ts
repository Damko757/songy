import { PassThrough, Readable, Writable } from "stream";
import fs from "fs";
import cp, { exec, spawn } from "child_process";
import ytdl, { type downloadOptions } from "@distube/ytdl-core";
import { ObjectId } from "mongoose";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { DownloadJob } from "./Commands/Command.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class Downloader {
  link: string;

  static supportedExtensions: Record<"audio" | "video", string[]> = {
    audio: ["mp3"],
    video: ["mp4"],
  };
  static downloadDirectory = path.resolve(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "out"
  );

  constructor(link: string) {
    this.link = link;
  }

  /**
   * Resolves download path
   * @param id Id of file to download
   * @param extension Extension of file. Can be undefined, then no extension is added
   * @param extra Additional value, if temporary file is created (e. g. audio and video-only files, then merge)
   */
  static downloadPath(
    id: ObjectId | string,
    extension?: DownloadJob["extension"],
    extra?: string
  ) {
    if (!fs.existsSync(Downloader.downloadDirectory))
      fs.mkdirSync(Downloader.downloadDirectory);

    // TODO: Fix for special directory
    return path.resolve(
      Downloader.downloadDirectory,
      `${id}${extra ? "_" + extra : ""}${extension ? "." + extension : ""}`
    );
  }

  /**
   * Fetches info for `this.link`
   * @param options Get info options for ytdl-core
   * @returns Information for provided link
   */
  getInfo(options: ytdl.getInfoOptions = {}) {
    return ytdl.getInfo(this.link, options);
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
   * Saves `stream` into file `filename`
   * @param stream Readable stream to save
   * @param filename Of saved stream
   * @returns Promise resolved with filename upon completed write
   */
  async saveStream(stream: Readable, filename: string) {
    return new Promise<string>((resolve, reject) => {
      console.info("Saving to:", filename);
      const fileStream = fs.createWriteStream(filename);
      fileStream.on("error", reject);
      fileStream.on("close", () => resolve(filename));
      stream.pipe(fileStream);
    });
  }

  /**
   * Combines video and audio files into single MP4 file
   * @param videoFilename Filename of video file
   * @param audioFilename Filename of audio file
   * @param outFilename Filename of resulting video file
   * @returns Promise resolved upon completed combining
   */
  createCombinedVideoAudio(
    videoFilename: string,
    audioFilename: string,
    outFilename: string
  ) {
    return new Promise<void>((resolve, reject) => {
      const cmd = `ffmpeg -i ${videoFilename} -i ${audioFilename} -c:v copy -c:a aac -shortest ${outFilename} -y`;

      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error: ${error.message}`);
          reject(error);
          return;
        }
        if (stderr) {
          console.error(`FFmpeg stderr: ${stderr}`);
        }
        console.log("FFmpeg output:", stdout);
        resolve();
      });
    });
  }
}
