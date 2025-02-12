import { expect, describe, it } from "bun:test";
import { Downloader } from "../src/Downloader/Downloader";

describe("Video download", () => {
  it(
    "Simple video",
    async () => {
      const downloader = new Downloader(
        "CaP12QFH5Qg" //https://www.youtube.com/watch?v=
      );
      await downloader.downloadVideo();
    },
    { timeout: 50_000_000 }
  );
});
