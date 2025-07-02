import { WebSocket } from "ws";
import { CommandProcessor } from "./Commands/CommandProcessor.js";
import { ObjectId } from "mongoose";
import {
  DownloaderCommand,
  DownloaderCommandResponse,
  DownloaderCommandResponseType,
  DownloaderCommandType,
} from "./Commands/Command.js";
import dotenv from "dotenv";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { connectMongoose } from "./Database/MongoDB.js";
import { ENV } from "./env.js";

const commandProcessor = new CommandProcessor();

const client = new WebSocket("ws://127.0.0.1:" + ENV.DOWNLOADER_WS_PORT);
client.on("error", console.error);

client.on("message", async (message: string) => {
  const data = JSON.parse(message) as DownloaderCommandResponse;
  if (data.type == DownloaderCommandResponseType.ERROR)
    return client.emit("error", data.error);

  if (data.type == DownloaderCommandResponseType.START) {
    for (let i = 0; i < 5; i++) {
      const command: DownloaderCommand = {
        action: DownloaderCommandType.DOWNLOAD,
        extension: "mp4",
        _id: `${"ABCDE"[i]}` as unknown as ObjectId,
        link: "https://www.youtube.com/watch?v=aqz-KE-bpKQ&t=30s",
        options: { video: { quality: "highest" } },
        type: "video",
      };
      client.send(JSON.stringify(command));

      await new Promise((resolve) => setTimeout(resolve, 1000));
      break;
    }
  }
  // else if(data.type == DownloaderCommandResponseType.){}
});

client.on("open", () => {
  console.log("client connected!");

  const startCommand: DownloaderCommand = {
    action: DownloaderCommandType.START,
    numberOfWorkers: 5,
  };
  // client.send(JSON.stringify(startCommand));
});

const mongooseInstance = connectMongoose({ quiet: false });
