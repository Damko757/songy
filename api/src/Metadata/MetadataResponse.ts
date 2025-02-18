import type { YTDL_VideoInfo } from "@ybd-project/ytdl-core";
import type { SpotifyMetadata } from "../../../shared/Entities/Metadata/SpotifyMetadata";
import type { YTMusicMetadata } from "../../../shared/Entities/Metadata/YTMusicMetadata";

export interface MetadatorResponse {
  spotify: SpotifyMetadata[] | null;
  ytMusic: YTMusicMetadata[] | null;
}

/**
 * The actual data sent from server
 */
export interface MetadataResponse extends MetadatorResponse {
  raw: YTDL_VideoInfo;
}
