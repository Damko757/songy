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
import { MediaFileModel } from "../Database/Schemas/MediaFile";

export class APISocketServer extends DownloaderClient {
  wss?: WebSocketServer;
  numberOfWorkers: number;

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
      case DownloaderCommandResponseType.START:
        if (message.numberOfWorkers == 0)
          // Starting downloader if not started
          this.sendMessageToDownloader({
            action: DownloaderCommandType.START,
            numberOfWorkers: this.numberOfWorkers,
          });
        break;
      case DownloaderCommandResponseType.EXIT: // Restarting workers
        console.log(chalk.bgYellow("Restarting workers!"));
        return this.sendMessageToDownloader({
          action: DownloaderCommandType.START,
          numberOfWorkers: this.numberOfWorkers,
        });

      case DownloaderCommandResponseType.PROGRESS: // Progress update
        return this.sendToClients(this.wss?.clients, {
          type: ServerMessageType.PROGRESS,
          progresses: message.progresses,
        }) as void;
      case DownloaderCommandResponseType.STATE_CHANGE: // This is has new state
        return this.sendToClients(this.wss?.clients, {
          type: ServerMessageType.STATE_CHANGE,
          id: message.id,
          newState: message.newState,
        }) as void;
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
   * @returns Promise resolved if `message` has been sent to client(s)
   */
  protected sendToClients(
    clientOrClients: WebSocket | Iterable<WebSocket> | undefined,
    message: ServerMessage
  ) {
    if (!clientOrClients) return; // No one to send

    const jsonMessage =
      typeof message == "string" ? message : JSON.stringify(message); // Not encoding already encoded
    if (clientOrClients instanceof WebSocket) {
      return new Promise<boolean>((resolve, reject) => {
        if (clientOrClients.readyState != WebSocket.OPEN) return resolve(false); // Client not opened

        clientOrClients.send(jsonMessage, (err) => {
          if (!err) resolve(true);
          else reject(err);
        });
      });
    }

    // Iterable type - sending to group of clients
    const promises: Promise<boolean>[] = [];
    for (const ws of clientOrClients) {
      promises.push(
        new Promise((resolve, reject) => {
          if (ws.readyState != WebSocket.OPEN) return resolve(false);

          ws.send(jsonMessage, (err) => {
            if (!err) resolve(true);
            else reject(err);
          });
        })
      );
    }

    return Promise.all(promises);
  }

  constructor(numberOfWorkers: number) {
    super();
    this.numberOfWorkers = numberOfWorkers;
  }

  /**
   * Creates wss intance and connect to Downloader
   * @returns Promise resolved upon server start (true) or false if it is running
   */
  bindWSS() {
    return new Promise<boolean>((resolve, reject) => {
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
  }
}
