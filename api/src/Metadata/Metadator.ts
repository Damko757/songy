import ytdl from "@distube/ytdl-core";
import { MetadataBuilder } from "./MetadataBuilder";
import { YTMusicMetadataBuilder } from "./YTMusicMetadataBuilder";
import { SpotifyMetadataBuilder } from "./SpotifyMetadataBuilder";
import type { SpotifyMetadata } from "../../../shared/Entities/Metadata/SpotifyMetadata";
import type { YTMusicMetadata } from "../../../shared/Entities/Metadata/YTMusicMetadata";

export interface MetadatorResponse {
  spotify: SpotifyMetadata[] | null;
  ytMusic: YTMusicMetadata[] | null;
}

/**
 * His role is to extract and find metadata
 */
export class Metadator {
  videoId: string;
  constructor(videoId: string) {
    this.videoId = videoId;
  }

  /**
   *
   * @returns The whole info object from ytdl
   */
  rawMetaData() {
    return ytdl.getInfo(this.videoId);
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
    const response: MetadatorResponse = {
      spotify: null,
      ytMusic: null,
    };

    await Promise.all(
      Object.keys(Metadatas).map(
        (key) =>
          new Promise(async (resolve, reject) => {
            const metadata = await Metadatas[
              key as keyof MetadatorResponse
            ].create(raw);

            response[key as keyof MetadatorResponse] =
              metadata as MetadatorResponse[keyof MetadatorResponse];

            resolve(response[key as keyof MetadatorResponse]);
          })
      )
    );

    return response;
  }
}
