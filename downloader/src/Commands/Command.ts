import type ytdl from "@distube/ytdl-core";
import type { ObjectId } from "mongoose";
import { DestroyT } from "../Workers/WorkerPool.js";
import { AudioMetadata } from "../../../shared/Entities/Metadata/AudioMetadata.js";
import { MediaFileExtension } from "../../../api/src/Database/Schemas/MediaFile.js";

/// Worker communication commands ///
export interface DownloadJob {
  _id: ObjectId; ///< MongoDB entry ID
  extension: MediaFileExtension["video"] | MediaFileExtension["audio"]; ///< File saved to user with extension (to know file's encoding)
  link: string; ///< Yt link or id
  type: "audio" | "video" | "video-only"; ///< Type of file to download
  options: { audio?: ytdl.downloadOptions; video?: ytdl.downloadOptions }; ///< Download options for ytdl
  audioMetadata?: AudioMetadata; ///< Song's metadata to save into file. If !== undefined, the same worker configures it, then calls end
}

/**
 * Job for (Download) Worker
 */
export type WorkerJobInstruction =
  | ({ action: "download" } & DownloadJob)
  | {
      action: "bind-audio-metadata"; ///< Only sets Metadata to file (file must be in READY state, or else error)
      id: ObjectId;
      audioMetadata: AudioMetadata;
    }
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
  | { type: "start" } ///< Started executing job
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
