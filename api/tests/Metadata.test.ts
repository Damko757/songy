import { describe, it, expect } from "bun:test";
import { Metadator } from "../src/Metadata/Metadator";

describe("Metadata from song URL", () => {
  it("YT Music, CarpetMan - Make it Lower", () => {
    const metadator = new Metadator("o5NDhQgVzoo");
    expect(metadator.metaDatas()).resolves.toMatchObject([
      {
        title: "Make It Lower",
        artist: "Carpetman",
        album: "Make It Lower",
        releaseDate: "2024-12-19",
      },
    ]);
  });
  it("YT, CarpetMan - Make it Lower", async () => {
    const metadator = new Metadator("sduDiIGqvfQ");
    const metas = await metadator.metaDatas();
    expect(metas?.at(0)).toMatchObject({
      artist: "Carpetman",
      title: "Make It Lower",
      album: "Make It Lower",
      releaseDate: "2024-12-19",
    });
  });
  it("YT, Stephen - Crosfire", async () => {
    const metadator = new Metadator("eRgjK23taLw");
    expect((await metadator.metaDatas())?.[0]).toMatchObject({
      title: "Crossfire",
      artist: "Stephen",
      album: "Crossfire",
      releaseDate: "2015-12-07",
    });
  });
});
