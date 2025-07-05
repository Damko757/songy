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
import {
  MediaFileModel,
  MediaFileState,
} from "../../../api/src/Database/Schemas/MediaFile.js";
import { PingingWebSocketServer } from "../../../api/src/WebSocket/PingingWebSocketServer.js";

interface CommandProcessorWebSocket extends WebSocket {
  isAlive: boolean;
}

/**
 * Listens to commands and dispatches events (WorkerPool download progress, finished) to clients
 */
export class CommandProcessor extends PingingWebSocketServer<
  DownloaderCommandResponse,
  DownloaderCommand,
  CommandProcessorWebSocket
> {
  protected workerPool?: WorkerPool; ///< Pool of workers doing the actual hard work

  // Saving ID as key and in value save processing time when sending to client (no need to map)
  protected downloadStatuses = new Map<
    ObjectId,
    { id: ObjectId; downloaded: number; total: number }
  >();

  constructor() {
    super(PingingWebSocketServer.PING_TYPE_FOR_NON_BROWSER, {
      port: Number(process.env.DOWNLOADER_WS_PORT),
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

  protected onListening(): void {
    console.log(
      chalk.bold.greenBright(
        `Command WSS listening on ${chalk.underline(
          Number(process.env.DOWNLOADER_WS_PORT)
        )}!`
      )
    );
  }
  protected onClose(): void {
    console.log(chalk.bold.redBright("Command WSS closed!"));
  }

  protected initializeWS(ws: WebSocket): CommandProcessorWebSocket {
    super.initializeWS(ws); // Needs to initialize for pinging

    // Notyfing about current number of workers
    this.sendMessageToClients(ws as CommandProcessorWebSocket, {
      type: DownloaderCommandResponseType.START,
      numberOfWorkers: this.workerPool?.size ?? 0,
    });

    return ws as CommandProcessorWebSocket;
  }

  processMessageFromClient(
    ws: CommandProcessorWebSocket,
    message: DownloaderCommand
  ): boolean | Promise<boolean | boolean[]> {
    switch (message.action) {
      case DownloaderCommandType.START:
        if (this.workerPool !== undefined) {
          // WP already started
          return this.sendMessageToClients(ws, {
            type: DownloaderCommandResponseType.ERROR,
            error: "WorkerPool already created!",
          });
        }
        this.workerPool = new WorkerPool(message.numberOfWorkers);
        return this.sendMessageToClients(this.wssClients(), {
          type: DownloaderCommandResponseType.START,
          numberOfWorkers: this.workerPool.size,
        });
      case DownloaderCommandType.EXIT:
        // Exiting and notifying API
        return new Promise<boolean>((resolve) => {
          this.workerPool
            ?.destroy(message.destroy ?? "finish-all")
            .then(async () => {
              this.workerPool = undefined;
              resolve(
                await this.sendMessageToClients(ws, {
                  type: DownloaderCommandResponseType.EXIT,
                })
              );
            })
            .catch(async (e) =>
              resolve(
                await this.sendMessageToClients(ws, {
                  type: DownloaderCommandResponseType.ERROR,
                  error: e,
                })
              )
            );
        });

      case DownloaderCommandType.DOWNLOAD:
        if (!this.workerPool) {
          return this.sendMessageToClients(ws, {
            type: DownloaderCommandResponseType.ERROR,
            error: "WorkerPool not started!",
          });
        }

        return this.workerPool.addJob({
          job: { ...message, action: "download" },
          handlers: {
            start: (msg) => this.onDownloadStart(message._id, msg), // Start singal
            progress: (msg) => this.onDownloadProgress(message._id, msg), // Progression callback
            end: (msg) => this.onDownloadEnd(message._id, msg), // Finished callaback
          },
        });
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
    this.sendMessageToClients(this.wssClients(), {
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
    this.sendMessageToClients(this.wssClients(), {
      type: DownloaderCommandResponseType.STATE_CHANGE,
      id: id,
      newState: newState,
    });
  }

  /**
   * Destroys WSS and WorkerPool
   * @returns Promise resolved upon finished worker pool destroy
   */
  destroy() {
    return new Promise<void>((resolve, reject) => {
      super.destroy();

      if (this.workerPool && this.workerPool.getDestroyState() == "none") {
        this.workerPool.destroy("finish-all").then(resolve).catch(reject);
        return;
      }

      resolve();
    });
  }
}
