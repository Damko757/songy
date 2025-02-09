export interface Metadata {
  title: string;
  artists: string[];
  album: string | null;
  thumbnails: { url: string; width: number; height: number }[];
  releaseDate: string | null; // ISO date
  duration: number; // in ms
  lyrics?: string;
}
