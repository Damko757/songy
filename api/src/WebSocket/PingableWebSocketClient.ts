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
import { PingMessage } from "./PingingWebSocketServer";

/**
 * WebSocket client that needs to be pinged, or it disconnects
 * @warning Uncombatible with browsers. Need to use native Websocket object
 * @
 */
export abstract class PingableWebSocketClient<ServerMessageT, ClientMessageT> {
  protected ws?: WebSocket;
  protected isAlive: boolean = false;

  protected serverPingInterval: number; ///< Interval at which server should ping client
  protected pingTimeout?: NodeJS.Timeout; ///< Timeout for ping waiting
  wssUrl: string; ///< URL of server

  /**
   * Sends message to server
   * @param message Message to send
   * @returns Promise resolve if message has been sent
   */
  sendMessageToServer(message: ClientMessageT | PingMessage) {
    return new Promise<boolean>((resolve, reject) => {
      if (!this.ws) resolve(false);

      const payload = JSON.stringify(message);
      this.ws?.send(payload, (err) => {
        if (!err) resolve(true);
        else reject(err);
      });
    });
  }

  /**
   * Entrypoint for server's message
   * @param message Message to process
   */
  abstract processMessageFromServer(
    message: ServerMessageT
  ): Promise<boolean | boolean[]> | boolean;

  /**
   * Creates connection to `wssUrl`
   * @returns
   */
  async bindWS(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (this.ws !== undefined) return resolve(false);

      this.ws = new WebSocket(this.wssUrl);

      this.ws
        .on("error", reject)
        .on("error", (e) => this.onError(e))
        .once("close", () => {
          this.onClose();
          this.ws = undefined;
        })
        .once("open", () => {
          this.ws?.off("error", reject); // Unregistering
          resolve(true);
          this.isAlive = true;
          this.healthcheck();
          this.onOpen();
        })
        .on("ping", () => (this.isAlive = true)) // Healthcheck ping probably
        .on("pong", (data) => this.onPong("signal", data))
        .on("message", (message: string) =>
          this.preprocessMessageFromServer(message)
        );
    });
  }

  /**
   * Preprocesses raw message and answers ping/pong
   * Calls processMessageFromServer
   * @param message
   * @returns Parsing status
   */
  protected async preprocessMessageFromServer(
    data: any
  ): Promise<boolean | boolean[]> {
    try {
      const payload = JSON.parse(data) as ServerMessageT | PingMessage;
      if ((payload as PingMessage).ping == "ping") {
        this.isAlive = true;
        return this.sendMessageToServer({
          // Answering
          ping: "pong",
          value: (payload as PingMessage).value,
        });
      } else if ((payload as PingMessage).ping == "pong") {
        this.onPong("message", (payload as PingMessage).value); // Calling user callback
        return true;
      }

      return this.processMessageFromServer(payload as ServerMessageT); // Processing by child
    } catch (e) {
      this.onError(e as Error);
      return false;
    }
  }

  /**
   * Checking if server knows about us an pings us
   */
  protected healthcheck() {
    if (!this.isAlive) return this.destroy(); // We dead
    this.isAlive = false; // Resetting

    if (this.serverPingInterval < 0) return; // No timeout
    this.pingTimeout = setTimeout(
      () => this.healthcheck(),
      this.serverPingInterval * 1.5
    );
  }

  /**
   * Constructor
   * @param wssUrl URL to Socket Server
   * @param serverPingInterval At which interval server sends ping message. Max timeout is *1.5
   */
  constructor(wssUrl: string, serverPingInterval: number) {
    this.wssUrl = wssUrl;
    this.serverPingInterval = serverPingInterval;
  }

  /**
   * Method called on WS close
   */
  protected onClose() {}

  /**
   * Method called on WS open
   */
  protected onOpen() {}

  /**
   * Method called on WS error
   */
  protected onError(e: Error) {
    console.error(e);
  }

  /**
   * Callback for pong message
   * @param type If lol-level signal or high-level object message
   * @param data Payload of pong response
   */
  protected onPong(type: "signal" | "message", data?: any) {}

  /**
   * Destroys active connection to WSS
   */
  destroy() {
    // Closing WS
    this.ws?.close();
  }
}
