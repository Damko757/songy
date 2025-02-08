import { describe, it, expect } from "bun:test";
import { Metadator } from "../src/Metadata/Metadator";

describe("Metadata from YT URL", () => {
  it.only(
    "YT Music, CarpetMan - Make it Lower",
    async () => {
      const metadator = new Metadator("o5NDhQgVzoo");
      expect((await metadator.metaDatas()).ytMusic?.[0]).toMatchObject({
        title: "Make It Lower",
        artists: ["Carpetman"],
        album: "Make It Lower",
        releaseDate: "2024-12-19",
      });
    },
    {
      timeout: 10000,
    }
  );
  it("Spotify, CarpetMan - Make it Lower", async () => {
    const metadator = new Metadator("sduDiIGqvfQ");
    const metas = await metadator.metaDatas();
    expect(metas.spotify?.[0]).toMatchObject({
      artists: ["Carpetman"],
      title: "Make It Lower",
      album: "Make It Lower",
      releaseDate: "2024-12-19",
    });
  });
  it("Spotify, Stephen - Crosfire", async () => {
    const metadator = new Metadator("eRgjK23taLw");
    expect((await metadator.metaDatas())?.spotify?.[0]).toMatchObject({
      title: "Crossfire",
      artists: ["Stephen"],
      album: "Crossfire",
      releaseDate: "2015-12-07",
    });
  });
});
