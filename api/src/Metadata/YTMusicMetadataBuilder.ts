import type { videoInfo } from "@distube/ytdl-core";
import { MetadataBuilder } from "./MetadataBuilder";
import type { Metadata } from "../../../shared/Entities/Metadata/Metadata";
import YTMusic, { SearchResult } from "ytmusic-api";
import fs from "fs";
import type { YTMusicMetadata } from "../../../shared/Entities/Metadata/YTMusicMetadata";
import type { YTDL_VideoInfo } from "@ybd-project/ytdl-core";

export class YTMusicMetadataBuilder extends MetadataBuilder {
  static async create(raw: YTDL_VideoInfo): Promise<YTMusicMetadata[] | null> {
    const ytmusic = new YTMusic();
    await ytmusic.initialize(/* Optional: Custom cookies */);

    const songs = await ytmusic.search(raw.videoDetails.title);

    const metas: YTMusicMetadata[] = [];
    for (const _song of songs) {
      const song = _song as unknown as {
        type: "ALBUM" | "VIDEO";
        albumId: string | undefined;
        videoId: string;
        name: string;
        artist?: { name: string; artistId: string };
        artists?: { name: string; artistId: string }[];
        thumbnails: YTMusicMetadata["thumbnails"];
        duration: number;
      };
      if (song.type != "ALBUM") continue;
      const albumId = song.albumId;

      let releaseDate = null;
      let albumName = null;
      if (albumId !== undefined) {
        const album = await ytmusic.getAlbum(albumId);
        releaseDate = album.year?.toString() ?? null;
        albumName = album.name;
      }
      const meta: YTMusicMetadata = {
        videoId: song.videoId,
        title: song.name,
        artists: song.artists?.map((artist) => artist.name) ?? [
          song.artist!.name,
        ],
        album: albumName,
        thumbnails: song.thumbnails,
        releaseDate: releaseDate,
        duration: song.duration * 1000,
      };
      metas.push(meta);
    }
    return metas;
  }
  // static create(raw: videoInfo): YTMusicMetadata[] | null {
  //   const videoDetails = raw.videoDetails;
  //   const description = videoDetails.description!;
  //   if (!description?.endsWith("Auto-generated by YouTube.")) return null;
  //   // "Provided to YouTube by release.global
  //   // Make It Lower · Carpetman
  //   // Make It Lower
  //   // ℗ Carpetman
  //   // Released on: 2024-12-19
  //   // Arranger: Carpetman\nProducer: Carpetman\nMix  Engineer: Carpetman\nMastering  Engineer: Storm\nComposer: Carpetman\nLyricist: Carpetman
  //   // Auto-generated by YouTube.",
  //   const [_, titleAndArtist, album, publisher, releaseDate, ...__] =
  //     description?.split("\n\n");
  //   const [title, artist] = titleAndArtist.split("·").map((x) => x.trim());
  //   const metadata = new YTMusicMetadata(title, artist);
  //   metadata.album = album.trim();
  //   metadata.releaseDate = releaseDate.replaceAll("Released on: ", "").trim();
  //   metadata.publisher = publisher.replaceAll("℗", "").trim();
  //   metadata.thumbnails = videoDetails.thumbnails;
  //   return [metadata];
  // }
}
