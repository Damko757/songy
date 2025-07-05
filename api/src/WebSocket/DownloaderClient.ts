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
import { PingableWebSocketClient } from "./PingableWebSocketClient";
import { PingingWebSocketServer } from "./PingingWebSocketServer";

/**
 * @class For working with Downloader module /container/
 */
export class DownloaderClient extends PingableWebSocketClient<
  DownloaderCommandResponse,
  DownloaderCommand
> {
  processMessageFromServer(
    message: DownloaderCommandResponse
  ): Promise<boolean | boolean[]> | boolean {
    throw new Error("Method not implemented.");
  }

  protected onClose(): void {
    super.onClose();
    console.log(chalk.redBright("Connection to downloader has been closed"));
  }
  protected onOpen(): void {
    console.log(chalk.cyan("Connection to downloader has been opened!"));
  }

  /**
   *
   * @param processMessageFromServer Handle for message from downloader
   */
  constructor(
    processMessageFromServer: (
      message: DownloaderCommandResponse
    ) => Promise<boolean | boolean[]> | boolean
  ) {
    super(
      `ws://${ENV.DOCKER == "1" ? "downloader" : "localhost"}:${
        ENV.DOWNLOADER_WS_PORT
      }`,
      PingingWebSocketServer.HEATLHCHECK_INTERVAL
    );

    this.processMessageFromServer = processMessageFromServer;
  }

  /**
   * Destroys active connection to Downloader
   * @param destroyDownloader
   */
  destroy(destroyDownloader: DestroyT = "finish-all") {
    return new Promise<void>((resolve, reject) => {
      // Turning off Downloader Command Processor
      this.sendMessageToServer({
        action: DownloaderCommandType.EXIT,
        destroy: destroyDownloader,
      })
        .then((success) => {
          if (!success) return reject("Could not send message to Downloader");
          super.destroy();
          resolve();
        })
        .catch(reject);
    });
  }
}
