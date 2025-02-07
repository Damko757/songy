import ytdl from "@distube/ytdl-core";
import { Metadata } from "./Metadata";
import { YTMusicMetadata } from "./YTMusicMetadata";
import { SpotifyMetadata } from "./SpotifyMetadata";

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
    const Metadatas: Record<keyof MetadatorResponse, typeof Metadata> = {
      ytMusic: YTMusicMetadata,
      spotify: SpotifyMetadata,
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
            response[key as keyof MetadatorResponse] = await Metadatas[
              key as keyof MetadatorResponse
            ].create(raw);

            resolve(response[key as keyof MetadatorResponse]);
          })
      )
    );

    return response;
  }
}
