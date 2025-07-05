/// From server to client(s) ///

import { ObjectId } from "mongoose";
import {
  MediaFile,
  MediaFileState,
} from "../api/src/Database/Schemas/MediaFile";

export enum ServerMessageType {
  PING = "PING", // Hello, you alive?
  PROGRESS = "PROGRESS", // Theese ids have new downloaded/total numbers
  STATE_CHANGE = "STATE_CHANGE", // This ID has new state
  REFETCH = "REFETCH", // Please request data from API for this id
}
export type ServerMessage =
  | { type: ServerMessageType.PING; value: any }
  | {
      type: ServerMessageType.PROGRESS;
      progresses: { id: ObjectId; downloaded: number; total: number }[];
    }
  | {
      type: ServerMessageType.STATE_CHANGE;
      id: ObjectId; ///< Id of Mediafile, whose state changed to `newState`
      newState: MediaFileState; ///< New id's state (Saved awaited mongoDB call)
    }
  | { type: ServerMessageType.REFETCH; id: ObjectId };

/// From client to server ///

export enum ClientMessageType {
  PONG = "PONG", // Yeah, I am :)
}
export type ClientMessage = { type: ClientMessageType.PONG; value: any };
