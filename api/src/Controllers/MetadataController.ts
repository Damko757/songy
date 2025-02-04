import type { MiddlewareFunction } from "../Utils/Entities/MiddlewareFunction";
import type { RoutingMap } from "../Utils/Router";
import { RoutableController } from "./Controller";

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
  static fetchMetadata(...[req, res, next]: Parameters<MiddlewareFunction>) {}
}
