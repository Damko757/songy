import type { videoInfo } from "@distube/ytdl-core";
import { Metadata } from "./Metadata";

export class YTMusicMetadata extends Metadata {
  static create(raw: videoInfo): YTMusicMetadata | null {
    const videoDetails = raw.videoDetails;
    const description = videoDetails.description!;
    if (!description?.endsWith("Auto-generated by YouTube.")) return null;
    // "Provided to YouTube by release.global
    // Make It Lower · Carpetman
    // Make It Lower
    // ℗ Carpetman
    // Released on: 2024-12-19
    // Arranger: Carpetman\nProducer: Carpetman\nMix  Engineer: Carpetman\nMastering  Engineer: Storm\nComposer: Carpetman\nLyricist: Carpetman
    // Auto-generated by YouTube.",
    const [_, titleAndArtist, album, publisher, releaseDate, ...__] =
      description?.split("\n\n");

    const [title, artist] = titleAndArtist.split("·").map((x) => x.trim());
    const metadata = new YTMusicMetadata(title, artist);
    metadata.album = album.trim();
    metadata.releaseDate = releaseDate.replaceAll("Released on: ", "").trim();
    metadata.publisher = publisher.replaceAll("℗", "").trim();
    metadata.thumbnails = videoDetails.thumbnails;
    return metadata;
  }
}
