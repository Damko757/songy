import { WebSocketServer, WebSocket } from "ws";
import {
  DownloaderCommandResponse,
  DownloaderCommandResponseType,
  DownloaderCommandType,
} from "../../../downloader/src/Commands/Command";
import { ENV } from "../env";
import { DownloaderClient } from "./DownloaderClient";
import chalk from "chalk";

export type PingMessage = { ping: "ping" | "pong"; value?: any };

export abstract class PingingWebSocketServer<
  ServerMessageT,
  ClientMessageT,
  WebSocketT extends WebSocket & { isAlive: boolean }
> {
  protected wss?: WebSocketServer;
  protected usePingAsMessage: boolean; ///< Speciefies if should use classic ping or ping as message

  protected healthcheckTimeout?: NodeJS.Timeout; ///< Reference to timeout scheduling healthchecking
  protected static HEATLHCHECK_INTERVAL: number = 30_000; // every 30 s checks health

  /**
   * Periodically sends ping
   */
  protected healthcheck() {
    this.clients()?.forEach((client) => {
      if (!client.isAlive) return client.terminate(); // Terminate dead client

      client.isAlive = false; // Setting as should be dead
      this.usePingAsMessage
        ? this.sendMessageToClients(client, { ping: "ping" }) // Pinging client via message
        : client.ping(); // Pinging client via low-overhead ping
    });

    // Calling again
    this.healthcheckTimeout = setTimeout(
      () => this.healthcheck(),
      PingingWebSocketServer.HEATLHCHECK_INTERVAL
    );
  }

  /**
   * @returns WSS clients or undefined if wss not started
   */
  clients(): Set<WebSocketT> | undefined {
    return this.wss?.clients as Set<WebSocketT>;
  }

  /**
   * Preprocesses `ws` message event. Handles pinging and parsing.
   * Calls `this.processMessageFromClient`
   * @param ws Client who sent `data`
   * @param data Raw payload from message
   * @returns Parsing status
   */
  protected preprocessMessageFromClient(ws: WebSocketT, data: string) {
    try {
      const command = JSON.parse(data) as ClientMessageT | PingMessage;
      if ((command as PingMessage).ping == "ping") {
        return this.sendMessageToClients(ws, {
          // Answering
          ping: "pong",
          value: (command as PingMessage).value,
        });
      } else if ((command as PingMessage).ping == "pong") {
        ws.isAlive = true;
        this.onPong(ws, "message", (command as PingMessage).value); // Calling user callback
        return;
      }

      return this.processMessageFromClient(ws, command as ClientMessageT); // Processing by child
    } catch (e) {
      // Unsuccessful parsing
      console.error(e);
      return false;
    }
  }

  /**
   * Callback for client-to-server message
   * @param ws Sender Socket
   * @param message Recieved message
   */
  abstract processMessageFromClient(
    ws: WebSocketT,
    message: ClientMessageT
  ): boolean;

  /**
   * Sends `message` to single or multiple specified `clients`
   * @param clientOrClients Single or multiple WebSockets to send message to
   * @param message Message for clients
   * @returns Promise resolved with true if `message` has been sent to client(s)
   */
  sendMessageToClients(
    clientOrClients: WebSocketT | Iterable<WebSocketT> | undefined,
    message: ServerMessageT | PingMessage
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

  /**
   *
   * @param usePingAsMessage Web client should set to true, Browsers *do not* support `onping` event
   */
  constructor(usePingAsMessage: boolean) {
    this.usePingAsMessage = usePingAsMessage;
  }

  /**
   * Creates WSS instance and starts running it
   * @returns Promise resolved upon server start (true) or false if it is already running
   */
  bindWSS() {
    return new Promise<boolean>((resolve, reject) => {
      if (this.wss) resolve(false); // already running

      this.wss = new WebSocketServer({ port: Number(ENV.API_WS_PORT) });
      this.wss.on("error", (e) => this.onError(e));
      this.wss.on("error", reject);
      this.wss.on("listening", () => {
        this.wss?.off("error", reject); // The reject is not needed, connection is successful
        resolve(true);
      });
      this.wss.on("close", () => {
        this.onClose();
        this.wss = undefined;
      });

      this.wss.on("connection", (ws: WebSocket) => {
        this.initializeWS(ws);

        ws.on("message", (data: string) => {
          this.preprocessMessageFromClient(ws as WebSocketT, data); // Processing commands from API (client)
        });

        ws.on("pong", (data) => {
          // Client reacted, is alive
          (ws as WebSocketT).isAlive = true;
          this.onPong(ws as WebSocketT, "signal", data);
        });
      });
    });
  }

  /**
   * Initializes WS with additional data and/or state (in-place)
   * @param ws Newly connected client to initialize
   * @returns Modified ws
   */
  protected initializeWS(ws: WebSocket): WebSocketT {
    (ws as WebSocketT).isAlive = true;
    return ws as WebSocketT;
  }

  /**
   * On WSS error
   * @param e Error
   */
  protected onError(e: Error) {
    console.error(e);
  }
  /**
   * On WSS close
   */
  protected onClose() {}

  /**
   * Callback to Pong message or signal
   * @param ws Answering client
   * @param type Signal if .ping() or Message if sent JSON if ping payload
   * @param value Value with which it answered
   */
  protected onPong(ws: WebSocketT, type: "signal" | "message", value?: any) {}

  /**
   * Closes WSS
   */
  destroy(): void {
    this.wss?.close();
  }
}
