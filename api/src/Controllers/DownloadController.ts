import { HttpStatusCode } from "axios";
import type { MiddlewareFunction } from "../Utils/Entities/MiddlewareFunction";
import type { RoutingMap } from "../Utils/Router";
import { RoutableController } from "./Controller";

/**
 * Controller donwloading file with provided metadata
 */
export class DownloadController extends RoutableController {
  routes(): RoutingMap {
    return {
      "/download/:link": {
        POST: () => {},
      },
    };
  }
}
