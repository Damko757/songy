import { WebSocket } from "ws";
import { ENV } from "../env";
import { DestroyT } from "../../../downloader/src/Workers/WorkerPool";
import {
  DownloaderCommand,
  DownloaderCommandResponse,
  DownloaderCommandType,
} from "../../../downloader/src/Commands/Command";
import chalk from "chalk";
import { EventEmitter } from "stream";

/**
 * @class For working with Downloader module /container/
 */
export class DownloaderClient extends EventEmitter {
  ws?: WebSocket;

  static async init() {
    const instance = new this();
    await instance.bindWS();

    return instance;
  }

  /**
   * Creates connection to downloader
   * @returns
   */
  async bindWS(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (this.ws !== undefined) return resolve(false);

      this.ws = new WebSocket(
        `ws://${ENV.DOCKER ? "downloader" : "localhost"}:${
          ENV.DOWNLOADER_WS_PORT
        }`
      );

      this.ws
        .once("error", reject)
        .on("error", console.error)
        .once("close", () => {
          console.log(
            chalk.redBright("Connection to downloader has been closed")
          );
          this.ws = undefined;
        })
        .once("open", () => {
          console.log(chalk.cyan("Connection to downloader has been opened!"));
          resolve(true);
        })
        .on("message", (message: string) =>
          this.processMessage(JSON.parse(message))
        );
    });
  }

  /**
   * Encodes and sends message to Command Processor
   * @param message Message for `CommandProcessor`
   */
  sendMessage(message: DownloaderCommand) {
    if (!this.ws)
      throw new Error("Unitialized WebSocket. Please call `bindWSS()`");

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Processes message from Command Processor
   * @param message Response
   */
  processMessage(message: DownloaderCommandResponse) {
    // TODO
  }

  /**
   * Destroys active connection to Downloader
   * @param destroyDownloader
   */
  destroy(destroyDownloader: DestroyT = "finish-all") {
    this.sendMessage({
      action: DownloaderCommandType.EXIT,
      destroy: destroyDownloader,
    });
    this.ws?.close();
  }
}
