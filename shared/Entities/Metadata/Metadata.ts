export interface Metadata {
  title: string;
  artists: string[];
  album: string;
  thumbnails: { url: string; width: number; height: number }[];
  releaseDate: string; // ISO date
  duration: number; // in ms
}
