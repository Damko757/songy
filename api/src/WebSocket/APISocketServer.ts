import { WebSocketServer, WebSocket } from "ws";
import {
  DownloaderCommandResponse,
  DownloaderCommandResponseType,
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
import { MediaFileModel } from "../Database/Schemas/MediaFile";
import { connectMongoose, destroyMongoose } from "../Database/MongoDB";

export class APISocketServer extends DownloaderClient {
  wss?: WebSocketServer;
  isMongoActive = false; // If active connection to DB

  /**
   * Callback for downloader-to-API message
   * @param message Recieved message from server
   */
  protected processMessageFromDownloader(
    message: DownloaderCommandResponse
  ): void {
    switch (message.type) {
      case DownloaderCommandResponseType.ERROR:
        return console.error(message.error);
      case DownloaderCommandResponseType.PROGRESS: // Progress update
        return this.sendToClients(this.wss?.clients, {
          type: ServerMessageType.PROGRESS,
          progresses: message.progresses,
        });
      case DownloaderCommandResponseType.STATE_CHANGE: // This is has new state
        return this.sendToClients(this.wss?.clients, {
          type: ServerMessageType.STATE_CHANGE,
          id: message.id,
          newState: message.newState,
        });
      case DownloaderCommandResponseType.REFETCH: // This is the newest data for this data
        MediaFileModel.findById(message.id).then((dato) => {
          if (dato != null)
            this.sendToClients(this.wss?.clients, {
              type: ServerMessageType.DATA,
              data: dato,
            });
        });
        return;
    }
  }

  /**
   * Callback for client-to-API message
   * @param ws Sender Socket
   * @param message Recieved message
   */
  protected processMessageFromClient(
    ws: WebSocket,
    message: ClientMessage
  ): void {}

  /**
   * Sends `message` to single or multiple specief `clients`
   * @param clientOrClients Single or multiple WebSockets to send message to
   * @param message Message for clients
   */
  protected sendToClients(
    clientOrClients: WebSocket | Iterable<WebSocket> | undefined,
    message: ServerMessage
  ) {
    if (!clientOrClients) return; // No payload

    const jsonMessage =
      typeof message == "string" ? message : JSON.stringify(message); // Not encoding already encoded
    if (clientOrClients instanceof WebSocket) {
      clientOrClients.send(jsonMessage);
      return;
    }

    // Iterable type - sending to group of clients
    for (const ws of clientOrClients) {
      ws.send(jsonMessage);
    }
  }

  constructor() {
    super();
  }

  /**
   * Creates wss intance and connect to Downloader
   * @returns Promise resolved upon server start (true) or false if it is running
   */
  bindWSS() {
    return new Promise<boolean>((resolve, reject) => {
      if (!this.isMongoActive) {
        // Connecting to mongo
        try {
          connectMongoose();
          this.isMongoActive = true;
        } catch (e) {
          reject(e);
          return;
        }
      }

      super.bindWS().then((newStart) => {
        if (this.wss) resolve(false);

        this.wss = new WebSocketServer({ port: Number(ENV.API_WS_PORT) });
        this.wss.on("listening", () => {
          console.log(
            chalk.bold.greenBright(
              `API WSS listening on ${chalk.underline(
                Number(ENV.API_WS_PORT)
              )}!`
            )
          );
          resolve(true);
        });
        this.wss.on("close", () => {
          console.log(chalk.bold.redBright("API WSS closed!"));
          this.wss = undefined;
        });

        this.wss.on("connection", (ws: WebSocket) => {
          ws.on("message", (data: string) => {
            const command = JSON.parse(data) as ClientMessage;
            this.processMessageFromClient(ws, command); // Processing commands from API (client)
          });
        });

        this.wss.once("error", reject);
        this.wss.on("error", console.error);
      });
    });
  }

  /**
   * Destroys connection to Downloader and WSS
   */
  destroy(): void {
    super.destroy("finish-all");
    this.wss?.close();

    // Disconnecting from Mongo
    if (this.isMongoActive) destroyMongoose();
    this.isMongoActive = false;
  }
}
