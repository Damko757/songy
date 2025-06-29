import { MetadataBuilder as MetadataBuilder } from "./MetadataBuilder";
import axios, { AxiosError } from "axios";
import { Spotify } from "../Spotify/Spotify";
import { ENV } from "../env";
import { MissingSpotifyCrendentials } from "../Spotify/SpotifyError";
import type { SpotifyMetadata } from "../../../shared/Entities/Metadata/SpotifyMetadata";
import ytdl from "@distube/ytdl-core";

export class SpotifyMetadataBuilder extends MetadataBuilder {
  static async create(raw: ytdl.videoInfo): Promise<SpotifyMetadata[] | null> {
    if (!ENV.ENABLE_SPOTIFY) return null;

    try {
      const spotify = new Spotify();
      const response = await spotify.search(raw.videoDetails.title);
      return (
        response.data.tracks?.items.map((spotifyItem) => {
          const meta: SpotifyMetadata = {
            link: spotifyItem.href,
            title: spotifyItem.name,
            artists: spotifyItem.artists.map((artist) => artist.name),
            album: spotifyItem.album.name,
            thumbnails: spotifyItem.album.images,
            releaseDate: spotifyItem.album.release_date,
          };
          return meta;
        }) ?? null
      );
    } catch (e) {
      if (e instanceof MissingSpotifyCrendentials) console.error(e.message);
      else console.error(e);
      if (e instanceof AxiosError) console.error(e.response?.data);
      return null;
    }
  }
}
