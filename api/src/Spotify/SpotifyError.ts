export class MissingSpotifyCrendentials extends Error {
  constructor() {
    super(
      "Spotify credentials are missing in .env files!\nPlease specify `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`"
    );
  }
}
