import type ytdl from "@distube/ytdl-core";
import type { ObjectId } from "mongoose";
import { DestroyT } from "../Workers/WorkerPool.js";

/// Worker communication commands ///
export interface DownloadJob {
  id: ObjectId; ///< MongoDB entry ID
  extension: "mp4" | "mp3"; ///< MongoDB entry ID
  link: string; ///< Yt link or id
  type: "audio" | "video" | "video-only"; ///< Type of file to download
  options: { audio?: ytdl.downloadOptions; video?: ytdl.downloadOptions }; ///< Download options for ytdl
}

/**
 * Job for (Download) Worker
 */
export type WorkerJobInstruction =
  | ({ action: "download" } & DownloadJob)
  | { action: "ping"; value: any };

/**
 * Object defining behaviour of communication with worker
 */
export interface WorkerJob {
  job: WorkerJobInstruction; ///< Data that will get Worker
  handlers: {
    [event in WorkerMessage as event["type"]]?: (msg: event) => void;
  };
}

/**
 * Message from Worker to parent port about state of download
 */
export type WorkerMessage =
  | { type: "error"; error: any }
  | {
      type: "progress"; ///< Downloading file. If downloaded == total, FFMPEG conversion is underway
      downloaded: number;
      total: number;
    }
  | {
      type: "end"; ///< Finished job. Can go idle
    }
  | {
      type: "pong"; ///< Answer to ping with provided value
      value: any;
    };

/// WS communication commands ///

/**
 * Command keywords for Downloader to execute/process
 */
export enum DownloaderCommandType {
  START = "START_DOWNLOADER", ///< Starts downloader and spawns its workers
  EXIT = "EXIT_DOWNLOADER", ///< Kills/Ends downloader after all workers ended downloading (or force)
  DOWNLOAD = "DOWNLOADER_DOWNLOAD", ///< Assigns new worker and starts downloading request
}
/**
 * Command for Downloader with payload type for specific command
 */
export type DownloaderCommand =
  | {
      action: DownloaderCommandType.START;
      numberOfWorkers: number; ///< Size of worker pool (specific number needs to be benched)
    }
  | {
      action: DownloaderCommandType.EXIT;
      force?: Exclude<DestroyT, "none">;
    }
  | ({
      action: DownloaderCommandType.DOWNLOAD;
    } & DownloadJob);

/**
 * Downloader's message for API
 */
export enum DownloaderCommandResponseType {
  ERROR = "DOWNLOADER_ERROR", ///< Error happened
  EXIT = "DOWNLOADER_EXIT", ///< Worker pool destroyed
  START = "DOWNLOADER_START", ///< Worker pool successfully started
}

/**
 * Message from Command Processor to client (API)
 */
export type DownloaderCommandResponse =
  | {
      type: DownloaderCommandResponseType.ERROR;
      error: string | object;
    }
  | { type: DownloaderCommandResponseType.EXIT }
  | { type: DownloaderCommandResponseType.START; numberOfWorkers: number };
