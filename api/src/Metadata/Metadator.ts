import { MetadataBuilder } from "./MetadataBuilder";
import { YTMusicMetadataBuilder } from "./YTMusicMetadataBuilder";
import { SpotifyMetadataBuilder } from "./SpotifyMetadataBuilder";
import type { SpotifyMetadata } from "../../../shared/Entities/Metadata/SpotifyMetadata";
import type { YTMusicMetadata } from "../../../shared/Entities/Metadata/YTMusicMetadata";
import type { Metadata } from "../../../shared/Entities/Metadata/Metadata";
import YtdlCore, { type YTDL_VideoInfo } from "@ybd-project/ytdl-core";
import type { FfmpegCommand } from "fluent-ffmpeg";
import { ENV } from "../env";

export interface MetadatorResponse {
  spotify: SpotifyMetadata[] | null;
  ytMusic: YTMusicMetadata[] | null;
}

export interface MetadataResponse extends MetadatorResponse {
  raw: YTDL_VideoInfo;
}

/**
 * His role is to extract and find metadata
 */
export class Metadator {
  link: string;
  private ytdl: YtdlCore;

  constructor(videoIdOrLink: string) {
    this.link = videoIdOrLink;
    this.ytdl = this.createYTDLInstance();
  }

  /**
   * Validates Youtube URL
   * @returns bool
   */
  isValid() {
    return YtdlCore.validateURL(this.link);
  }

  protected createYTDLInstance(debug: boolean = false) {
    return new YtdlCore({
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

      // hl: "en",
      // gl: "US",
      disableDefaultClients: true,
      disableInitialSetup: true,
      parsesHLSFormat: false,
      noUpdate: true,
      logDisplay: debug
        ? ["debug", "error", "info", "success", "warning"]
        : ["warning", "error"],
      html5Player: {
        useRetrievedFunctionsFromGithub: true,
      },
      poToken: ENV.POTOKEN,
      visitorData: ENV.VISITOR_DATA,
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
    const response: MetadataResponse = {
      spotify: null,
      ytMusic: null,
      raw: raw,
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
    metadata: Partial<Metadata>
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
