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
import mongoose, { ObjectId } from "mongoose";
import chalk from "chalk";
import { connectMongoose } from "../Database/MongoDB.js";
import {
  MediaFileModel,
  MediaFileState,
} from "../../../api/src/Database/Schemas/MediaFile.js";

/**
 * Listens to commands and dispatches events (WorkerPool download progress, finished) to clients
 */
export class CommandProcessor {
  protected wss: WebSocketServer; ///< WebSocketServer
  protected workerPool?: WorkerPool; ///< Pool of workers doing the actual hard work

  // Saving ID as key and in value save processing time when sending to client (no need to map)
  protected downloadStatuses = new Map<
    ObjectId,
    { id: ObjectId; downloaded: number; total: number }
  >();

  protected mongoose!: typeof mongoose; ///< DB connection handle

  constructor() {
    this.wss = new WebSocketServer({
      port: Number(process.env.DOWNLOADER_WS_PORT),
    });

    // Creating DB connection
    connectMongoose().then((mongoose) => {
      this.mongoose = mongoose;
      this.bindWSS();
    });
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
      console.log(
        chalk.bold.greenBright(
          `Command WSS listening on ${chalk.underline(
            Number(process.env.DOWNLOADER_WS_PORT)
          )}!`
        )
      )
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
          ?.destroy(command.destroy ?? "finish-all")
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
            start: (msg) => this.onDownloadStart(command._id, msg), // Start singal
            progress: (msg) => this.onDownloadProgress(command._id, msg), // Progression callback
            end: (msg) => this.onDownloadEnd(command._id, msg), // Finished callaback
          },
        });

        return; // Ok
    }
  }

  /**
   * Updates entry in db that the file is in `DOWNLOADING` state
   * @param id Of media file that started downloading
   * @param message Start message
   */
  protected onDownloadStart(
    id: ObjectId,
    message: Extract<WorkerMessage, { type: "start" }>
  ) {
    this.updateMediaFilesState(id, MediaFileState.DOWNLOADING);
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
      id: id,
      downloaded: message.downloaded,
      total: message.total,
    });

    if (message.downloaded >= message.total) {
      this.updateMediaFilesState(id, MediaFileState.PROCESSING);
    }

    // TODO ~~notify clients~~ Clients are notified periodically?
    // WIll try every 1 sec and every request

    // EveryRequest
    this.sendResponse(this.wss.clients, {
      type: DownloaderCommandResponseType.PROGRESS,
      progresses: [...this.downloadStatuses.values()],
    });
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

    this.updateMediaFilesState(id, MediaFileState.READY);
  }

  /**
   * Updates entry in MediaFileModel and notifies clients about the change
   * @param id Object's unique ID
   * @param newState State to update to
   */
  protected updateMediaFilesState(id: ObjectId, newState: MediaFileState) {
    // Marking in MongoDB
    MediaFileModel.findByIdAndUpdate(id, { state: newState });
    // Notifying clients
    this.sendResponse(this.wss.clients, {
      type: DownloaderCommandResponseType.STATE_CHANGE,
      id: id,
      newState: newState,
    });
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

  /**
   * Destroys WSS and MongoDB connections
   */
  destroy() {
    this.wss.close();
    this.mongoose.disconnect();
  }
}
