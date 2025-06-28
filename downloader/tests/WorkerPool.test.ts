import { afterAll, beforeAll, describe, expect, it, jest } from "@jest/globals";
import { WorkerPool } from "../src/Workers/WorkerPool.js";
import { ObjectId } from "mongoose";
import { Worker } from "node:worker_threads";
import { WorkerJob } from "../src/Commands/Command.js";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sha256 } from "sha.js";
import fs from "fs";
import { Downloader } from "../src/Downloader.js";
import { afterEach } from "node:test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class WorkerPoolTest extends WorkerPool {
  protected workerScriptFile() {
    // Should regenerate
    return path.resolve(__dirname, "../dist/downloader/src/Workers/Worker.js");
  }
}

beforeAll(() => {
  Downloader.downloadDirectory = path.resolve(
    __dirname,
    "../dist/downloader/out"
  ); // Temporary directory
});
afterAll(() => {
  // Removing out folder
  try {
    fs.rmSync(Downloader.downloadDirectory, { recursive: true });
  } catch (e) {}
});

describe("Invalid behaviour", () => {
  it("Invalid worker number", () => {
    expect(() => new WorkerPool(0)).toThrow();
    expect(() => new WorkerPool(-1)).toThrow("Invalid number of workers");
    expect(async () => await new WorkerPool(1).destroy("force")).not.toThrow();
  });
});

describe("Initialization", () => {
  for (let i = 1; i <= 15; i++) {
    it(`Finish-all pings with ${i} workers`, () => {
      const wp = new WorkerPoolTest(i);
      const jobs: WorkerJob[] = Array.from(Array(10)).map((_, i) => {
        const job: WorkerJob = {
          job: {
            action: "ping",
            value: i,
          },
          handlers: {
            pong: (msg) => {
              expect(msg.value).toBe(i);
            }, // Checking return value from it
          },
        };
        return job;
      });
      jobs.forEach(wp.addJob, wp); // Adding job

      return wp.destroy("finish-all");
    });
  }

  it("Order check", () => {
    expect.assertions(10);
    const wp = new WorkerPoolTest(1);
    let c = 0; // Correct Order counter
    const jobs: WorkerJob[] = Array.from(Array(10)).map((_, i) => {
      const job: WorkerJob = {
        job: {
          action: "ping",
          value: i,
        },
        handlers: {
          pong: (msg) => {
            expect(msg.value).toBe(c++);
          }, // Checking return value from it
        },
      };
      return job;
    });
    jobs.forEach(wp.addJob, wp); // Adding job

    return wp.destroy("finish-all");
  });
});

describe("Downloading", () => {
  it("3 Concurrent videos", () => {
    const wp = new WorkerPoolTest(3);

    return Promise.all(
      Array.from(Array(3)).map(
        (_, i) =>
          new Promise<void>((resolve) => {
            let downloaded = 0;
            let total = 0;
            const id = "ABCDE"[i] as unknown as ObjectId;
            wp.addJob({
              job: {
                action: "download",
                extension: "mp4",
                id: id,
                link: "https://www.youtube.com/watch?v=ucZl6vQ_8Uo",
                options: {
                  video: { quality: "lowestvideo" },
                  audio: { quality: "lowestaudio" },
                },
                type: "video",
              },
              handlers: {
                progress: (msg) => {
                  downloaded = msg.downloaded;
                  total = msg.total;
                },
                end: async () => {
                  expect(downloaded).toBe(total);
                  expect(total).not.toBe(0);

                  // Checking if temporary files are deleted
                  // They are deleted asyncly, hence the wait
                  await new Promise<void>((resolve) => {
                    setTimeout(() => {
                      expect(
                        fs.existsSync(
                          Downloader.downloadPath(id, "mp3", "audio")
                        )
                      ).toBeFalsy();
                      expect(
                        fs.existsSync(
                          Downloader.downloadPath(id, "mp4", "video")
                        )
                      ).toBeFalsy();
                      resolve();
                    }, 1000);
                  });

                  // Real file kept
                  expect(() =>
                    fs.accessSync(Downloader.downloadPath(id, "mp4"))
                  ).not.toThrow();

                  // TODO fetch from correct directory
                  const hash = new sha256();
                  hash.update(
                    fs.readFileSync(Downloader.downloadPath(id, "mp4"))
                  );
                  expect(hash).toMatchSnapshot();

                  resolve();
                },
              },
            });
          })
      )
    );
  }, 120_000); // 2 min
});
