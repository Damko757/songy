import type { videoInfo } from "@distube/ytdl-core";
import { Metadata } from "./Metadata";
import axios, { AxiosError } from "axios";
import { Spotify } from "../Spotify/Spotify";
import { ENV } from "../env";
import { MissingSpotifyCrendentials } from "../Spotify/SpotifyError";

export class SpotifyMetadata extends Metadata {
  static async create(raw: videoInfo): Promise<SpotifyMetadata[] | null> {
    if (!ENV.ENABLE_SPOTIFY) return null;

    try {
      const spotify = new Spotify();
      const response = await spotify.search(raw.videoDetails.title);
      return (
        response.data.tracks?.items.map((spotifyItem) => {
          const meta = new SpotifyMetadata(
            spotifyItem.name,
            spotifyItem.artists.map((artist) => artist.name).join(", ")
          );
          meta.album = spotifyItem.album.name;
          meta.releaseDate = spotifyItem.album.release_date;
          meta.thumbnails = spotifyItem.album.images;
          meta.duration = spotifyItem.duration_ms;
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
