import axios, { type AxiosInstance } from "axios";
import { ENV } from "../env";
import { MissingSpotifyCrendentials } from "./SpotifyError";
import type { SpotifyResponse } from "./SpotifyResponse";

/**
 * Handles Spotify API calls and auth
 */
export class Spotify {
  private static bearerToken: string | null = null;
  private static bearerExpiresAt: Date | null = null;
  private _axiosInstance: AxiosInstance;

  constructor() {
    this._axiosInstance = axios.create();
  }

  /**
   * Handles that requests will be always authenticated
   */
  protected async getAxiosInstance() {
    if (
      Spotify.bearerToken == null ||
      Spotify.bearerExpiresAt!.getTime() < new Date().getTime()
    ) {
      Spotify.bearerToken = await this.createBearerToken();
      const expiresDate = new Date();
      expiresDate.setTime(expiresDate.getTime() + 60 * 60 * 1000);
      Spotify.bearerExpiresAt = expiresDate;
    }
    this._axiosInstance.defaults.headers.common.Authorization =
      "Bearer " + Spotify.bearerToken;

    return this._axiosInstance;
  }

  protected async createBearerToken() {
    if (!ENV.SPOTIFY_CLIENT_ID || !ENV.SPOTIFY_CLIENT_SECRET)
      throw new MissingSpotifyCrendentials();

    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      `grant_type=client_credentials&client_id=${ENV.SPOTIFY_CLIENT_ID}&client_secret=${ENV.SPOTIFY_CLIENT_SECRET}`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return response.data.access_token;
  }

  public async search(what: string) {
    return (await this.getAxiosInstance()).get<SpotifyResponse>(
      "https://api.spotify.com/v1/search",
      {
        params: {
          q: what,
          type: [
            "album",
            "artist",
            "playlist",
            "track",
            // "show",
            // "episode",
            // "audiobook",
          ].join(","),
        },
      }
    );
  }
}
