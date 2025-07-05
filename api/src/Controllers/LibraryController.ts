import { HttpStatusCode } from "axios";
import type { MiddlewareFunction } from "../Utils/Entities/MiddlewareFunction";
import type { RoutingMap } from "../Utils/Router";
import { RoutableController } from "./Controller";

/**
 * Controller for accessing MediaFiles
 */
export class LibraryContoroller extends RoutableController {
  // TODO
  routes(): RoutingMap {
    return {
      "/library/:id": {
        GET: () => {}, // Gets DB entry
      },
      "/library/file/:id": {
        GET: () => {}, // Downloads file to device
      },
    };
  }
}
