import ytdl from "@distube/ytdl-core";
import { Metadata } from "./Metadata";
import { YTMusicMetadata } from "./YTMusicMetadata";
import { SpotifyMetadata } from "./SpotifyMetadata";

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
  async metaDatas(): Promise<Metadata[] | null> {
    const Metadatas: (typeof Metadata)[] = [YTMusicMetadata, SpotifyMetadata];
    const raw = await this.rawMetaData();
    for (const meta of Metadatas) {
      const metaInstances = await meta.create(raw);
      if (metaInstances != null) return metaInstances;
    }
    return null;
  }
}
