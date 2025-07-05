import { WebSocketServer, WebSocket } from "ws";
import {
  DownloaderCommandResponse,
  DownloaderCommandResponseType,
  DownloaderCommandType,
} from "../../../downloader/src/Commands/Command";
import { ENV } from "../env";
import { DownloaderClient } from "./DownloaderClient";
import chalk from "chalk";
import {
  ClientMessage,
  ServerMessage,
  ServerMessageType,
} from "../../../shared/WebSocketCommunicationProtocol";
import { DestroyT } from "../../../downloader/src/Workers/WorkerPool";
import { MediaFile, MediaFileModel } from "../Database/Schemas/MediaFile";
import { PingingWebSocketServer } from "./PingingWebSocketServer";

interface APISocketClient extends WebSocket {
  isAlive: boolean;
}

export class APISocketServer extends PingingWebSocketServer<
  ServerMessage,
  ClientMessage,
  APISocketClient
> {
  numberOfWorkers: number;
  downloaderClient: DownloaderClient;

  /**
   * Callback for downloader-to-API message
   * @param message Recieved message from server
   */
  protected processMessageFromDownloader(
    message: DownloaderCommandResponse
  ): boolean | Promise<boolean | boolean[]> {
    switch (message.type) {
      case DownloaderCommandResponseType.ERROR:
        console.error(message.error);
        return true;
      case DownloaderCommandResponseType.START:
        if (message.numberOfWorkers == 0)
          // Starting downloader if not started
          return this.downloaderClient.sendMessageToServer({
            action: DownloaderCommandType.START,
            numberOfWorkers: this.numberOfWorkers,
          });
        return true;
      case DownloaderCommandResponseType.EXIT: // Restarting workers
        console.log(chalk.bgYellow("Restarting workers!"));
        return this.downloaderClient.sendMessageToServer({
          action: DownloaderCommandType.START,
          numberOfWorkers: this.numberOfWorkers,
        });

      case DownloaderCommandResponseType.PROGRESS: // Progress update
        return this.sendMessageToClients(this.wssClients(), {
          type: ServerMessageType.PROGRESS,
          progresses: message.progresses,
        });
      case DownloaderCommandResponseType.STATE_CHANGE: // This is has new state
        return this.sendMessageToClients(this.wssClients(), {
          type: ServerMessageType.STATE_CHANGE,
          id: message.id,
          newState: message.newState,
        });
      case DownloaderCommandResponseType.REFETCH: // Please request data fot this id
        return this.sendMessageToClients(this.wssClients(), {
          type: ServerMessageType.REFETCH,
          id: message.id,
        });
    }
  }

  processMessageFromClient(
    ws: APISocketClient,
    message: ClientMessage
  ): boolean | Promise<boolean> {
    return true;
  }

  constructor(numberOfWorkers: number) {
    super(PingingWebSocketServer.PING_TYPE_FOR_BROWSER, {
      port: Number(ENV.API_WS_PORT),
    });
    this.numberOfWorkers = numberOfWorkers;
    this.downloaderClient = new DownloaderClient((message) =>
      this.processMessageFromDownloader(message)
    );
  }

  /**
   * Creates wss intance and connect to Downloader
   * @returns Promise resolved upon server start (true) or false if it is running
   */
  bindWSS() {
    return new Promise<boolean>((resolve, reject) => {
      this.downloaderClient
        .bindWS()
        .then((newStart) => {
          super
            .bindWSS()
            .then((wasAlreadyRunning) => resolve(wasAlreadyRunning))
            .catch(reject);
        })
        .catch(reject);
    });
  }

  protected onClose(): void {
    console.log(chalk.bold.redBright("API WSS closed!"));
  }

  /**
   * Destroys connection to Downloader and WSS
   */
  destroy(): void {
    this.downloaderClient.destroy("finish-all");
    super.destroy();
  }
}
