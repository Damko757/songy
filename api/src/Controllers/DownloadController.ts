import { HttpStatusCode } from "axios";
import type { MiddlewareFunction } from "../Utils/Entities/MiddlewareFunction";
import type { RoutingMap } from "../Utils/Router";
import { RoutableController } from "./Controller";
import { Downloader } from "../Downloader/Downloader";

/**
 * Controller donwloading file with provided metadata
 */
export class DownloadController extends RoutableController {
  routes(): RoutingMap {
    return {
      "/download": {
        GET: DownloadController.download,
      },
    };
  }

  static download(...[req, res, next]: Parameters<MiddlewareFunction>) {
    const downloader = new Downloader(
      "https://youtu.be/hw60VbLttS0?si=xuC_Sm_a-1vNRPLz"
    );
    // res.sendStatus(200);

    downloader
      .audioStream({
        metadata: {
          title: "title",
          artists: ["artist"],
          album: "album",
        },
      })
      .on("data", (chunk) => res.write(chunk))
      .on("end", () => {
        console.log("END");
        res.end();
      });
  }
}
