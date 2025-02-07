// https://developer.spotify.com/documentation/web-api/reference/search
export interface SpotifyItem {
  album: {
    artists: { href: string; name: string }[];
    href: string;
    images: { url: string; height: number; width: number }[];
    name: string;
    release_date: string; // ISO
  };
  artists: {
    href: string;
    name: string;
  }[];
  duration_ms: number;
  href: string;
  name: string;
}

export interface SpotifyResult {
  href: string;
  limit: number;
  next: string | null; // link
  offset: number;
  previous: string | null; // link
  total: number;
  items: SpotifyItem[];
}
export interface SpotifyResponse {
  tracks?: SpotifyResult;
  playlists?: SpotifyResult;
  artists?: SpotifyResult;
  albums?: SpotifyResult;
}
