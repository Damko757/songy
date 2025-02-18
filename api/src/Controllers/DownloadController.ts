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
      "/download/:format": {
        GET: DownloadController.download,
      },
    };
  }

  static download(...[req, res, next]: Parameters<MiddlewareFunction>) {
    const link = (req.query.link as string) ?? "";
    if (!link)
      return res.status(HttpStatusCode.BadRequest).send({
        reason: "(YouTube) link parameter is missing",
      }) as unknown as void;

    const downloader = new Downloader(link);
    if (!downloader.isValid())
      return res.status(HttpStatusCode.BadRequest).send({
        reason: "(YouTube) link parameter is invalid",
      }) as unknown as void;

    const fileExtension = req.params.format.toLowerCase().replaceAll(".", "");
    let typeOfExtension: keyof typeof Downloader.supportedExtensions | null =
      null;
    Object.keys(Downloader.supportedExtensions).some((key) => {
      const values =
        Downloader.supportedExtensions[
          key as NonNullable<typeof typeOfExtension>
        ];
      if (!values.includes(fileExtension)) return false;

      typeOfExtension = key as NonNullable<typeof typeOfExtension>;
      return true;
    });

    if (!typeOfExtension)
      return res.status(HttpStatusCode.BadRequest).send({
        reason: "Unsupported format. Supported formats are specified as keys",
        ...Downloader.supportedExtensions,
      }) as unknown as void;

    if (typeOfExtension == "audio")
      DownloadController.downloadAudio(downloader, req, res, next);
    else if (typeOfExtension == "video")
      DownloadController.downloadVideo(downloader, req, res, next);
    else
      res.status(HttpStatusCode.InternalServerError).send({
        reason: "Unsopported file type!",
      });
  }

  static downloadVideo(
    downloader: Downloader,
    ...[req, res, next]: Parameters<MiddlewareFunction>
  ) {
    const videoStream = downloader.videoStream({
      bitrate: 320,
      audioQuality: "highestaudio",
      videoQuality: "highestvideo",
    });
    videoStream.on("data", (chunk) => res.write(chunk));
    videoStream.on("end", () => res.end());
    videoStream.on("error", (error) =>
      res.status(HttpStatusCode.InternalServerError).send({ error: error })
    );
  }
  static downloadAudio(
    downloader: Downloader,
    ...[req, res, next]: Parameters<MiddlewareFunction>
  ) {
    const audioStream = downloader.audioStream({
      bitrate: 320,
    });
    audioStream.on("data", (chunk) => res.write(chunk));
    audioStream.on("end", () => res.end());
    audioStream.on("error", (error) =>
      res.status(HttpStatusCode.InternalServerError).send({ error: error })
    );
  }
}
