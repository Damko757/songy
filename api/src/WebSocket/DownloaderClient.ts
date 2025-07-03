import { WebSocket } from "ws";
import { ENV } from "../env";
import { DestroyT } from "../../../downloader/src/Workers/WorkerPool";
import {
  DownloaderCommand,
  DownloaderCommandResponse,
  DownloaderCommandResponseType,
  DownloaderCommandType,
} from "../../../downloader/src/Commands/Command";
import chalk from "chalk";
import { destroyMongoose } from "../Database/MongoDB";

/**
 * @class For working with Downloader module /container/
 */
export abstract class DownloaderClient {
  ws?: WebSocket;

  protected abstract processMessageFromDownloader(
    message: DownloaderCommandResponse
  ): void;

  /**
   * Creates connection to downloader
   * @returns
   */
  protected async bindWS(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (this.ws !== undefined) return resolve(false);

      this.ws = new WebSocket(
        `ws://${ENV.DOCKER == "1" ? "downloader" : "localhost"}:${
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
        .on(
          "message",
          (message: string) =>
            this.processMessageFromDownloader(JSON.parse(message)) // Processing left to client
        );
    });
  }

  /**
   * Encodes and sends message to Command Processor
   * @param message Message for `CommandProcessor`
   */
  sendMessageToDownloader(message: DownloaderCommand) {
    if (!this.ws)
      throw new Error("Unitialized WebSocket. Please call `bindWS()`");

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Destroys active connection to Downloader
   * @param destroyDownloader
   */
  destroy(destroyDownloader: DestroyT = "finish-all") {
    // Turning off Downloader Command Processor
    this.sendMessageToDownloader({
      action: DownloaderCommandType.EXIT,
      destroy: destroyDownloader,
    });

    // Closing Ws
    this.ws?.close();
  }
}
