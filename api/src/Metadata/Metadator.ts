import { MetadataBuilder } from "./MetadataBuilder";
import { YTMusicMetadataBuilder } from "./YTMusicMetadataBuilder";
import { SpotifyMetadataBuilder } from "./SpotifyMetadataBuilder";
import type { SpotifyMetadata } from "../../../shared/Entities/Metadata/SpotifyMetadata";
import type { YTMusicMetadata } from "../../../shared/Entities/Metadata/YTMusicMetadata";
import YtdlCore from "@ybd-project/ytdl-core";
import type { Metadata } from "../../../shared/Entities/Metadata/Metadata";

export interface MetadatorResponse {
  spotify: SpotifyMetadata[] | null;
  ytMusic: YTMusicMetadata[] | null;
}

/**
 * His role is to extract and find metadata
 */
export class Metadator {
  link: string;
  constructor(videoIdOrLink: string) {
    this.link = videoIdOrLink;
  }

  static createYTDLInstance(debug: boolean = false) {
    return new YtdlCore({
      logDisplay: debug ? ["debug", "error", "info", "success", "warning"] : [],
      clients: [
        "web",
        "mweb",
        "webCreator",
        "android",
        "ios",
        "tv",
        "tvEmbedded",
      ],
      disablePoTokenAutoGeneration: true,
    });
  }

  /**
   *
   * @returns The whole info object from ytdl
   */
  rawMetaData() {
    return Metadator.createYTDLInstance().getFullInfo(this.link);
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

    const promises: Promise<Metadata>[] = [];

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
}
