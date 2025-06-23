import { WebSocketServer, WebSocket } from "ws";
import {
  DownloadCommand,
  DownloadCommandType,
  WorkerJob,
  WorkerMessage,
} from "./Command.js";
import { WorkerPool } from "../Workers/WorkerPool.js";
import { ObjectId } from "mongoose";
import chalk from "chalk";

/**
 * Listens to commands and dispatches events (WorkerPool download progress, finished) to clients
 */
export class CommandProcessor {
  wss: WebSocketServer; ///< WebSocketServer
  workerPool?: WorkerPool;

  constructor() {
    this.wss = new WebSocketServer();
    this.bindWSS();
  }

  /**
   * Binds event listeners on wss instance
   */
  protected bindWSS() {
    this.wss.on("listening", () =>
      console.log(chalk.bold.greenBright("Command WSS listening!"))
    );
    this.wss.on("close", () =>
      console.log(chalk.bold.redBright("Command WSS closed!"))
    );

    this.wss.on("connection", (ws: WebSocket) => {
      ws.on("message", (data: string) => {
        const command = JSON.parse(data) as DownloadCommand;
        this.processCommand(ws, command); // Processing commands from API (client)
      });
    });
  }

  /**
   * Processes command from WebSocket
   * @param command Command from Client's message
   */
  protected processCommand(ws: WebSocket, command: DownloadCommand) {
    switch (command.action) {
      case DownloadCommandType.START:
        if (this.workerPool !== undefined) {
          // WP already started
          ws.emit("error", "WorkerPool already created!");
          return;
        }
        this.workerPool = new WorkerPool(command.numberOfWorkers);
        return;
      case DownloadCommandType.EXIT:
        this.workerPool?.destroy(command.force ?? "finish-all");
        return;
      case DownloadCommandType.DOWNLOAD:
        if (!this.workerPool) {
          ws.emit("error", "WorkerPool not started!");
          return;
        }

        this.workerPool.addJob({
          job: { ...command, action: "download" },
          handlers: {
            progress: (msg) => this.onDownloadProgress(command.id, msg), // Progression callback
            end: (msg) => this.onDownloadEnd(command.id, msg), // Finished callaback
          },
        });

        return; // Ok
    }
  }

  /**
   * Callback when downloaded file get new progress
   * @param id Of downloaded file
   * @param message Worker message
   */
  protected onDownloadProgress(
    id: ObjectId,
    message: Extract<WorkerMessage, { type: "progress" }>
  ) {
    // TODO
  }

  /**
   * Callback when download file finished downloading and converting
   * MongoDB entry is notified here
   * @param id Of downloaded file
   * @param message Unused, reserved for future uses
   */
  protected onDownloadEnd(
    id: ObjectId,
    message: Extract<WorkerMessage, { type: "end" }>
  ) {
    // TODO
  }
}
