import ytdl from "@distube/ytdl-core";
import { query } from "express";
import fs from "fs";

/**
 * Data object for File's metadata
 */
export abstract class Metadata {
  title: string;
  artist: string;
  album?: string;
  thumbnails?: { url: string; width: number; height: number }[];
  publisher?: string;
  releaseDate?: string; // ISO date
  duration?: number; // in ms
  protected constructor(title: string, artist: string) {
    this.title = title;
    this.artist = artist;
  }

  /**
   * Creates instance from raw videoInfo
   * @returns instances if possible, otherwise null
   */
  static create(
    raw: ytdl.videoInfo
  ): Metadata[] | null | Promise<Metadata[] | null> {
    throw new Error("Unitialized class");
  }
}
