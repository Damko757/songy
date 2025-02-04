import { describe, it, expect } from "bun:test";
import ytdl from "@distube/ytdl-core";
import fs from "fs";
import { Metadator } from "../src/Metadata/Metadator";
import { release } from "os";
import type { title } from "process";

describe("Metadata from song URL", () => {
  it.only("YT Music, CarpetMan - Make it Lower", () => {
    const metadator = new Metadator("o5NDhQgVzoo");
    expect(metadator.metaData()).resolves.toMatchObject({
      title: "Make It Lower",
      artist: "Carpetman",
      album: "Make It Lower",
      releaseDate: "2024-12-19",
    });
  });
  it.only("YT, CarpetMan - Make it Lower", () => {
    const metadator = new Metadator("sduDiIGqvfQ");
    expect(metadator.metaData()).resolves.toMatchObject({
      artist: "Carpetman",
      title: "Make it Lower",
    });
  });
  it("YT, Stephen - Crosfire", () => {
    const metadator = new Metadator("eRgjK23taLw");
    expect(metadator.metaData()).resolves.toMatchObject({
      title: "Crossfire",
      artist: "Stephen",
      album: "Make It Lower",
      releaseDate: "2022-12-19",
    });
  });
});
