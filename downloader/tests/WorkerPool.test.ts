import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import { WorkerPool } from "../src/Workers/WorkerPool.js";
import { ObjectId } from "mongoose";
import { Worker } from "node:worker_threads";
import { WorkerJob } from "../src/Commands/Command.js";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class WorkerPoolTest extends WorkerPool {
  protected workerScriptFile() {
    return path.resolve(__dirname, "../dist/downloader/src/Workers/Worker.js");
  }
}

describe("Invalid behaviour", () => {
  it("Invalid worker number", () => {
    expect(() => new WorkerPoolTest(0)).toThrow();
    expect(() => new WorkerPoolTest(-1)).toThrow("Invalid number of workers");
    expect(
      async () => await new WorkerPoolTest(1).destroy("force")
    ).not.toThrow();
  });
});

describe("Executing tasks in order", () => {
  for (let i = 1; i <= 15; i++) {
    it(`Finish-all pings with ${i} workers`, () => {
      expect.assertions(10);
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
