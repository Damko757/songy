export interface AudioMetadata {
  title: string; ///< Song title (Africe)
  artists: string[]; ///< Song Artists ([Toto])
  album: string | null; //< Album name
  thumbnails: { url: string; width: number; height: number }[]; ///< Thumbnails with path to obtain it an dimensions
  releaseDate: string | null; ///< ISO date
  lyrics?: string; ///< Song's lyrics
}
