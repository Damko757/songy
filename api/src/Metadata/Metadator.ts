import ytdl from "@distube/ytdl-core";
import { Metadata } from "./Metadata";
import { YTMusicMetadata } from "./YTMusicMetadata";

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
   * @returns `Metadata` object only with useful data.
   * It tries from multiple source - ytMusic, Spotify, ....
   */
  async metaData(): Promise<Metadata | null> {
    const Metadatas: (typeof Metadata)[] = [YTMusicMetadata];
    const raw = await this.rawMetaData();
    for (const meta of Metadatas) {
      const metaInstance = meta.create(raw);
      if (metaInstance) return metaInstance;
    }
    return null;
  }
}
