import type ytdl from "@distube/ytdl-core";
import type { ObjectId } from "mongoose";

/**
 * Command keywords for Downloader to execute/process
 */
enum DownloadCommandType {
  START = "DOWNLOADER_START", ///< Starts downloader and spawns its workers
  EXIT = "DOWNLOADER_EXIT", ///< Kills/Ends downloader after all workers ended downloading (or force)
  DOWNLOAD = "DOWNLOADER_DOWNLOAD", ///< Assigns new worker and starts downloading request
}

interface DownloadJob {
  id: ObjectId; ///< MongoDB entry ID
  link: string; ///< Yt link or id
  type: "audio" | "video" | "video-only"; ///< Type of file to download
  options: ytdl.downloadOptions; ///< Download options for ytdl
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
  // handlers: {
  //   pong?: (value: any) => void; ///< Ping respons
  //   progress?: (downloaded: number, total: number) => void; ///< Download progress callback
  //   end?: () => void; ///< Download progress callback
  // };
  handlers: {
    [event in WorkerMessage as event["type"]]?: (msg: event) => void;
  };
}

/**
 * Message from Worker to parent port about state of download
 */
export type WorkerMessage =
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

/**
 * Download command for Downloader with payload type for specific command
 */
export type DownloadCommand =
  | {
      command: DownloadCommandType.START;
      numberOfWorkers: number; ///< Size of worker pool (specific number needs to be benched)
    }
  | { command: DownloadCommandType.EXIT; force?: boolean }
  | ({
      command: DownloadCommandType.DOWNLOAD;
    } & DownloadJob);
