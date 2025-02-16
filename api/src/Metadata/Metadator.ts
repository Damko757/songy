import { MetadataBuilder } from "./MetadataBuilder";
import { YTMusicMetadataBuilder } from "./YTMusicMetadataBuilder";
import { SpotifyMetadataBuilder } from "./SpotifyMetadataBuilder";
import type { SpotifyMetadata } from "../../../shared/Entities/Metadata/SpotifyMetadata";
import type { YTMusicMetadata } from "../../../shared/Entities/Metadata/YTMusicMetadata";
import type { Metadata } from "../../../shared/Entities/Metadata/Metadata";
import YtdlCore from "@ybd-project/ytdl-core";

export interface MetadatorResponse {
  spotify: SpotifyMetadata[] | null;
  ytMusic: YTMusicMetadata[] | null;
}

/**
 * His role is to extract and find metadata
 */
export class Metadator {
  link: string;
  private ytdl: YtdlCore;

  constructor(videoIdOrLink: string) {
    this.link = videoIdOrLink;
    this.ytdl = this.createYTDLInstance(true);
  }

  protected createYTDLInstance(debug: boolean = false) {
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
      disablePoTokenAutoGeneration: true, // TODO?, create https://github.com/YunzheZJU/youtube-po-token-generator
      // YTBD has it disabled altogether, so why won't we?
    });
  }

  /**
   *
   * @returns ytdl instance created in constructor
   */
  getYtDlInstance() {
    return this.ytdl;
  }

  /**
   *
   * @returns The whole info object from ytdl
   */
  rawMetaData() {
    return this.ytdl.getFullInfo(this.link);
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
