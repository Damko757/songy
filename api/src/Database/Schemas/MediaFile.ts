import mongoose, { type ObjectId } from "mongoose";
import type { DownloadJob } from "../../../../downloader/src/Commands/Command.js";
import type { AudioMetadata } from "../../../../shared/Entities/Metadata/Metadata.js";

/**
 * Sctructure representing State of downloaded/downloading file
 */
export interface MediaFileExtension {
  audio: "mp3"; // | m4a
  video: "mp4";
}

export enum MediaFileState {
  WAITING, ///< Waiting in queue
  DOWNLOADING, ///< Downloading of file started, WS is notified about progress
  PROCESSING, ///< Download 100%, but not finished. FFMPEG processing and/or binding Metadata
  READY, ///< File ready to be downloading
}

export interface MediaFile extends DownloadJob {
  _id: ObjectId;
  name?: string; ///< Filename (when downloaded)
  state: MediaFileState; ///< State about file
}

const MediaFileSchema = new mongoose.Schema({});

export const MediaFileModel = mongoose.model<MediaFile>(
  "MediaFile",
  MediaFileSchema
);
