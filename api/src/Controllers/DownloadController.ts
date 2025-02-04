import { HttpStatusCode } from "axios";
import type { MiddlewareFunction } from "../Utils/Entities/MiddlewareFunction";
import type { RoutingMap } from "../Utils/Router";
import { RoutableController } from "./Controller";

export class DownloadController extends RoutableController {
  routes(): RoutingMap {
    return {
      "/": {
        GET: DownloadController.helloWorld,
      },
    };
  }

  static helloWorld(...[req, res, next]: Parameters<MiddlewareFunction>) {
    res.sendStatus(HttpStatusCode.NotImplemented);
  }
}
