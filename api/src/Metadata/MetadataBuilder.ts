import ytdl from "@distube/ytdl-core";
import { AudioMetadata } from "../../../shared/Entities/Metadata/AudioMetadata";

/**
 * Data object for File's metadata
 */
export abstract class MetadataBuilder {
  /**
   * Creates instance from raw videoInfo
   * @returns instances if possible, otherwise null
   */
  static create(
    raw: ytdl.videoInfo
  ): AudioMetadata[] | null | Promise<AudioMetadata[] | null> {
    throw new Error("Unitialized class");
  }
}
