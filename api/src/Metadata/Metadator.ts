import { MetadataBuilder } from "./MetadataBuilder";
import { YTMusicMetadataBuilder } from "./YTMusicMetadataBuilder";
import { SpotifyMetadataBuilder } from "./SpotifyMetadataBuilder";
import type { SpotifyMetadata } from "../../../shared/Entities/Metadata/SpotifyMetadata";
import type { YTMusicMetadata } from "../../../shared/Entities/Metadata/YTMusicMetadata";
import type { FfmpegCommand } from "fluent-ffmpeg";
import { ENV } from "../env";
import type { MetadataResponse, MetadatorResponse } from "./MetadataResponse";
import ytdl from "@distube/ytdl-core";
import { AudioMetadata } from "../../../shared/Entities/Metadata/AudioMetadata";

/**
 * His role is to extract and find metadata
 */
export class Metadator {
  link: string;

  constructor(videoIdOrLink: string) {
    this.link = videoIdOrLink;
  }

  /**
   * Validates Youtube URL
   * @returns bool
   */
  isValid() {
    return ytdl.validateURL(this.link);
  }

  /**
   *
   * @returns The whole info object from ytdl
   */
  rawMetaData() {
    return ytdl.getInfo(this.link);
  }

  /**
   * @returns `Metadata` objects only with useful data.
   * It tries from multiple source - ytMusic, Spotify, ....
   */
  async metaDatas() {
    const Metadatas: Record<keyof MetadatorResponse, typeof MetadataBuilder> = {
      ytMusic: YTMusicMetadataBuilder,
      spotify: SpotifyMetadataBuilder,
    };
    const raw = await this.rawMetaData();
    const response: MetadataResponse = {
      spotify: null,
      ytMusic: null,
      raw: raw,
    };

    const promises: Promise<AudioMetadata>[] = [];

    await Promise.all(
      Object.keys(Metadatas).map(
        (key) =>
          new Promise(async (resolve, reject) => {
            const typedKey = key as keyof MetadatorResponse;

            const metadata = await Metadatas[
              key as keyof MetadatorResponse
            ].create(raw);

            response[typedKey] = metadata as any; //MetadatorResponse[keyof MetadatorResponse]
            resolve(response[typedKey]);
          })
      )
    );

    return response;
  }

  /**
   * @deprecated FFMPEG stream does not support every type
   * Inserts (Music) Metadata into ffmpeg output stream
   * ### Thumbnail is not possible when working with streams!
   * Currently supported: Album, Title, Artist(s)
   * @param ffmpeg FFMPEG command to execute
   * @param metadata Metadata object with values to write
   * @returns The provided `ffmpeg`
   */
  static putMetadataToFFMPEG(
    ffmpeg: FfmpegCommand,
    metadata: Partial<AudioMetadata>
  ) {
    const availableMetas = [
      [metadata.album, "album"],
      [metadata.artists?.join(", "), "artist"],
      [metadata.title, "title"],
    ];

    availableMetas.forEach(([value, key], index) => {
      if (value) ffmpeg.outputOptions("-metadata", `${key}=${value}`);
    });

    return ffmpeg;
  }
}
