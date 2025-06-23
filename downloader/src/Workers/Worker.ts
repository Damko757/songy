import chalk from "chalk";
import { parentPort } from "node:worker_threads";
import {
  WorkerJob,
  WorkerJobInstruction,
  WorkerMessage,
} from "../Commands/Command.js";

parentPort?.on("message", (job: WorkerJobInstruction) => {
  console.log("My job:", job);
  if (job.action == "ping") {
    // Answer to ping
    parentPort?.postMessage({
      type: "pong",
      value: job.value,
    } as WorkerMessage);

    // Classic End message
    parentPort?.postMessage({
      type: "end",
    } as WorkerMessage);
    return;
  }

  const message: WorkerMessage = { type: "end" };
  setTimeout(() => parentPort?.postMessage(message), 5000);
});
