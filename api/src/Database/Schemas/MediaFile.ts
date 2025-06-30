import mongoose, { type ObjectId } from "mongoose";
import type { DownloadJob } from "../../../../downloader/src/Commands/Command.js";

/**
 * Sctructure representing State of downloaded/downloading file
 */
export interface MediaFileExtension {
  audio: "mp3"; // | m4a
  video: "mp4";
}

export enum MediaFileState {
  WAITING = "STATE_WAITING", ///< Waiting in queue
  DOWNLOADING = "STATE_DOWNLOADING", ///< Downloading of file started, WS is notified about progress
  PROCESSING = "STATE_PROCESSING", ///< Download 100%, but not finished. FFMPEG processing and/or binding Metadata
  READY = "STATE_READY", ///< File ready to be downloading
}

export interface MediaFile extends DownloadJob {
  name: string; ///< Filename (when downloaded)
  state: MediaFileState; ///< State about file
}

/**
 * @see AudioMetadata
 */
const AudioMetadataSchema = new mongoose.Schema({
  title: { type: String },
  artists: { type: [String] },
  album: { type: String, default: null },
  thumbnails: { type: [{ url: String, width: Number, height: Number }] },
  releaseDate: { type: String, default: null },
  lyrics: { type: String, default: undefined, required: false },
});

const MediaFileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  state: { type: String, enum: Object.values(MediaFileState), required: true },
  extension: { type: String },
  link: { type: String },
  type: { type: String },
  options: { type: mongoose.Schema.Types.Mixed, default: {} },
  audioMetadata: {
    type: AudioMetadataSchema,
    required: false,
    default: undefined,
  },
});

export const MediaFileModel = mongoose.model<MediaFile>(
  "MediaFile",
  MediaFileSchema
);
