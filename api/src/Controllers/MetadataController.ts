import { HttpStatusCode } from "axios";
import type { MiddlewareFunction } from "../Utils/Entities/MiddlewareFunction";
import type { RoutingMap } from "../Utils/Router";
import { RoutableController } from "./Controller";
import { Metadator } from "../Metadata/Metadator";

/**
 * Controller for managing and finding metadata
 */
export class MetadataController extends RoutableController {
  routes(): RoutingMap {
    return {
      "/metadata": {
        GET: MetadataController.fetchMetadata,
      },
    };
  }
  static fetchMetadata(...[req, res, next]: Parameters<MiddlewareFunction>) {
    const link = (req.query.link as string) ?? "";
    if (!link)
      return res.status(HttpStatusCode.BadRequest).send({
        reason: "(YouTube) link parameter is missing",
      }) as unknown as void;

    const metadator = new Metadator(link);
    if (!metadator.isValid())
      return res.status(HttpStatusCode.BadRequest).send({
        reason: "(YouTube) link parameter is invalid",
      }) as unknown as void;

    metadator
      .metaDatas()
      .then((metadataResponse) => {
        res.send(metadataResponse);
      })
      .catch((e) => {
        res.status(HttpStatusCode.InternalServerError).send({ error: e });
      });
  }
}
