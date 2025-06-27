import { WebSocketServer, WebSocket } from "ws";
import {
  DownloaderCommand,
  DownloaderCommandResponse as DownloaderCommandResponse,
  DownloaderCommandResponseType,
  DownloaderCommandType,
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
  protected wss: WebSocketServer; ///< WebSocketServer
  protected workerPool?: WorkerPool; ///< Pool of workers doing the actual hard work

  protected downloadStatuses = new Map<
    ObjectId,
    { downloaded: number; total: number }
  >();

  constructor() {
    this.wss = new WebSocketServer({ port: 8080 });
    this.bindWSS();
    this._print();
  }

  /**
   * For debug only
   * @deprecated
   */
  protected _print() {
    setInterval(() => {
      console.clear();
      for (const [id, state] of this.downloadStatuses.entries()) {
        console.log(
          chalk.cyan(id),
          state.downloaded,
          "of",
          state.total,
          "[",
          ((state.downloaded / state.total) * 100).toFixed(3),
          "%",
          "]"
        );
      }
      console.log("");
    }, 500);
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
        const command = JSON.parse(data) as DownloaderCommand;
        this.processCommand(ws, command); // Processing commands from API (client)
      });
    });
  }

  /**
   * Processes command from WebSocket
   * @param command Command from Client's message
   */
  protected processCommand(ws: WebSocket, command: DownloaderCommand) {
    switch (command.action) {
      case DownloaderCommandType.START:
        if (this.workerPool !== undefined) {
          // WP already started
          this.sendResponse(ws, {
            type: DownloaderCommandResponseType.ERROR,
            error: "WorkerPool already created!",
          });

          return;
        }
        this.workerPool = new WorkerPool(command.numberOfWorkers);
        this.sendResponse(this.wss.clients, {
          type: DownloaderCommandResponseType.START,
          numberOfWorkers: this.workerPool.size,
        });
        return;
      case DownloaderCommandType.EXIT:
        // Exiting and notifying API
        this.workerPool
          ?.destroy(command.force ?? "finish-all")
          .then(() => {
            this.sendResponse(ws, { type: DownloaderCommandResponseType.EXIT });
          })
          .catch((e) =>
            this.sendResponse(ws, {
              type: DownloaderCommandResponseType.ERROR,
              error: e,
            })
          );

        return;
      case DownloaderCommandType.DOWNLOAD:
        if (!this.workerPool) {
          const error: DownloaderCommandResponse = {
            type: DownloaderCommandResponseType.ERROR,
            error: "WorkerPool not started!",
          };
          this.sendResponse(ws, error);
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
    this.downloadStatuses.set(id, {
      downloaded: message.downloaded,
      total: message.total,
    });

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
    this.downloadStatuses.delete(id); // Removing status from tracking (if tracked`)
    // TODO
  }

  /**
   * Sends response `message` to `ws` o
   * @param ws Websocket or Websockets to send message to
   * @param message Response object to send to client/ws
   * @returns Promise resolve upon write off of the data
   */
  protected sendResponse(
    ws: WebSocket | Iterable<WebSocket>,
    message: DownloaderCommandResponse | string
  ) {
    // Converting to string if object
    const data = typeof message == "string" ? message : JSON.stringify(message);

    // Sending to single client
    if (ws instanceof WebSocket) {
      return new Promise<void>((resolve, reject) => {
        ws.send(data, (err) => {
          if (!err) resolve();
          else reject(err);
        });
      });
    }
    // Sending to all clients
    else {
      return new Promise<void>((resolve, reject) => {
        const promises: Promise<void>[] = [];
        // Send to each client
        for (const client of ws) {
          promises.push(this.sendResponse(client, data));
        }

        // Resolve upon all written off
        Promise.all(promises)
          .then(() => resolve())
          .catch(reject);
      });
    }
  }
}
