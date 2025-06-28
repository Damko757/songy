import chalk from "chalk";
import { parentPort } from "node:worker_threads";
import {
  WorkerJob,
  WorkerJobInstruction,
  WorkerMessage,
} from "../Commands/Command.js";
import { Downloader } from "../Downloader.js";
import path from "node:path";
import ytdl from "@distube/ytdl-core";
import fsPromises from "fs/promises";
import { ObjectId } from "mongoose";

/**
 * Downloads only single stream. Notifies parent about Progress, End and Error
 * @param job Worker's job
 * @param isAudioStream If it is audio-only or video-only job
 */
async function downloadSingleStream(
  job: Extract<WorkerJobInstruction, { action: "download" }>,
  isAudioStream: boolean
) {
  const downloader = new Downloader(job.link);

  const stream = await downloader[
    isAudioStream ? "audioStream" : "videoStream"
  ](job.options[isAudioStream ? "audio" : "video"] ?? {}); // Only audio OR video stream

  stream.on("progress", (chunk, downloaded, total) => {
    const message: WorkerMessage = {
      type: "progress",
      downloaded: downloaded,
      total: total,
    };
    parentPort?.postMessage(message);
  });

  downloader
    .saveStream(stream, Downloader.downloadPath(job.id, job.extension))
    .then(() => {
      // Stream downloaded
      const message: WorkerMessage = {
        type: "end",
      };
      parentPort?.postMessage(message);
    })
    .catch((e) => {
      // Something broke
      const message: WorkerMessage = {
        type: "error",
        error: e,
      };
      parentPort?.postMessage(message);
    });
}

/**
 * Download job execution
 * @param job Worker's job to execute
 */
async function download(
  job: Extract<WorkerJobInstruction, { action: "download" }>
) {
  // Single streams
  if (job.type == "audio") return downloadSingleStream(job, true);
  if (job.type == "video-only") return downloadSingleStream(job, false);

  if (job.type != "video") throw new Error(`Invalid video type '${job.type}'`);
  /// Full video stream
  const downloader = new Downloader(job.link);

  // Stats for progress
  const streams = {
    audio: {
      total: 0,
      downloaded: 0,
      streamPromise: downloader.audioStream(job.options.audio ?? {}),
      filePromise: undefined as undefined | Promise<string>,
      filename: Downloader.downloadPath(job.id, job.extension, "audio"),
    },
    video: {
      total: 0,
      downloaded: 0,
      streamPromise: downloader.videoStream(job.options.video ?? {}),
      filePromise: undefined as undefined | Promise<string>,
      filename: Downloader.downloadPath(job.id, job.extension, "video"),
    },
  };

  for (const [type, data] of Object.entries(streams)) {
    data.streamPromise.then((stream) => {
      stream
        // Total size
        .on("info", (info: ytdl.videoInfo, format: ytdl.videoFormat) => {
          data.total = Number(format.contentLength);
        })
        // Progression and notify
        .on("progress", (chunk, downloaded, total) => {
          data.downloaded = downloaded;

          // Sending cummulative progress
          const message: WorkerMessage = {
            type: "progress",
            downloaded: streams.video.downloaded + streams.audio.downloaded,
            total: streams.video.total + streams.audio.total,
          };
          parentPort?.postMessage(message);
        });
      data.filePromise = downloader.saveStream(stream, data.filename);
    });
  }

  // Waiting for streams
  await Promise.all([streams.audio.streamPromise, streams.video.streamPromise]);

  // Check for non-awaited filePromise
  if (
    streams.audio.filePromise === undefined ||
    streams.video.filePromise === undefined
  )
    throw new Error("No Promise specified!");

  // Waiting for download of all streams, then merging
  Promise.all([streams.audio.filePromise, streams.video.filePromise])
    .then(async ([audioFilename, videoFilename]) => {
      await downloader.createCombinedVideoAudio(
        streams.video.filename,
        streams.audio.filename,
        Downloader.downloadPath(job.id, job.extension)
      );

      // Removing oringal files
      fsPromises.rm(audioFilename);
      fsPromises.rm(videoFilename);

      // Streams downloaded
      const message: WorkerMessage = {
        type: "end",
      };
      parentPort?.postMessage(message);
    })
    .catch((e) => {
      // Something broke
      const message: WorkerMessage = {
        type: "error",
        error: e,
      };
      parentPort?.postMessage(message);
    });
}

parentPort?.on("message", (job: WorkerJobInstruction) => {
  console.log("My job:", job);
  switch (job.action) {
    case "ping":
      // Answer to ping
      parentPort?.postMessage({
        type: "pong",
        value: job.value,
      } as WorkerMessage);

      // Classic End message
      parentPort?.postMessage({
        type: "end",
      } as WorkerMessage);
      return;
    case "download":
      return download(job);
  }
});
