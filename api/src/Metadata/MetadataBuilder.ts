import ytdl from "@distube/ytdl-core";
import { query } from "express";
import fs from "fs";
import type { Metadata } from "../../../shared/Entities/Metadata/Metadata";
import type { YTDL_VideoInfo } from "@ybd-project/ytdl-core";

/**
 * Data object for File's metadata
 */
export abstract class MetadataBuilder {
  /**
   * Creates instance from raw videoInfo
   * @returns instances if possible, otherwise null
   */
  static create(
    raw: YTDL_VideoInfo
  ): Metadata[] | null | Promise<Metadata[] | null> {
    throw new Error("Unitialized class");
  }
}
